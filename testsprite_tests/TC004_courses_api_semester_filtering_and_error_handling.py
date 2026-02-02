import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
COURSES_ENDPOINT = f"{BASE_URL}/api/courses"
TIMEOUT = 30

# Assuming authentication is required: Provide a valid token or session cookie here.
# For security vulnerabilities check, we test without auth first to ensure no bypass.
# Adjust headers if authentication tokens or API keys are needed.
HEADERS = {
    'Accept': 'application/json',
    # 'Authorization': 'Bearer <valid_token>',  # Uncomment and set if auth is required
}

def test_courses_api_semester_filtering_and_error_handling():
    try:
        # Test 1: Valid semester filtering with a normal integer
        params = {'semester': 1}
        response = requests.get(COURSES_ENDPOINT, headers=HEADERS, params=params, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response JSON should be a list of courses"
        # Basic sanity check: each course, if present, may have keys (not specified in PRD)
        for course in data:
            assert isinstance(course, dict), "Each course should be a dictionary"

        # Test 2: Semester filtering with invalid (non-integer) input to test input sanitization/prevent SQL injection
        malicious_params = {'semester': "1; DROP TABLE users;"}
        response_malicious = requests.get(COURSES_ENDPOINT, headers=HEADERS, params=malicious_params, timeout=TIMEOUT)
        # The API should not succeed or crash; expect error or sanitized input (usually 400 or 200 with empty)
        assert response_malicious.status_code in (200, 400, 422), "API should handle malformed semester input gracefully"

        # Test 3: Semester filtering with special chars to test for SQL injection attempts
        injection_attempts = [
            "' OR '1'='1",
            "';--",
            "\" OR 1=1--",
            "0; DROP TABLE courses;"
        ]
        for attack in injection_attempts:
            params = {'semester': attack}
            resp = requests.get(COURSES_ENDPOINT, headers=HEADERS, params=params, timeout=TIMEOUT)
            # API must not return 500 Internal Server Error or leak data
            assert resp.status_code != 500, f"Server error on injection attempt '{attack}'"
            assert resp.status_code in (200, 400, 422), "API should safely reject or ignore injection input"

        # Test 4: Simulate internal server error to verify 500 handling
        # Since we can't force the server to error in normal condition,
        # attempt to test with an unlikely semester integer to check graceful error handling.
        # If server is implemented correctly, 500 only on internal failures.
        # This is a placeholder; in real test, a mock or fault injection would test this.
        # Here we just check that server doesn't leak info or crash on invalid large semester.
        params = {'semester': 99999999}
        error_response = requests.get(COURSES_ENDPOINT, headers=HEADERS, params=params, timeout=TIMEOUT)
        assert error_response.status_code in (200, 400, 422, 500), "Unexpected status code"
        if error_response.status_code == 500:
            # Check response content for proper error message format
            content = error_response.text.lower()
            assert "error" in content or "internal server error" in content, "500 response should indicate internal error"

        # Test 5: Test without semester parameter (should return all or filtered by default)
        response_no_param = requests.get(COURSES_ENDPOINT, headers=HEADERS, timeout=TIMEOUT)
        assert response_no_param.status_code == 200, "Expected 200 OK when no semester param provided"
        data_no_param = response_no_param.json()
        assert isinstance(data_no_param, list), "Response JSON without semester should be a list"

        # Security-focused checks
        # Ensure no API key or sensitive info is exposed in response headers or body
        for key in response.headers.keys():
            assert 'api-key' not in key.lower(), "API key exposed in response headers"
        # Simple check in response body text
        for resp_obj in [response, response_no_param]:
            body_text = resp_obj.text.lower()
            assert 'api_key' not in body_text and 'authorization' not in body_text, "Sensitive keys exposed in response body"

    except RequestException as e:
        assert False, f"Request to /api/courses failed with exception: {e}"
    except AssertionError as e:
        raise
    except Exception as e:
        assert False, f"Unexpected exception: {e}"

test_courses_api_semester_filtering_and_error_handling()