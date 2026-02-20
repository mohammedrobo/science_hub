import requests
from io import BytesIO

BASE_URL = "http://localhost:3000"
LOGIN_URL = f"{BASE_URL}/login"
UPLOAD_URL = f"{BASE_URL}/api/chat/upload"
TIMEOUT = 30

USERNAME = "C_C2-36-4da3"
PASSWORD = "gOJ1xWNujMuC"


def test_post_api_chat_upload_with_invalid_file():
    session = requests.Session()

    # Step 1: Login to get JWT cookie
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    login_resp = session.post(LOGIN_URL, data=login_data, timeout=TIMEOUT, allow_redirects=False)
    assert login_resp.status_code == 302, f"Login failed, expected 302 but got {login_resp.status_code}"
    assert 'Set-Cookie' in login_resp.headers, "Login did not set cookie"
    
    # Prepare an invalid file: either >5MB or non-image MIME type
    # Here we prepare a plain text file >5MB (6MB) to ensure invalid
    large_non_image_content = b"x" * (6 * 1024 * 1024)  # 6MB of 'x'
    file_tuple = ("test.txt", BytesIO(large_non_image_content), "text/plain")

    # Prepare multipart/form-data with invalid file
    files = {
        "file": file_tuple
    }

    # Step 2: POST to /api/chat/upload with invalid file and JWT cookie
    upload_resp = session.post(UPLOAD_URL, files=files, timeout=TIMEOUT)
    
    # Expected: 400 validation error
    assert upload_resp.status_code == 400, (
        f"Expected 400 for invalid file upload but got {upload_resp.status_code}, response: {upload_resp.text}"
    )


test_post_api_chat_upload_with_invalid_file()