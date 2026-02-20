import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_login_with_valid_credentials():
    login_url = f"{BASE_URL}/login"
    payload = {
        "username": "C_C2-36-4da3",
        "password": "Satoru123@"
    }
    try:
        # Perform POST /login
        response = requests.post(login_url, data=payload, timeout=TIMEOUT, allow_redirects=False)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    
    # Assert status code is 302 redirect
    assert response.status_code == 302, f"Expected status code 302, got {response.status_code}"
    
    # Assert Location header points to dashboard (allow also possibly /change-password per PRD)
    location = response.headers.get("Location", "")
    assert location in ["/dashboard", "/change-password", "/"], f"Unexpected redirect Location: {location}"
    
    # Assert Set-Cookie header includes a JWT session cookie
    set_cookie = response.headers.get("Set-Cookie", "")
    assert "jwt=" in set_cookie or "JWT=" in set_cookie, "JWT session cookie not set in response headers"

test_post_login_with_valid_credentials()