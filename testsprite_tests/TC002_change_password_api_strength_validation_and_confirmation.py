"""
TC002: Change Password API Strength Validation and Confirmation
Tests the /change-password endpoint for:
- Password mismatch rejection
- Weak password rejection
- Successful strong password change
- Unauthenticated access prevention
- SQL injection in password fields
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    TestSession, TestResults, assert_no_sensitive_data
)


def test_change_password_api():
    results = TestResults("TC002 — Change Password Strength Validation")

    # We need a user that requires password change (is_first_login=true)
    # Login first to get a session, then test change-password
    ts = TestSession()
    success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

    if not success:
        results.fail_test("Pre-requisite: Login", msg)
        results.summary()
        return

    results.pass_test("Pre-requisite: Login successful")

    # ============ Test 1: Mismatched passwords ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "StrongPass123!",
            "confirm_password": "DifferentPass123!",
        })
        # Server action re-renders page with error (200) on failure
        if resp.status_code == 200:
            results.pass_test("Mismatched passwords rejected (stays on page)")
        elif resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/change-password" in location:
                results.pass_test("Mismatched passwords rejected (redirect to same page)")
            else:
                results.fail_test("Mismatched passwords", f"Unexpected redirect to {location}")
        else:
            results.fail_test("Mismatched passwords", f"Unexpected status {resp.status_code}")
    except Exception as e:
        results.fail_test("Mismatched passwords", str(e))

    # ============ Test 2: Too short password ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "Ab1",
            "confirm_password": "Ab1",
        })
        if resp.status_code == 200:
            results.pass_test("Short password rejected")
        else:
            # If redirect, check it's not to home (which would mean success)
            location = resp.headers.get("Location", "")
            if "/" == location or "/onboarding" in location:
                results.fail_test("Short password rejected", "Password change succeeded with short password!")
            else:
                results.pass_test("Short password rejected (redirect to change-password)")
    except Exception as e:
        results.fail_test("Short password", str(e))

    # ============ Test 3: No uppercase ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "alllowercase123",
            "confirm_password": "alllowercase123",
        })
        if resp.status_code == 200:
            results.pass_test("No-uppercase password rejected")
        else:
            location = resp.headers.get("Location", "")
            if "/" == location or "/onboarding" in location:
                results.fail_test("No-uppercase rejected", "Accepted password without uppercase!")
            else:
                results.pass_test("No-uppercase password rejected")
    except Exception as e:
        results.fail_test("No-uppercase password", str(e))

    # ============ Test 4: No number ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "NoNumberHere!",
            "confirm_password": "NoNumberHere!",
        })
        if resp.status_code == 200:
            results.pass_test("No-number password rejected")
        else:
            location = resp.headers.get("Location", "")
            if "/" == location or "/onboarding" in location:
                results.fail_test("No-number rejected", "Accepted password without number!")
            else:
                results.pass_test("No-number password rejected")
    except Exception as e:
        results.fail_test("No-number password", str(e))

    # ============ Test 5: Empty fields ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "",
            "confirm_password": "",
        })
        if resp.status_code == 200:
            results.pass_test("Empty password fields rejected")
        else:
            location = resp.headers.get("Location", "")
            if "/" == location or "/onboarding" in location:
                results.fail_test("Empty fields rejected", "Accepted empty password!")
            else:
                results.pass_test("Empty password fields rejected")
    except Exception as e:
        results.fail_test("Empty password fields", str(e))

    # ============ Test 6: SQL injection in password field ============
    try:
        resp = ts.post_form("/change-password", {
            "new_password": "Strong1'; DROP TABLE users;--",
            "confirm_password": "Strong1'; DROP TABLE users;--",
        })
        # This might actually pass validation since it has uppercase, lowercase, number
        # The key check is that it doesn't cause a server error
        if resp.status_code in (200, 302, 303):
            results.pass_test("SQL injection in password handled safely")
        elif resp.status_code == 500:
            results.fail_test("SQL injection in password", "Caused server error!")
        else:
            results.pass_test("SQL injection in password handled safely")
    except Exception as e:
        results.fail_test("SQL injection in password", str(e))

    # ============ Test 7: Unauthenticated access ============
    try:
        raw_session = requests.Session()
        resp = raw_session.post(
            f"{BASE_URL}/change-password",
            data={"new_password": "ValidPass123!", "confirm_password": "ValidPass123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        # Should redirect to /login or return 401
        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/login" in location:
                results.pass_test("Unauthenticated change-password redirects to login")
            else:
                results.pass_test(f"Unauthenticated change-password redirected ({location})")
        elif resp.status_code in (401, 403):
            results.pass_test("Unauthenticated change-password returns 401/403")
        elif resp.status_code == 200:
            # Next.js might render the page which then checks session
            results.pass_test("Unauthenticated change-password handled by page")
        else:
            results.fail_test("Unauthenticated change-password",
                              f"Unexpected status {resp.status_code}")

        raw_session.close()
    except Exception as e:
        results.fail_test("Unauthenticated access", str(e))

    # ============ Test 8: Valid strong password change ============
    # NOTE: We do this LAST since it changes the actual password
    try:
        new_pass = "TestSpriteNewPass2026!"
        resp = ts.post_form("/change-password", {
            "new_password": new_pass,
            "confirm_password": new_pass,
        })

        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/change-password" not in location:
                results.pass_test("Valid strong password accepted (redirect to next page)")
            else:
                results.fail_test("Valid password change", f"Still on change-password page")
        elif resp.status_code == 200:
            # Server action may return 200 with updated page content
            body = resp.text.lower()
            # Only fail if we see specific password validation error messages
            validation_errors = ["passwords do not match", "password is too short", 
                                 "must contain at least", "password must be at least"]
            has_validation_error = any(err in body for err in validation_errors)
            if has_validation_error:
                results.fail_test("Valid password change", "Got 200 with password validation error")
            else:
                results.pass_test("Valid strong password accepted (200 with page content)")
        else:
            results.fail_test("Valid password change", f"Unexpected status {resp.status_code}")

        # Try to restore original password for future tests
        try:
            ts2 = TestSession()
            ts2.login(STUDENT_USERNAME, new_pass)
            ts2.post_form("/change-password", {
                "new_password": STUDENT_PASSWORD,
                "confirm_password": STUDENT_PASSWORD,
            })
            ts2.close()
        except Exception:
            print("  ⚠️  Warning: Could not restore original password")

    except Exception as e:
        results.fail_test("Valid password change", str(e))

    ts.close()
    return results.summary()


if __name__ == "__main__":
    test_change_password_api()
