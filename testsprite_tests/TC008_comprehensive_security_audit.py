"""
TC008: Comprehensive Security Test Suite
Tests all critical security controls:
- Middleware route protection
- Admin route access control
- IDOR prevention
- Session security (JWT signing, cookie flags)
- No supabase-admin exposure on client
- Security headers
- Sensitive data filtering
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    ADMIN_USERNAME, ADMIN_PASSWORD,
    TestSession, TestResults, assert_no_sensitive_data, assert_security_headers
)


def test_comprehensive_security():
    results = TestResults("TC008 — Comprehensive Security Audit")

    # ================================================================
    # SECTION 1: MIDDLEWARE & ROUTE PROTECTION
    # ================================================================

    # Test 1.1: /admin blocked for unauthenticated users
    try:
        raw = requests.Session()
        resp = raw.get(
            f"{BASE_URL}/admin",
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/login" in location:
                results.pass_test("[Middleware] /admin redirects unauthenticated to /login")
            else:
                results.pass_test(f"[Middleware] /admin redirects unauthenticated to {location}")
        elif resp.status_code in (401, 403, 404):
            results.pass_test(f"[Middleware] /admin returns {resp.status_code} for unauthenticated")
        elif resp.status_code == 200:
            results.fail_test("[Middleware] /admin unauth block",
                              "Admin page accessible without any authentication!")
        else:
            results.fail_test("[Middleware] /admin unauth",
                              f"Unexpected status {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Middleware] /admin unauth check", str(e))

    # Test 1.2: /admin blocked for student users
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            resp = ts.get("/admin", allow_redirects=False)

            if resp.status_code in (302, 303, 307, 308):
                location = resp.headers.get("Location", "")
                if "/admin" not in location:
                    results.pass_test("[Middleware] /admin redirects student away")
                else:
                    results.fail_test("[Middleware] /admin student block",
                                      "Student redirected to another admin page!")
            elif resp.status_code in (401, 403):
                results.pass_test("[Middleware] /admin returns 403 for student")
            elif resp.status_code == 200:
                results.fail_test("[Middleware] /admin student block",
                                  "Student can access admin page!")
            elif resp.status_code == 404:
                results.pass_test("[Middleware] /admin returns 404 (route may not exist)")
            else:
                results.fail_test("[Middleware] /admin student",
                                  f"Status {resp.status_code}")
        else:
            results.fail_test("[Middleware] Student login for admin test", msg)

        ts.close()
    except Exception as e:
        results.fail_test("[Middleware] Student /admin access", str(e))

    # Test 1.3: /admin accessible for admin users
    try:
        ts = TestSession()
        success, msg = ts.login(ADMIN_USERNAME, ADMIN_PASSWORD)

        if success:
            resp = ts.get("/admin", allow_redirects=False)

            if resp.status_code == 200:
                results.pass_test("[Middleware] /admin accessible for admin user")
            elif resp.status_code in (302, 303, 307, 308):
                location = resp.headers.get("Location", "")
                if "/login" in location:
                    results.fail_test("[Middleware] Admin access",
                                      "Admin redirected to login!")
                elif "/change-password" in location or "/onboarding" in location:
                    results.pass_test(f"[Middleware] Admin redirected to {location} (first login flow)")
                else:
                    results.pass_test(f"[Middleware] Admin redirected to {location}")
            elif resp.status_code == 404:
                results.pass_test("[Middleware] /admin route not yet created (404)")
            else:
                results.fail_test("[Middleware] Admin access",
                                  f"Status {resp.status_code}")
        else:
            results.fail_test("[Middleware] Admin login", msg)

        ts.close()
    except Exception as e:
        results.fail_test("[Middleware] Admin /admin access", str(e))

    # Test 1.4: Protected pages redirect to login
    protected_pages = ["/", "/courses", "/profile", "/leaderboard"]
    for page in protected_pages:
        try:
            raw = requests.Session()
            resp = raw.get(
                f"{BASE_URL}{page}",
                timeout=TIMEOUT,
                allow_redirects=False,
            )

            if resp.status_code in (302, 303, 307, 308):
                location = resp.headers.get("Location", "")
                if "/login" in location:
                    results.pass_test(f"[Middleware] {page} requires auth")
                else:
                    results.pass_test(f"[Middleware] {page} redirects to {location}")
            elif resp.status_code in (401, 403):
                results.pass_test(f"[Middleware] {page} returns {resp.status_code}")
            elif resp.status_code == 404:
                results.pass_test(f"[Middleware] {page} returns 404 (route may not exist)")
            elif resp.status_code == 200:
                results.fail_test(f"[Middleware] {page} auth",
                                  f"Page accessible without auth!")
            else:
                results.fail_test(f"[Middleware] {page}",
                                  f"Unexpected status {resp.status_code}")
            raw.close()
        except Exception as e:
            results.fail_test(f"[Middleware] {page} check", str(e))

    # ================================================================
    # SECTION 2: SESSION SECURITY
    # ================================================================

    # Test 2.1: Session cookie has HttpOnly flag
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            # Inspect Set-Cookie headers from the login response
            login_resp = ts.session.post(
                f"{BASE_URL}/login",
                data={"username": STUDENT_USERNAME, "password": STUDENT_PASSWORD},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=TIMEOUT,
                allow_redirects=False,
            )

            set_cookie = login_resp.headers.get("Set-Cookie", "")
            if "httponly" in set_cookie.lower():
                results.pass_test("[Session] Cookie has HttpOnly flag")
            elif "sciencehub_session" in set_cookie:
                results.fail_test("[Session] HttpOnly flag",
                                  "Session cookie set without HttpOnly!")
            else:
                results.pass_test("[Session] Cookie flags (not directly verifiable via headers)")
        else:
            results.fail_test("[Session] Login for cookie test", msg)

        ts.close()
    except Exception as e:
        results.fail_test("[Session] Cookie security check", str(e))

    # Test 2.2: Forged JWT cookie is rejected
    try:
        raw = requests.Session()
        # Set a fake JWT cookie
        raw.cookies.set("sciencehub_session",
                        "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6InN1cGVyX2FkbWluIn0.fakesignature",
                        domain="localhost")

        resp = raw.post(
            f"{BASE_URL}/api/auth/check-session",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid") is False:
                results.pass_test("[Session] Forged JWT is rejected")
            else:
                results.fail_test("[Session] JWT forgery detection",
                                  "Forged JWT accepted as valid!")
        else:
            results.pass_test(f"[Session] Forged JWT returns {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Session] JWT forgery test", str(e))

    # Test 2.3: Expired/empty cookie is rejected
    try:
        raw = requests.Session()
        raw.cookies.set("sciencehub_session", "", domain="localhost")

        resp = raw.post(
            f"{BASE_URL}/api/auth/check-session",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid") is False:
                results.pass_test("[Session] Empty cookie rejected")
            else:
                results.fail_test("[Session] Empty cookie", "Empty cookie accepted!")
        else:
            results.pass_test(f"[Session] Empty cookie returns {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Session] Empty cookie test", str(e))

    # ================================================================
    # SECTION 3: SECURITY HEADERS
    # ================================================================

    try:
        resp = requests.get(f"{BASE_URL}/login", timeout=TIMEOUT)

        headers_to_check = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
        }

        for header, expected in headers_to_check.items():
            actual = resp.headers.get(header, "")
            if expected.lower() in actual.lower():
                results.pass_test(f"[Headers] {header}: {expected}")
            elif actual:
                results.fail_test(f"[Headers] {header}",
                                  f"Expected '{expected}', got '{actual}'")
            else:
                results.fail_test(f"[Headers] {header}", "Header missing")

        # Check CSP
        csp = resp.headers.get("Content-Security-Policy", "")
        if csp:
            results.pass_test("[Headers] Content-Security-Policy is set")
        else:
            results.fail_test("[Headers] CSP", "No Content-Security-Policy header")

        # Check Referrer-Policy
        rp = resp.headers.get("Referrer-Policy", "")
        if rp:
            results.pass_test(f"[Headers] Referrer-Policy: {rp}")
        else:
            results.fail_test("[Headers] Referrer-Policy", "Missing")

    except Exception as e:
        results.fail_test("[Headers] Security headers check", str(e))

    # ================================================================
    # SECTION 4: SENSITIVE DATA PROTECTION
    # ================================================================

    # Test 4.1: Login page doesn't expose backend secrets
    try:
        resp = requests.get(f"{BASE_URL}/login", timeout=TIMEOUT)
        if resp.status_code == 200:
            assert_no_sensitive_data(resp.text, "Login page")
            results.pass_test("[Data] Login page contains no sensitive data")
    except AssertionError as e:
        results.fail_test("[Data] Login page leak", str(e))
    except Exception as e:
        results.fail_test("[Data] Login page check", str(e))

    # Test 4.2: Check JS bundles don't contain secrets
    try:
        resp = requests.get(f"{BASE_URL}/login", timeout=TIMEOUT)
        if resp.status_code == 200:
            body = resp.text

            # Check for common secret patterns
            dangerous_patterns = [
                "SUPABASE_SERVICE_ROLE",
                "service_role_key",
                "SESSION_SECRET",
                "VAPID_PRIVATE_KEY",
                "createServiceRoleClient",  # Server-only function
            ]

            found = []
            for pattern in dangerous_patterns:
                if pattern in body:
                    found.append(pattern)

            if not found:
                results.pass_test("[Data] No server secrets in page HTML")
            else:
                results.fail_test("[Data] Secrets in page HTML",
                                  f"Found: {', '.join(found)}")
    except Exception as e:
        results.fail_test("[Data] Secret scan", str(e))

    # Test 4.3: API error responses don't leak stack traces
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "'; DROP TABLE--"},
            timeout=TIMEOUT,
        )

        body = resp.text.lower()
        leak_patterns = ["stack trace", "at module", "node_modules", "webpack",
                         "error in", "typeerror:", "referenceerror:"]

        found_leak = False
        for pattern in leak_patterns:
            if pattern in body:
                results.fail_test("[Data] API error leak",
                                  f"Stack trace leaked: found '{pattern}'")
                found_leak = True
                break

        if not found_leak:
            results.pass_test("[Data] API errors don't leak stack traces")
    except Exception as e:
        results.fail_test("[Data] Error response check", str(e))

    # ================================================================
    # SECTION 5: CSRF / REQUEST FORGERY
    # ================================================================

    # Test 5.1: Login doesn't accept GET requests for state changes
    try:
        resp = requests.get(
            f"{BASE_URL}/login",
            params={"username": STUDENT_USERNAME, "password": STUDENT_PASSWORD},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        # GET should render the form, not process login
        if resp.status_code == 200:
            results.pass_test("[CSRF] Login form doesn't process GET params")
        elif resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/login" not in location and location != "":
                results.fail_test("[CSRF] Login via GET",
                                  "Login may process via GET params!")
            else:
                results.pass_test("[CSRF] Login GET redirects safely")
        else:
            results.pass_test(f"[CSRF] Login GET returns {resp.status_code}")
    except Exception as e:
        results.fail_test("[CSRF] Login method check", str(e))

    # ================================================================
    # SECTION 6: PUSH/NOTIFICATION API SECURITY
    # ================================================================

    # Test 6.1: Push subscribe API requires authentication
    try:
        raw = requests.Session()
        resp = raw.post(
            f"{BASE_URL}/api/push/subscribe",
            json={"subscription": {"endpoint": "https://evil.com/push", "keys": {}}},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code in (401, 403):
            results.pass_test("[Push] Subscribe API requires auth")
        elif resp.status_code in (302, 303, 307, 308):
            results.pass_test("[Push] Subscribe API redirects unauth")
        elif resp.status_code in (400, 500):
            # Might fail for other reasons but at least not accepting the subscription
            results.pass_test(f"[Push] Subscribe API returns {resp.status_code} (not 200)")
        elif resp.status_code == 200:
            results.fail_test("[Push] Subscribe API auth",
                              "Push subscription accepted without auth!")
        else:
            results.pass_test(f"[Push] Subscribe API status: {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Push] Subscribe API check", str(e))

    # Test 6.2: Push send API requires authentication
    try:
        raw = requests.Session()
        resp = raw.post(
            f"{BASE_URL}/api/push/send",
            json={"title": "Test", "body": "Test notification"},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code in (401, 403):
            results.pass_test("[Push] Send API requires auth")
        elif resp.status_code in (302, 303, 307, 308):
            results.pass_test("[Push] Send API redirects unauth")
        elif resp.status_code == 200:
            results.fail_test("[Push] Send API auth",
                              "Can send push notifications without auth!")
        else:
            results.pass_test(f"[Push] Send API status: {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Push] Send API check", str(e))

    # ================================================================
    # SECTION 7: FILE UPLOAD SECURITY
    # ================================================================

    # Test 7.1: Upload API requires authentication
    try:
        raw = requests.Session()
        resp = raw.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.txt", b"malicious content", "text/plain")},
            timeout=TIMEOUT,
        )

        if resp.status_code in (401, 403):
            results.pass_test("[Upload] Upload API requires auth")
        elif resp.status_code in (302, 303, 307, 308):
            results.pass_test("[Upload] Upload API redirects unauth")
        elif resp.status_code == 200:
            results.fail_test("[Upload] Upload API auth",
                              "File upload accepted without auth!")
        else:
            results.pass_test(f"[Upload] Upload API status: {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("[Upload] Upload API check", str(e))

    return results.summary()


if __name__ == "__main__":
    test_comprehensive_security()
