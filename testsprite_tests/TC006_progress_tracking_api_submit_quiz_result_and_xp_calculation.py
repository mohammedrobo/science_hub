import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Example auth token - In real test, retrieve securely (e.g. login)
AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.exampletoken"

def test_submit_quiz_result_xp_calculation():
    url = f"{BASE_URL}/actions/submitQuizResult"
    headers = {
        "Authorization": AUTH_TOKEN,
        "Content-Type": "application/json"
    }

    # Valid payload for normal submission
    valid_payload = {
        "quizId": "quiz_test_123",
        "scorePercentage": 85.0
    }

    # Test success case: valid submission returns XP awarded and proper structure
    try:
        response = requests.post(url, headers=headers, json=valid_payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content_type = response.headers.get('Content-Type', '')
        assert 'application/json' in content_type, f"Expected JSON response, got {content_type}"
        data = response.json()

        # Validate expected keys (structure) and types in response
        assert isinstance(data, dict), "Response is not a JSON object"
        assert "xpAwarded" in data, "Response missing 'xpAwarded'"
        assert isinstance(data["xpAwarded"], int), "'xpAwarded' is not an integer"
        assert data["xpAwarded"] >= 0, "'xpAwarded' should be non-negative"

        # Additional response structure checks, if any expected fields:
        # e.g. "quizId" echoed back matches input
        assert "quizId" in data, "Response missing 'quizId'"
        assert data["quizId"] == valid_payload["quizId"], "Returned quizId mismatch"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError as e:
        assert False, f"Response is not valid JSON: {e}"

    # Test security: attempt authentication bypass with no Authorization header
    try:
        response_no_auth = requests.post(url, headers={"Content-Type": "application/json"}, json=valid_payload, timeout=TIMEOUT)
        # Expect 401 Unauthorized or 403 Forbidden
        assert response_no_auth.status_code in (401, 403), f"Expected 401 or 403 without auth, got {response_no_auth.status_code}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request without auth failed: {e}"

    # Test SQL Injection attempt in quizId field
    injection_payload = {
        "quizId": "quiz_test_123' OR '1'='1",
        "scorePercentage": 50.0
    }
    try:
        response_injection = requests.post(url, headers=headers, json=injection_payload, timeout=TIMEOUT)
        # The system must not execute injection, should respond either 400 or 200 with safe handling
        assert response_injection.status_code in (200, 400), \
            f"Unexpected status for injection attempt: {response_injection.status_code}"
        content_type = response_injection.headers.get('Content-Type', '')
        if response_injection.status_code == 200:
            assert 'application/json' in content_type, f"Expected JSON response for injection test, got {content_type}"
            data_injection = response_injection.json()
            assert "xpAwarded" in data_injection, "Injection response missing 'xpAwarded'"
            assert data_injection["xpAwarded"] >= 0, "Injection response has negative xpAwarded"
    except requests.exceptions.RequestException as e:
        assert False, f"Request injection test failed: {e}"
    except ValueError as e:
        assert False, f"Injection response is not valid JSON: {e}"

    # Test authorization flaw: try submitting quiz result for another user's quizId (simulate IDOR attempt)
    # For this test, we assume quizId contains user ownership info - simulate with a different quizId
    unauthorized_payload = {
        "quizId": "other_users_quiz_456",
        "scorePercentage": 75.0
    }
    try:
        response_unauth = requests.post(url, headers=headers, json=unauthorized_payload, timeout=TIMEOUT)
        # Server should reject authorization bypass attempts
        assert response_unauth.status_code in (401, 403, 400), f"Expected auth error, got {response_unauth.status_code}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request unauthorized access test failed: {e}"

    # Test session management: confirm Authorization header is mandatory, no API key exposure in response
    try:
        response_check = requests.post(url, headers=headers, json=valid_payload, timeout=TIMEOUT)
        resp_text = response_check.text.lower()
        # Make sure no api keys or tokens are exposed in response body
        assert "api_key" not in resp_text and "token" not in resp_text, "API key/token exposed in response body"
    except requests.exceptions.RequestException as e:
        assert False, f"Request session management test failed: {e}"


test_submit_quiz_result_xp_calculation()
