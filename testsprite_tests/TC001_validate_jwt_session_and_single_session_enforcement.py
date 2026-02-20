import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/auth/check-session"
TIMEOUT = 30
USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"

def validate_jwt_session_and_single_session_enforcement():
    auth = HTTPBasicAuth(USERNAME, PASSWORD)
    session = requests.Session()
    session.auth = auth

    # Helper function to create a session by logging in and capturing the sciencehub_session cookie
    def create_session_cookie():
        login_url = f"{BASE_URL}/api/auth/login"
        login_payload = {"username": USERNAME, "password": PASSWORD}
        try:
            resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
            resp.raise_for_status()
            cookies = resp.cookies
            if "sciencehub_session" not in cookies:
                raise AssertionError("Failed to obtain sciencehub_session cookie on login")
            return cookies["sciencehub_session"]
        except requests.RequestException as e:
            raise AssertionError(f"Login request failed: {e}")

    # Helper function to call /api/auth/check-session with given cookie
    def call_check_session(session_cookie):
        headers = {}
        cookies = {"sciencehub_session": session_cookie} if session_cookie else {}
        try:
            resp = session.get(f"{BASE_URL}{ENDPOINT}", headers=headers, cookies=cookies, timeout=TIMEOUT)
            return resp
        except requests.RequestException as e:
            raise AssertionError(f"Check session request failed: {e}")

    # 1) Test valid session returns 200 and valid:true
    session_cookie = create_session_cookie()
    resp = call_check_session(session_cookie)
    assert resp.status_code == 200, f"Expected 200 for valid session, got {resp.status_code}"
    json_resp = resp.json()
    assert json_resp.get("valid") is True, "Expected valid:true for valid session"
    assert "user" in json_resp and isinstance(json_resp["user"], dict), "Response missing 'user' object for valid session"

    # 2) Test expired/invalid session returns 401 with valid:false and reason
    invalid_cookie = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature"
    resp = call_check_session(invalid_cookie)
    assert resp.status_code == 401, f"Expected 401 for invalid session, got {resp.status_code}"
    json_resp = resp.json()
    assert json_resp.get("valid") is False, "Expected valid:false for invalid session"
    assert isinstance(json_resp.get("reason"), str), "Expected reason string for invalid session"

    # 3) Test revoked/kicked session returns 401 with reason 'kicked'
    # To simulate "kicked" session, create two sessions and use the first session cookie after second login
    session_cookie_1 = create_session_cookie()
    session_cookie_2 = create_session_cookie()
    # Use first cookie, which should be revoked due to single-session enforcement by second login
    resp = call_check_session(session_cookie_1)
    assert resp.status_code == 401, f"Expected 401 for kicked session, got {resp.status_code}"
    json_resp = resp.json()
    assert json_resp.get("valid") is False, "Expected valid:false for kicked session"
    assert json_resp.get("reason") == "kicked", f"Expected reason 'kicked' for kicked session but got {json_resp.get('reason')}"

    # 4) Test rate-limited session returns 429 with reason 'rate_limited'
    # To trigger rate limit, repeatedly call check-session beyond presumed limit
    # Limit is unknown, try 20 calls quickly and check for 429
    rate_limited_detected = False
    for _ in range(20):
        resp = call_check_session(session_cookie_2)
        if resp.status_code == 429:
            json_resp = resp.json()
            assert json_resp.get("valid") is False, "Expected valid:false on rate limit"
            assert json_resp.get("reason") == "rate_limited", f"Expected reason 'rate_limited', got {json_resp.get('reason')}"
            rate_limited_detected = True
            break
    assert rate_limited_detected, "Rate limit 429 was not triggered as expected"

validate_jwt_session_and_single_session_enforcement()