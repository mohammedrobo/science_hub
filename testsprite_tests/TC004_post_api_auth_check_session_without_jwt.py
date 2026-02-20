import requests

def test_post_api_auth_check_session_without_jwt():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/auth/check-session"
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected status 401, got {response.status_code}"
    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(json_resp, dict), "Response JSON is not an object"
    assert json_resp.get("valid") is False, f"Expected valid: false, got {json_resp.get('valid')}"
    assert "error" in json_resp, "Response JSON missing 'error' message"

test_post_api_auth_check_session_without_jwt()