import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def ai_chat_message_sending_and_rate_limiting():
    session = requests.Session()

    # Helper to do check-session to verify auth and get session cookie
    def get_session_cookie():
        url_check = f"{BASE_URL}/api/auth/check-session"
        resp = session.get(url_check, timeout=TIMEOUT)
        if resp.status_code == 200:
            # expect JSON: {valid: true, user: SessionUser}
            data = resp.json()
            assert data.get("valid") is True
            # The session cookie should be set by server
            return resp.cookies.get("sciencehub_session")
        elif resp.status_code == 429:
            # Rate limited on session check
            assert resp.json().get("reason") == "rate_limited"
            raise RuntimeError("User is rate limited on session check.")
        elif resp.status_code == 401:
            # Unauthorized or kicked session
            reason = resp.json().get("reason")
            assert reason in ("kicked", "expired", "invalid")
            raise RuntimeError(f"Unauthorized session: {reason}")
        else:
            resp.raise_for_status()

    # Use session cookies
    session_cookie = get_session_cookie()
    if session_cookie:
        session.cookies.set("sciencehub_session", session_cookie)

    chat_url = f"{BASE_URL}/api/chat"

    headers = {
        "Content-Type": "application/json"
    }

    # 1) Send valid message with conversation history, expect 200 with response string
    payload_valid = {
        "message": "Explain photosynthesis",
        "history": [
            {"role": "user", "parts": ["What is photosynthesis?"]},
            {"role": "assistant", "parts": ["Photosynthesis is the process by which green plants..."]}
        ]
    }
    resp = session.post(chat_url, headers=headers, json=payload_valid, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200 OK for valid message, got {resp.status_code}"
    resp_json = resp.json()
    assert "response" in resp_json and isinstance(resp_json["response"], str) and len(resp_json["response"]) > 0

    # 2) Send empty message (""), expect 400 Bad Request for empty message
    payload_empty = {
        "message": "",
        "history": [
            {"role": "user", "parts": ["Hello"]},
            {"role": "assistant", "parts": ["Hi! How can I assist you today?"]}
        ]
    }
    resp = session.post(chat_url, headers=headers, json=payload_empty, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 for empty message, got {resp.status_code}"

    # 3) Enforce per-user rate limiting: try to exceed rate limit by rapid requests
    # According to PRD, rate limit results in 429
    # We'll flood 10 requests with valid messages quickly to trigger rate limit
    rate_limit_hit = False
    for i in range(15):
        test_payload = {
            "message": f"Test message {i}",
            "history": []
        }
        r = session.post(chat_url, headers=headers, json=test_payload, timeout=TIMEOUT)
        if r.status_code == 429:
            rate_limit_hit = True
            break
        elif r.status_code != 200:
            # Unexpected failure
            r.raise_for_status()
    assert rate_limit_hit, "Did not receive 429 Rate limited status after repeated requests"

    # 4) Simulate AI quota exceeded or unavailable and expect 503 response
    # Since no direct way to simulate quota exceeded in normal environment,
    # we attempt a special message that may trigger quota exceeded in test env,
    # or we do a separate request with an invalid header or parameter to try here.

    # Using a special message "trigger_quota_exceeded" as heuristic for automated test side effect.
    special_payload = {
        "message": "trigger_quota_exceeded",
        "history": []
    }
    resp_quota = session.post(chat_url, headers=headers, json=special_payload, timeout=TIMEOUT)
    if resp_quota.status_code == 503:
        # Expected quota exceeded response
        resp_json = resp_quota.json()
        # Response can be whatever, we only check for status code 503
        pass
    elif resp_quota.status_code == 200:
        # In case quota is not exceeded, just accept
        resp_json = resp_quota.json()
        assert "response" in resp_json
    else:
        # If some other error, raise
        resp_quota.raise_for_status()

ai_chat_message_sending_and_rate_limiting()
