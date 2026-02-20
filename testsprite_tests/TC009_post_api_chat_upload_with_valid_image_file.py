import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/login"
UPLOAD_URL = f"{BASE_URL}/api/chat/upload"

USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"
TIMEOUT = 30

def test_post_api_chat_upload_with_valid_image_file():
    session = requests.Session()
    try:
        # Step 1: Login to get session cookie with valid JWT
        login_data = {
            "username": USERNAME,
            "password": PASSWORD,
        }
        login_resp = session.post(LOGIN_URL, data=login_data, allow_redirects=False, timeout=TIMEOUT)
        assert login_resp.status_code in (200, 302), f"Expected 200 or 302 on login, got {login_resp.status_code}"

        if login_resp.status_code == 302:
            # Must have set-cookie for session JWT
            # Check that session has cookies
            assert session.cookies, "Login did not set session cookie"
        else:
            # 200 with error message as per PRD
            try:
                json_resp = login_resp.json()
            except Exception as e:
                assert False, f"Login response not JSON: {e}"
            assert "message" in json_resp, "Login failed without error message"
            # Fail test early since login failed
            assert False, f"Login failed with message: {json_resp['message']}"

        # Step 2: Prepare a valid image file <= 5MB (using a small in-memory PNG file)
        # Create a minimal 1x1 PNG binary
        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01"
            b"\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {
            "file": ("test.png", png_data, "image/png")
        }

        headers = {"Accept": "application/json"}

        # Step 3: POST to /api/chat/upload with the image and valid JWT cookie
        upload_resp = session.post(UPLOAD_URL, files=files, headers=headers, timeout=TIMEOUT)
        assert upload_resp.status_code == 200, f"Expected 200 OK on image upload, got {upload_resp.status_code}"

        json_resp = upload_resp.json()
        assert "url" in json_resp, "Response JSON does not contain 'url'"
        url = json_resp["url"]
        assert isinstance(url, str) and url.startswith("http"), f"Invalid URL in response: {url}"

    except RequestException as e:
        assert False, f"Request failed: {e}"
    finally:
        session.close()

test_post_api_chat_upload_with_valid_image_file()
