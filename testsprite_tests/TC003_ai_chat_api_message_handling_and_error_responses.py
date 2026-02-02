import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

HEADERS = {
    "Content-Type": "application/json"
}

def test_ai_chat_api_message_handling_and_error_responses():
    url = f"{BASE_URL}/api/chat"
    
    # 1. Valid message returns AI response (200)
    valid_payload = {"message": "Hello AI, how are you?"}
    resp = requests.post(url, json=valid_payload, headers=HEADERS, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    json_data = resp.json()
    assert "content" in json_data and isinstance(json_data["content"], str) and json_data["content"].strip() != "", "Response must contain non-empty 'content' string"
    
    # 2. Missing message returns 400
    invalid_payload = {}
    resp2 = requests.post(url, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
    assert resp2.status_code == 400, f"Expected 400 for missing message, got {resp2.status_code}"


test_ai_chat_api_message_handling_and_error_responses()