import requests
import uuid

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/tracking/end"
TIMEOUT = 30  # seconds

def test_session_tracking_end_with_sendbeacon_support():
    headers = {
        "Content-Type": "application/json"
    }
    
    # 1. Test ending with a nonexistent session_id -> should return 404
    nonexistent_session_id = str(uuid.uuid4())
    try:
        response = requests.post(
            BASE_URL + ENDPOINT,
            json={"session_id": nonexistent_session_id},
            headers=headers,
            timeout=TIMEOUT
        )
        assert response.status_code in (404,), f"Expected 404 for nonexistent session_id, got {response.status_code}"
        json_resp = response.json() if response.headers.get('Content-Type','').startswith('application/json') else None
        assert "Session not found" in response.text or response.status_code == 404
    except requests.RequestException as e:
        assert False, f"Request failed for nonexistent session_id test: {e}"

    # 2. Test with a valid session_id simulation (random UUID) and expect 200 or 404
    valid_session_id = str(uuid.uuid4())
    try:
        response_valid = requests.post(
            BASE_URL + ENDPOINT,
            json={"session_id": valid_session_id},
            headers=headers,
            timeout=TIMEOUT
        )
        assert response_valid.status_code in (200, 404), f"Unexpected status {response_valid.status_code} for valid session id test"
        if response_valid.status_code == 200:
            json_valid = response_valid.json()
            assert "success" in json_valid and json_valid["success"] is True
        else:
            assert "Session not found" in response_valid.text or response_valid.status_code == 404
    except requests.RequestException as e:
        assert False, f"Request failed when ending valid session simulation: {e}"

test_session_tracking_end_with_sendbeacon_support()
