import requests

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/login"
CHANGE_PASSWORD_URL = f"{BASE_URL}/change-password"
TIMEOUT = 30

USERNAME = "C_C2-36-4da3"
PASSWORD = "gOJ1xWNujMuC"

def test_post_change_password_with_weak_new_password():
    session = requests.Session()
    try:
        # Login first to get JWT session cookie
        login_payload = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_resp = session.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT, allow_redirects=False)
        # Expect 302 redirect to dashboard or change-password
        assert login_resp.status_code == 302, f"Login failed or unexpected status {login_resp.status_code}"
        assert 'Set-Cookie' in login_resp.headers, "No Set-Cookie header with JWT session found"

        # Prepare weak password payload (less than 8 characters)
        weak_password = "weak1"  # length 5, less than 8
        change_password_payload = {
            "newPassword": weak_password,
            "confirmPassword": weak_password
        }

        # POST /change-password with weak password
        change_resp = session.post(CHANGE_PASSWORD_URL, json=change_password_payload, timeout=TIMEOUT)
        # According to PRD: returns 200 with validation error message
        assert change_resp.status_code == 200, f"Expected status 200 but got {change_resp.status_code}"

        # Validate response contains a validation error message
        content_lower = change_resp.text.lower()
        assert ("error" in content_lower or "validation" in content_lower or "weak" in content_lower or "password" in content_lower), \
            "Response does not contain validation error message for weak password"

    finally:
        session.close()


test_post_change_password_with_weak_new_password()
