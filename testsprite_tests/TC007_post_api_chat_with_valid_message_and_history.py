import requests

BASE_URL = "http://localhost:3000"
LOGIN_URL = BASE_URL + "/login"
CHAT_URL = BASE_URL + "/api/chat"
TIMEOUT = 30

USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"

def test_post_api_chat_with_valid_message_and_history():
    session = requests.Session()
    login_payload = {
        "username": USERNAME,
        "password": PASSWORD
    }

    # Step 1: Login to get JWT session cookie
    login_resp = session.post(LOGIN_URL, json=login_payload, allow_redirects=False, timeout=TIMEOUT)
    assert login_resp.status_code == 302, f"Expected 302 redirect on login, got {login_resp.status_code}"
    assert "Set-Cookie" in login_resp.headers, "Login response missing Set-Cookie header for JWT session"
    
    # Step 2: Prepare chat payload with message and history
    chat_payload = {
        "message": "What is the atomic number of Oxygen?",
        "history": [
            {"role": "user", "content": "Explain atoms."},
            {"role": "assistant", "content": "Atoms are the building blocks of matter."}
        ]
    }

    # Step 3: Call /api/chat with JWT cookie set
    headers = {
        "Content-Type": "application/json"
    }
    chat_resp = session.post(CHAT_URL, json=chat_payload, headers=headers, timeout=TIMEOUT)
    
    # Step 4: Validate response
    assert chat_resp.status_code == 200, f"Expected 200 OK from /api/chat, got {chat_resp.status_code}"
    resp_json = chat_resp.json()
    assert "reply" in resp_json, "Response JSON missing 'reply' field"
    assert isinstance(resp_json["reply"], str), "'reply' field is not a string"
    assert len(resp_json["reply"]) > 0, "'reply' field is empty"

test_post_api_chat_with_valid_message_and_history()
