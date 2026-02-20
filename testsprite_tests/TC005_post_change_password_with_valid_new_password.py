import requests

BASE_URL = "http://localhost:3000"
USERNAME = "C_C2-36-4da3"
PASSWORD = "gOJ1xWNujMuC"
TIMEOUT = 30

def test_post_change_password_with_valid_new_password():
    session = requests.Session()
    try:
        # Step 1: Login to get authenticated session with JWT cookie
        login_data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_resp = session.post(f"{BASE_URL}/login", data=login_data, allow_redirects=False, timeout=TIMEOUT)
        assert login_resp.status_code == 302, f"Login did not redirect as expected, got {login_resp.status_code}"
        # Confirm that Set-Cookie header is present
        assert "set-cookie" in login_resp.headers or "Set-Cookie" in login_resp.headers, "JWT cookie not set on login"

        # Step 2: Post to /change-password with a strong valid new password
        new_password = "Str0ngPassw0rd!"  # Meets strength requirements (>=8 chars, uppercase, lowercase, number)
        change_password_payload = {
            "newPassword": new_password,
            "confirmPassword": new_password
        }
        change_password_resp = session.post(f"{BASE_URL}/change-password", json=change_password_payload, allow_redirects=False, timeout=TIMEOUT)

        # Step 3: Assert 302 redirect to '/' or '/onboarding'
        assert change_password_resp.status_code == 302, f"Expected 302 redirect, got {change_password_resp.status_code}"
        location = change_password_resp.headers.get("Location", "")
        assert location in ["/", "/onboarding"], f"Unexpected redirect Location: {location}"

    finally:
        # Logout or cleanup if needed (no explicit logout endpoint noted; if needed, could be added)
        session.close()

test_post_change_password_with_valid_new_password()