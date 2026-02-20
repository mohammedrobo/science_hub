import requests

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/login"
CHECK_SESSION_URL = f"{BASE_URL}/api/auth/check-session"
TIMEOUT = 30

USERNAME = "C_C2-36-4da3"
PASSWORD = "gOJ1xWNujMuC"

def test_post_api_auth_check_session_with_valid_jwt():
    session = requests.Session()
    try:
        # Step 1: Login to get JWT cookie
        login_payload = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_response = session.post(LOGIN_URL, json=login_payload, allow_redirects=False, timeout=TIMEOUT)
        assert login_response.status_code == 302, f"Expected 302 from login, got {login_response.status_code}"
        cookies = session.cookies.get_dict()
        assert any(c for c in cookies if 'jwt' in c.lower()), "JWT cookie not set after login"

        # Step 2: POST /api/auth/check-session with JWT cookie
        check_session_response = session.post(CHECK_SESSION_URL, timeout=TIMEOUT)
        assert check_session_response.status_code == 200, f"Expected 200, got {check_session_response.status_code}"
        json_data = check_session_response.json()
        assert isinstance(json_data, dict), "Response is not a JSON object"
        assert "valid" in json_data, "'valid' key not in response JSON"
        assert json_data["valid"] is True, f"Expected valid: true, got valid: {json_data['valid']}"

        # Check for single-session enforcement keys if present
        if "kicked" in json_data:
            assert isinstance(json_data["kicked"], bool), "'kicked' key is not boolean"
            if json_data["kicked"]:
                reason = json_data.get("reason")
                assert isinstance(reason, str) and reason, "'reason' must be a non-empty string when kicked is true"

    finally:
        session.close()

test_post_api_auth_check_session_with_valid_jwt()
