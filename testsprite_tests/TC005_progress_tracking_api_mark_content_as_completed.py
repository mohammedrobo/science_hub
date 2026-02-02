import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Assume authentication via API token
API_TOKEN = "your_secure_api_token_here"
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def test_mark_content_as_completed():
    """Test marking lessons or quizzes as completed with validation and XP rewards, 
    focusing on security: authentication, authorization, input validation, and no IDOR."""
    session = requests.Session()
    session.headers.update(HEADERS)

    def post_mark_content(payload):
        try:
            response = session.post(
                f"{BASE_URL}/actions/markContentAsCompleted",
                json=payload,
                timeout=TIMEOUT
            )
            return response
        except RequestException as e:
            assert False, f"Request failed: {e}"

    # 1. Valid request with lesson content type
    valid_content = {
        "contentId": "lesson-123abc",
        "contentType": "lesson",
        "xp": 50
    }
    response = post_mark_content(valid_content)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    # 2. Valid request with quiz content type
    valid_quiz_content = {
        "contentId": "quiz-789xyz",
        "contentType": "quiz",
        "xp": 30
    }
    response = post_mark_content(valid_quiz_content)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    # 3. Missing contentId should be rejected (test input validation)
    invalid_no_contentId = {
        "contentType": "lesson",
        "xp": 10
    }
    response = post_mark_content(invalid_no_contentId)
    # Assuming server returns 400 on validation failure
    assert response.status_code in (400, 422), f"Expected client error for missing contentId, got {response.status_code}"

    # 4. Invalid contentType should be rejected
    invalid_contentType = {
        "contentId": "invalid-001",
        "contentType": "video",  # Not in enum
        "xp": 20
    }
    response = post_mark_content(invalid_contentType)
    assert response.status_code in (400, 422), f"Expected client error for invalid contentType, got {response.status_code}"

    # 5. SQL Injection attempt in contentId
    sql_injection_payload = {
        "contentId": "'; DROP TABLE users; --",
        "contentType": "lesson",
        "xp": 10
    }
    response = post_mark_content(sql_injection_payload)
    # Server should sanitize input and not execute injection; respond with error or safely handle
    assert response.status_code in (400, 422, 200), f"Unexpected status for SQL injection attempt: {response.status_code}"

    # 6. Authorization check - contentId manipulated to another user's content
    # Assuming contentId includes user ownership info or the system checks ownership
    unauthorized_payload = {
        "contentId": "lesson-owned-by-other-user",
        "contentType": "lesson",
        "xp": 10
    }
    response = post_mark_content(unauthorized_payload)
    # Should reject or deny access with 403 Forbidden or 401 Unauthorized
    assert response.status_code in (401, 403), f"Expected authorization failure, got {response.status_code}"

    # 7. Authentication bypass test - no auth header
    unauth_session = requests.Session()
    payload = {
        "contentId": "lesson-123abc",
        "contentType": "lesson",
        "xp": 10
    }
    try:
        resp = unauth_session.post(f"{BASE_URL}/actions/markContentAsCompleted", json=payload, timeout=TIMEOUT)
    except RequestException as e:
        assert False, f"Unauthenticated request failed unexpectedly: {e}"
    else:
        assert resp.status_code in (401, 403), f"Unauthenticated request must be rejected, got {resp.status_code}"


test_mark_content_as_completed()
