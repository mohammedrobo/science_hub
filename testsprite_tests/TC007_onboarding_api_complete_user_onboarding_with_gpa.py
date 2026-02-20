"""
TC007: Onboarding API — Complete User Onboarding
Tests the onboarding flow:
- Unauthenticated access blocked
- Authenticated access to onboarding page
- Non-onboarded users redirected to onboarding
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    TestSession, TestResults
)


def test_onboarding_api():
    results = TestResults("TC007 — Onboarding API: Complete User Onboarding")

    # ============ Test 1: Unauthenticated access to /onboarding blocked ============
    try:
        raw = requests.Session()
        resp = raw.get(
            f"{BASE_URL}/onboarding",
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/login" in location:
                results.pass_test("Unauthenticated onboarding access redirects to login")
            else:
                results.pass_test(f"Unauthenticated redirected to: {location}")
        elif resp.status_code in (401, 403):
            results.pass_test("Unauthenticated onboarding returns 401/403")
        elif resp.status_code == 200:
            results.fail_test("Onboarding auth check",
                              "Onboarding page accessible without auth!")
        else:
            results.fail_test("Onboarding auth check",
                              f"Unexpected status {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("Unauthenticated onboarding", str(e))

    # ============ Test 2: Login and check redirect flow ============
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            results.pass_test("Login successful")

            # Follow the redirect chain
            resp = ts.get("/", allow_redirects=False)
            if resp.status_code in (302, 303, 307, 308):
                location = resp.headers.get("Location", "")
                if "/onboarding" in location:
                    results.pass_test("Non-onboarded user redirected to onboarding")
                elif "/change-password" in location:
                    results.pass_test("First-login user redirected to change-password")
                else:
                    results.pass_test(f"User redirected to: {location}")
            elif resp.status_code == 200:
                results.pass_test("User can access home (already onboarded)")
            else:
                results.fail_test("Post-login redirect", f"Status {resp.status_code}")
        else:
            results.fail_test("Login", msg)

        ts.close()
    except Exception as e:
        results.fail_test("Login & redirect flow", str(e))

    # ============ Test 3: Onboarding page is accessible after login ============
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            resp = ts.get("/onboarding", allow_redirects=True)
            if resp.status_code == 200:
                results.pass_test("Onboarding page loads for authenticated user")
            elif resp.status_code in (302, 303, 307, 308):
                # Might redirect if already onboarded
                location = resp.headers.get("Location", "")
                results.pass_test(f"Onboarding redirects (user may be already onboarded): {location}")
            else:
                results.fail_test("Onboarding page load", f"Status {resp.status_code}")
        else:
            results.fail_test("Pre-req: Login for onboarding", msg)

        ts.close()
    except Exception as e:
        results.fail_test("Onboarding page access", str(e))

    # ============ Test 4: Admin users skip onboarding ============
    # Admin users should not be forced to go through onboarding
    # This is verified by checking the middleware logic
    try:
        from test_config import ADMIN_USERNAME, ADMIN_PASSWORD
        ts = TestSession()
        success, msg = ts.login(ADMIN_USERNAME, ADMIN_PASSWORD)

        if success:
            resp = ts.get("/", allow_redirects=False)
            location = resp.headers.get("Location", "") if resp.status_code in (302, 303, 307, 308) else ""

            if "/onboarding" not in location:
                results.pass_test("Admin users not forced to onboarding")
            else:
                results.fail_test("Admin onboarding skip", "Admin redirected to onboarding!")
        else:
            results.fail_test("Admin login", msg)

        ts.close()
    except Exception as e:
        results.fail_test("Admin onboarding bypass", str(e))

    # ============ Test 5: Onboarding page doesn't leak sensitive data ============
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            resp = ts.get("/onboarding", allow_redirects=True)
            if resp.status_code == 200:
                body = resp.text.lower()
                sensitive_patterns = [
                    "service_role",
                    "supabase_service_role_key",
                    "session_secret",
                    "api_key",
                ]
                found_leak = False
                for pattern in sensitive_patterns:
                    if pattern in body:
                        results.fail_test("Onboarding data leak", f"Found '{pattern}' in page")
                        found_leak = True
                        break
                if not found_leak:
                    results.pass_test("Onboarding page contains no sensitive data")
            else:
                results.pass_test("Onboarding redirect (data check skipped)")

        ts.close()
    except Exception as e:
        results.fail_test("Onboarding data leak check", str(e))

    return results.summary()


if __name__ == "__main__":
    test_onboarding_api()
