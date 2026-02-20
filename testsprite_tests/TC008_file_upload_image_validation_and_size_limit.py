import requests
from requests.auth import HTTPBasicAuth
import io

BASE_URL = "http://localhost:3000"
UPLOAD_ENDPOINT = "/api/upload"
AUTH_CHECK_ENDPOINT = "/api/auth/check-session"
TIMEOUT = 30
USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"


def get_session_cookie():
    # This function assumes we can get a valid JWT cookie by authenticating with basic token.
    # The PRD doesn't define a login endpoint, but test requires auth cookie.
    # So we simulate authentication by calling check-session which requires cookie to verify.
    # For this test, we assume the user already has a valid session cookie or token.
    # In a real scenario, we'd implement login to retrieve cookie.
    # Here, we'll perform basic auth to get a cookie if possible or mock a cookie value.
    # Since no login endpoint given, we rely on basic auth header and check-session usage.

    # Try to call /api/auth/check-session with basic token auth (though API expects cookie)
    # If the API sets a cookie on basic auth, catch it; otherwise, we'll just simulate a cookie.
    # Given ambiguity, we'll call /api/auth/check-session without cookie to get 401, to know no cookie.
    # So to test upload with auth we must set 'sciencehub_session' cookie.
    # We'll mock cookie as follows:

    # Normally should be replaced with real login flow.
    # For testing, let's just return a dummy cookie string for sciencehub_session.
    # Without login details, we'll try to get session cookie by calling a dummy auth endpoint or
    # we'll raise an exception to note cookie must be set externally.
    raise RuntimeError("Authentication cookie 'sciencehub_session' must be obtained externally for this test.")


def test_file_upload_image_validation_and_size_limit():
    # Prepare auth: We use basic token for auth header to get the session cookie first.
    # Since the API requires a cookie 'sciencehub_session', but no login endpoint exists,
    # we simulate that the correct cookie is manually retrieved and set here.
    # We'll craft session_cookie manually for testing purpose or skip the check-session call.

    # For this test, we do the following steps:
    # 1. Define valid and invalid test files (in memory).
    # 2. Test unauthorized upload (no cookie) -> expect 401.
    # 3. Test upload valid image files (jpg, jpeg, png, gif, webp) under 5MB -> expect 200 + url.
    # 4. Test upload invalid image types (svg, html) -> expect 400.
    # 5. Test upload image larger than 5MB -> expect 400.

    # Authentication: use basic auth to get cookie if possible (not implemented)
    # So for test, manually set session cookie value.
    # Replace the below cookie value with valid value before running the test.
    session_cookie = None
    try:
        session_cookie = get_session_cookie()
    except RuntimeError:
        # For demonstration, use a placeholder valid cookie string.
        session_cookie = "valid_jwt_token_placeholder"

    headers = {
        "Cookie": f"sciencehub_session={session_cookie}",
    }

    def upload_file(file_bytes, filename, content_type, use_cookie=True):
        files = {
            "file": (filename, io.BytesIO(file_bytes), content_type),
        }
        req_headers = headers if use_cookie else {}
        response = requests.post(
            BASE_URL + UPLOAD_ENDPOINT,
            files=files,
            headers=req_headers,
            timeout=TIMEOUT,
        )
        return response

    # Prepare test files in bytes:

    # 1. Valid images with small content (few bytes, valid header to mimic file type)
    valid_images = {
        "test.jpg": (b"\xff\xd8\xff\xe0" + b"0" * 100, "image/jpeg"),
        "test.jpeg": (b"\xff\xd8\xff\xe1" + b"0" * 100, "image/jpeg"),
        "test.png": (b"\x89PNG\r\n\x1a\n" + b"0" * 100, "image/png"),
        "test.gif": (b"GIF89a" + b"0" * 100, "image/gif"),
        "test.webp": (b"RIFF" + b"0" * 100 + b"WEBP", "image/webp"),
    }

    # 2. Invalid types
    invalid_files = {
        "test.svg": (b"<svg><rect /></svg>", "image/svg+xml"),
        "test.html": (b"<html><body>hello</body></html>", "text/html"),
    }

    # 3. Large file (>5MB)
    large_file_size = 5 * 1024 * 1024 + 1  # 5MB + 1 byte
    large_file_bytes = b"\xff\xd8\xff\xe0" + b"0" * (large_file_size - 4)

    # Step 1: Unauthorized upload (no cookie)
    response = upload_file(valid_images["test.jpg"][0], "test.jpg", valid_images["test.jpg"][1], use_cookie=False)
    assert response.status_code == 401, f"Expected 401 Unauthorized but got {response.status_code}"
    try:
        err_json = response.json()
    except Exception:
        err_json = {}
    assert "Unauthorized" in response.text or err_json.get("error") or response.status_code == 401

    # Step 2: Valid image uploads
    for filename, (content, content_type) in valid_images.items():
        response = upload_file(content, filename, content_type, use_cookie=True)
        assert response.status_code == 200, f"Valid upload of {filename} failed: {response.status_code} {response.text}"
        try:
            json_resp = response.json()
        except Exception:
            assert False, f"Response is not JSON for valid upload of {filename}"
        assert isinstance(json_resp.get("url"), str) and json_resp["url"], f"Response missing url field for {filename}"

    # Step 3: Invalid file types upload (svg, html)
    for filename, (content, content_type) in invalid_files.items():
        response = upload_file(content, filename, content_type, use_cookie=True)
        assert response.status_code == 400, f"Invalid file type {filename} should be rejected with 400, got {response.status_code}"
        try:
            err_json = response.json()
        except Exception:
            err_json = {}
        assert (
            "No file" in response.text or
            "wrong type" in response.text.lower() or
            "too large" in response.text.lower() or
            err_json.get("error")
        ), f"Invalid file type {filename} error message missing or unexpected."

    # Step 4: Large file upload (>5MB)
    response = upload_file(large_file_bytes, "large.jpg", "image/jpeg", use_cookie=True)
    assert response.status_code == 400, f"Large file upload should be rejected with 400, got {response.status_code}"
    try:
        err_json = response.json()
    except Exception:
        err_json = {}
    assert (
        "too large" in response.text.lower() or
        "No file" in response.text or
        err_json.get("error")
    ), "Large file upload error message missing or unexpected."


test_file_upload_image_validation_and_size_limit()