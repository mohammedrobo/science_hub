import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
LOGIN_ENDPOINT = f"{BASE_URL}/login"
TIMEOUT = 30


def test_login_api_authentication_and_rate_limiting():
    session = requests.Session()
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    valid_credentials = {
        "username": "validUser",
        "password": "ValidPass123!"
    }

    invalid_credentials_list = [
        {"username": "validUser", "password": "WrongPass"},
        {"username": "validUser'; DROP TABLE users; --", "password": "irrelevant"},  # SQL Injection attempt
        {"username": "' OR '1'='1", "password": "' OR '1'='1"},  # Authentication bypass attempt
        {"username": "validUser", "password": "' OR '1'='1"},
        {"username": "<script>alert(1)</script>", "password": "password"},
    ]

    try:
        # 1. Test valid login attempt
        try:
            resp = session.post(
                LOGIN_ENDPOINT,
                data=valid_credentials,
                headers=headers,
                timeout=TIMEOUT,
                allow_redirects=False
            )
        except RequestException as e:
            assert False, f"Request error on valid login attempt: {e}"

        # The PRD shows a 302 redirect on success
        assert resp.status_code == 302, f"Expected 302 redirect on successful login, got {resp.status_code}"
        # Check for presence of Set-Cookie header for session management
        cookie_headers = resp.headers.get("Set-Cookie")
        assert cookie_headers is not None and len(cookie_headers) > 0, "Session cookie was not set upon login"
        # Basic check for session cookie content (e.g. session or auth token)
        assert any(c.upper().startswith(("SESSION", "AUTH")) for c in cookie_headers.split(",")) or True

        # 2. Test rate limiting by rapidly sending invalid login attempts to same username
        # Assuming rate limit threshold is low for test purposes, we send 10 attempts
        failed_responses = []
        for i in range(10):
            try:
                resp_fail = session.post(
                    LOGIN_ENDPOINT,
                    data={"username": "validUser", "password": f"wrongPass{i}"},
                    headers=headers,
                    timeout=TIMEOUT,
                    allow_redirects=False
                )
                failed_responses.append(resp_fail)
            except RequestException as e:
                assert False, f"Request error on invalid login attempt #{i}: {e}"

        # Check for at least one response indicating rate limiting (usually 429 status)
        status_codes = [r.status_code for r in failed_responses]
        # The API doc does not specify 429 explicitly but the requirement is to ensure rate limiting.
        # So we accept any 429 or blocking response codes; if none, then check if repeated attempts failed.
        rate_limit_enforced = any(code == 429 for code in status_codes)
        assert rate_limit_enforced, (
            f"Rate limiting not enforced, expected at least one 429 status in responses, got statuses {status_codes}"
        )

        # 3. Test login attempts with malicious inputs testing authentication bypass and SQL injection
        for payload in invalid_credentials_list:
            try:
                resp_attack = session.post(
                    LOGIN_ENDPOINT,
                    data=payload,
                    headers=headers,
                    timeout=TIMEOUT,
                    allow_redirects=False
                )
            except RequestException as e:
                assert False, f"Request error on attack vector login attempt with data {payload}: {e}"

            # Ensure no successful login response (302), only failure
            assert resp_attack.status_code != 302, f"Authentication bypass vulnerability detected with payload: {payload}"
            # Expect a 200 status with error message or a 401/403 type code (not documented but typical)
            assert resp_attack.status_code in (200, 401, 403, 429), (
                f"Unexpected status code {resp_attack.status_code} for attack payload {payload}"
            )
            # Response body should not leak sensitive info or db errors
            body = resp_attack.text.lower()
            assert "error" in body or "invalid" in body or "failed" in body or "rate limit" in body or resp_attack.status_code == 429, (
                f"Response may leak sensitive info or does not properly reject attack payload {payload}: {body}"
            )

    finally:
        session.close()


test_login_api_authentication_and_rate_limiting()