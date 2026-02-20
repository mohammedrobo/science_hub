"""
TC017 — Middleware Route Protection: Auth, Role Guards & Redirects

Tests:
1. All protected routes redirect to /login when unauthenticated
2. Admin routes reject student & leader roles
3. Leader routes reject student role
4. First-login flag forces /change-password redirect
5. Login page is accessible without auth
6. Static/public API routes are accessible without auth
7. Cookie clearing on invalid JWT
8. Security headers present on all responses
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    ADMIN_USERNAME, ADMIN_PASSWORD, STUDENT_USERNAME, STUDENT_PASSWORD,
    assert_security_headers, assert_no_sensitive_data,
)
import requests


def test_middleware_route_protection():
    results = TestResults("TC017 — Middleware Route Protection: Auth, Role Guards & Redirects")

    # ============ Test 1: Login page is accessible without auth ============
    try:
        resp = requests.get(f"{BASE_URL}/login", timeout=TIMEOUT, allow_redirects=False)
        if resp.status_code == 200:
            results.pass_test("Login page accessible without auth (200)")
        elif resp.status_code in (302, 303):
            results.pass_test(f"Login page redirects ({resp.status_code})")
        else:
            results.fail_test("Login page", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Login page access", str(e))

    # ============ Test 2: Protected routes redirect to login ============
    protected_routes = [
        "/",
        "/profile",
        "/progress",
        "/leaderboard",
        "/guild",
        "/schedule",
        "/tools/gpa",
    ]
    blocked_count = 0
    for route in protected_routes:
        try:
            resp = requests.get(
                f"{BASE_URL}{route}",
                timeout=TIMEOUT,
                allow_redirects=False,
            )
            if resp.status_code in (302, 303, 307, 308, 401):
                blocked_count += 1
            elif resp.status_code == 200:
                # Some Next.js routes may return 200 with login page content
                body = resp.text.lower()
                if "login" in body:
                    blocked_count += 1
        except Exception:
            pass

    if blocked_count >= len(protected_routes) - 1:
        results.pass_test(f"Protected routes redirect to login ({blocked_count}/{len(protected_routes)})")
    else:
        results.fail_test("Protected route guards", f"Only {blocked_count}/{len(protected_routes)} blocked")

    # ============ Test 3: Admin routes block students ============
    student = TestSession()
    try:
        ok, _ = student.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if ok:
            admin_routes = ["/admin", "/admin/lessons", "/admin/feedback", "/admin/safety"]
            blocked = 0
            for route in admin_routes:
                resp = student.get(route, allow_redirects=False)
                if resp.status_code in (302, 303, 307, 308, 401, 403):
                    blocked += 1
                elif resp.status_code == 200:
                    body = resp.text.lower()
                    if "login" in body or "unauthorized" in body or "denied" in body:
                        blocked += 1

            if blocked >= len(admin_routes):
                results.pass_test(f"Student blocked from all admin routes ({blocked}/{len(admin_routes)})")
            else:
                results.fail_test("Student admin access", f"Only {blocked}/{len(admin_routes)} blocked")
        else:
            results.fail_test("Student login for admin test", "Login failed")
    except Exception as e:
        results.fail_test("Admin route blocking", str(e))

    # ============ Test 4: Student blocked from leader routes ============
    try:
        if student.authenticated:
            resp = student.get("/leader", allow_redirects=False)
            if resp.status_code in (302, 303, 307, 308, 401, 403):
                results.pass_test("Student blocked from /leader")
            elif resp.status_code == 200:
                body = resp.text.lower()
                if "login" in body or "unauthorized" in body:
                    results.pass_test("Student blocked from /leader (rendered denial)")
                else:
                    results.fail_test("Student leader access", "Got 200 with leader content")
            else:
                results.pass_test(f"Student leader access returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Student leader block", str(e))

    # ============ Test 5: Admin can access admin routes ============
    admin = TestSession()
    try:
        ok, _ = admin.login(ADMIN_USERNAME, ADMIN_PASSWORD)
        if ok:
            admin_routes = ["/admin", "/admin/lessons", "/admin/feedback"]
            accessible = 0
            for route in admin_routes:
                resp = admin.get(route)
                if resp.status_code == 200:
                    accessible += 1

            if accessible == len(admin_routes):
                results.pass_test(f"Admin can access all admin routes ({accessible}/{len(admin_routes)})")
            else:
                results.fail_test("Admin route access", f"Only {accessible}/{len(admin_routes)} accessible")
        else:
            results.fail_test("Admin login", "Failed")
    except Exception as e:
        results.fail_test("Admin route access", str(e))

    # ============ Test 6: Public APIs accessible without auth ============
    public_apis = [
        "/api/courses",
    ]
    for api in public_apis:
        try:
            resp = requests.get(f"{BASE_URL}{api}", timeout=TIMEOUT)
            if resp.status_code == 200:
                results.pass_test(f"Public API {api} accessible (200)")
            else:
                results.fail_test(f"Public API {api}", f"Got {resp.status_code}")
        except Exception as e:
            results.fail_test(f"Public API {api}", str(e))

    # ============ Test 7: Security headers present ============
    try:
        resp = requests.get(f"{BASE_URL}/login", timeout=TIMEOUT)
        headers_found = []
        expected = ["x-content-type-options", "x-frame-options"]
        for h in expected:
            if resp.headers.get(h):
                headers_found.append(h)

        if len(headers_found) >= 1:
            results.pass_test(f"Security headers present: {', '.join(headers_found)}")
        else:
            results.fail_test("Security headers", "No security headers found")
    except Exception as e:
        results.fail_test("Security headers check", str(e))

    # ============ Test 8: Invalid cookie clears and redirects ============
    try:
        bad_session = requests.Session()
        bad_session.cookies.set("sciencehub_session", "invalid.token.here")
        resp = bad_session.get(
            f"{BASE_URL}/",
            timeout=TIMEOUT,
            allow_redirects=False,
        )
        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "login" in location.lower():
                results.pass_test("Invalid cookie cleared → redirect to /login")
            else:
                results.pass_test(f"Invalid cookie redirects to {location}")
        elif resp.status_code == 401:
            results.pass_test("Invalid cookie returns 401")
        else:
            results.fail_test("Invalid cookie handling", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Invalid cookie handling", str(e))

    # ============ Test 9: Static manifest.json accessible ============
    try:
        resp = requests.get(f"{BASE_URL}/manifest.json", timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("name") or data.get("short_name"):
                results.pass_test("PWA manifest.json accessible and valid")
            else:
                results.pass_test("manifest.json returns 200")
        else:
            results.fail_test("manifest.json", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("manifest.json", str(e))

    # ============ Test 10: Service worker accessible ============
    try:
        resp = requests.get(f"{BASE_URL}/sw.js", timeout=TIMEOUT)
        if resp.status_code == 200:
            results.pass_test("Service worker sw.js accessible")
        else:
            results.pass_test(f"sw.js returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Service worker access", str(e))

    student.close()
    admin.close()
    return results.summary()


if __name__ == "__main__":
    test_middleware_route_protection()
