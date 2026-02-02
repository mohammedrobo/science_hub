import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
CHANGE_PASSWORD_ENDPOINT = f"{BASE_URL}/change-password"
LOGIN_ENDPOINT = f"{BASE_URL}/login"

# Credentials for an existing user that requires password change (assumed test user)
TEST_USERNAME = "testuser"
TEST_OLD_PASSWORD = "OldPassword123!"
# For token/session retrieval after login (simulate session/cookie handling)
SESSION = requests.Session()
TIMEOUT = 30

def test_change_password_api_strength_validation_and_confirmation():
    try:
        # Step 1: Log in user first to authenticate and acquire session cookies
        login_payload = {
            "username": TEST_USERNAME,
            "password": TEST_OLD_PASSWORD
        }
        login_headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        login_response = SESSION.post(
            LOGIN_ENDPOINT,
            data=login_payload,
            headers=login_headers,
            timeout=TIMEOUT,
            allow_redirects=False,
        )
        # Expect redirect (302) to change-password or dashboard, 200 means error
        assert login_response.status_code in [200, 302], f"Unexpected login status {login_response.status_code}"

        # If login failed with 200 (error), abort test (invalid creds)
        if login_response.status_code == 200:
            raise AssertionError("Login failed, cannot proceed with password change test")

        # Prepare test cases for change-password scenarios
        test_cases = [
            # Mismatched password confirmation
            {
                "payload": {
                    "new_password": "StrongPass!123",
                    "confirm_password": "MismatchPass!123"
                },
                "expected_status": 200,
                "expect_redirect": False,
                "expect_error": True,
                "desc": "Mismatched new_password and confirm_password"
            },
            # Weak password (no uppercase, too short)
            {
                "payload": {
                    "new_password": "weak",
                    "confirm_password": "weak"
                },
                "expected_status": 200,
                "expect_redirect": False,
                "expect_error": True,
                "desc": "Weak password (too short and no complexity)"
            },
            # SQL injection attempt in new_password field
            {
                "payload": {
                    "new_password": "StrongPass123'; DROP TABLE users;--",
                    "confirm_password": "StrongPass123'; DROP TABLE users;--"
                },
                "expected_status": 200,
                "expect_redirect": False,
                "expect_error": True,
                "desc": "SQL injection attempt in password"
            },
            # Successful password change (valid strong password and matching confirm)
            {
                "payload": {
                    "new_password": "ValidStrongPass!2026",
                    "confirm_password": "ValidStrongPass!2026"
                },
                "expected_status": 302,
                "expect_redirect": True,
                "expect_error": False,
                "desc": "Valid strong password change"
            }
        ]

        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        for case in test_cases:
            response = SESSION.post(
                CHANGE_PASSWORD_ENDPOINT,
                data=case["payload"],
                headers=headers,
                timeout=TIMEOUT,
                allow_redirects=False,
            )

            assert response.status_code == case["expected_status"], (
                f"Failed: {case['desc']} - Expected status {case['expected_status']} but got {response.status_code}"
            )
            if case["expect_redirect"]:
                # Validate location header for redirect
                location = response.headers.get("Location", "")
                # On success, redirect to home or dashboard expected (not change-password again)
                assert location and location != "/change-password", (
                    f"Failed: {case['desc']} - Expected redirect location but got {location}"
                )
            else:
                # For error cases, should NOT redirect
                assert "Location" not in response.headers or response.headers.get("Location") == "", (
                    f"Failed: {case['desc']} - Unexpected redirect on error"
                )
                # Response body should include error message (assuming JSON or text)
                body = response.text.lower()
                assert (
                    "error" in body or "password" in body or "mismatch" in body or "strength" in body
                ), f"Failed: {case['desc']} - Expected error message in response body but got: {response.text}"

        # Step 2: Security checks for authentication bypass and session management
        # Attempt change-password POST without authentication cookies/session
        unauth_response = requests.post(
            CHANGE_PASSWORD_ENDPOINT,
            data={
                "new_password": "AttackPass!1234",
                "confirm_password": "AttackPass!1234"
            },
            headers=headers,
            timeout=TIMEOUT,
            allow_redirects=False,
        )
        # Should be rejected - expect 401 Unauthorized or redirect to login/change-password
        assert unauth_response.status_code in [401, 302], (
            f"Unauthenticated change-password attempt should be unauthorized or redirect, got {unauth_response.status_code}"
        )

        # Attempt to test authorization flaw by sending change-password with manipulated cookie/session
        # Since we cannot forge sessions here easily, assert that cookie-based session enforces user context

        # Testing API key exposure is not applicable here as no API keys are sent in this endpoint

    except RequestException as e:
        raise AssertionError(f"Request failed: {e}")

test_change_password_api_strength_validation_and_confirmation()