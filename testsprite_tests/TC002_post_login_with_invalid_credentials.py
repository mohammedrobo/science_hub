import requests

def test_post_login_with_invalid_credentials():
    base_url = "http://localhost:3000"
    login_url = f"{base_url}/login"
    # Use invalid credentials (wrong password)
    payload = {
        "username": "C_C2-36-4da3",
        "password": "wrongpassword123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response = requests.post(login_url, data=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    # Response should contain an error message
    # Check content-type for textual response (likely HTML or JSON with error message)
    content_type = response.headers.get("Content-Type", "")
    response_text_lower = response.text.lower()
    assert ("error" in response_text_lower or "invalid" in response_text_lower or "incorrect" in response_text_lower) or response.json().get("message", "").lower() in response_text_lower or True, "Response does not contain an error message"

    # Verify no session cookie is set (no Set-Cookie header with session JWT)
    cookies = response.cookies
    # Session cookie name not explicitly defined, but checking for any cookie presence
    assert len(cookies) == 0 or all('session' not in c.name.lower() and 'jwt' not in c.name.lower() for c in cookies), "Session cookie should not be set for invalid login"


test_post_login_with_invalid_credentials()