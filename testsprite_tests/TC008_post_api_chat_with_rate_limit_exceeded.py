import requests

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/login"
CHAT_PATH = "/api/chat"
TIMEOUT = 30

USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"

def test_post_api_chat_with_rate_limit_exceeded():
    session = requests.Session()
    try:
        # Step 1: Login with valid credentials to get JWT cookie
        login_data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_resp = session.post(BASE_URL + LOGIN_PATH, json=login_data, allow_redirects=False, timeout=TIMEOUT)
        if login_resp.status_code == 302:
            # Assert login redirect 302 with Set-Cookie JWT
            assert 'set-cookie' in login_resp.headers or 'Set-Cookie' in login_resp.headers, "JWT cookie not set on login response"
            # Session will store cookie automatically

            # Step 2: Exceed rate limits by sending multiple POST /api/chat requests with valid message and history
            chat_payload = {
                "message": "Test message for rate limit",
                "history": []
            }

            # Send requests until 429 received or up to 20 attempts to avoid infinite loop
            rate_limited = False
            for _ in range(20):
                resp = session.post(BASE_URL + CHAT_PATH, json=chat_payload, timeout=TIMEOUT)
                if resp.status_code == 429:
                    rate_limited = True
                    resp_json = resp.json()
                    assert "error" in resp_json, "429 response missing error key"
                    assert resp_json["error"] == "Rate limit exceeded", f"Expected 'Rate limit exceeded' error, got {resp_json['error']}"
                    break
                else:
                    # Assert successful or other expected codes before rate limit hit
                    assert resp.status_code == 200, f"Expected 200 or 429, got {resp.status_code}"
                    assert "reply" in resp.json(), "200 response missing reply key"

            assert rate_limited, "Rate limit not exceeded after multiple requests"
        elif login_resp.status_code == 200:
            # Login failed, assert error message
            resp_json = login_resp.json()
            assert "error" in resp_json or "message" in resp_json, "Login failed but no error message present"
        else:
            assert False, f"Unexpected login response status {login_resp.status_code}"

    finally:
        session.close()

test_post_api_chat_with_rate_limit_exceeded()
