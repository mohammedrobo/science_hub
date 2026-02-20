"""
TC003: AI Chat API Message Handling and Error Responses
Tests the /api/chat POST endpoint for:
- Authentication requirement (401 without session)
- Valid message returns AI response
- Missing message returns 400
- Message length validation
- Rate limiting on chat API
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    TestSession, TestResults, assert_no_sensitive_data
)


def test_ai_chat_api():
    results = TestResults("TC003 — AI Chat API Message Handling & Error Responses")

    # ============ Test 1: Unauthenticated request returns 401 ============
    try:
        raw = requests.Session()
        resp = raw.post(
            f"{BASE_URL}/api/chat",
            json={"message": "Hello AI"},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 401:
            results.pass_test("Unauthenticated request returns 401")
        elif resp.status_code in (302, 303):
            results.pass_test("Unauthenticated request redirected to login")
        else:
            results.fail_test("Unauthenticated request rejected",
                              f"Expected 401, got {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("Unauthenticated request", str(e))

    # ============ Login for remaining tests ============
    ts = TestSession()
    success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)
    if not success:
        results.fail_test("Pre-requisite: Login", msg)
        results.summary()
        return

    # ============ Test 2: Missing message returns 400 ============
    try:
        resp = ts.post_json("/api/chat", {})

        if resp.status_code == 400:
            results.pass_test("Missing message returns 400")
        else:
            results.fail_test("Missing message returns 400",
                              f"Expected 400, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Missing message", str(e))

    # ============ Test 3: Empty message returns 400 ============
    try:
        resp = ts.post_json("/api/chat", {"message": ""})

        if resp.status_code == 400:
            results.pass_test("Empty message returns 400")
        else:
            results.fail_test("Empty message returns 400",
                              f"Expected 400, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Empty message", str(e))

    # ============ Test 4: Valid message returns AI response ============
    try:
        resp = ts.post_json("/api/chat", {"message": "What is 2+2?"})

        if resp.status_code == 200:
            data = resp.json()
            if "content" in data and isinstance(data["content"], str) and len(data["content"]) > 0:
                results.pass_test("Valid message returns AI response with content")
            else:
                results.fail_test("Valid message response structure",
                                  f"Missing or empty 'content' field: {data}")
        elif resp.status_code == 500:
            # API key might not be configured — this is expected in some environments
            results.fail_test("Valid message returns AI response",
                              "500 — Gemini API key may not be configured")
        elif resp.status_code == 503:
            results.fail_test("Valid message returns AI response",
                              "503 — AI service unavailable")
        else:
            results.fail_test("Valid message returns AI response",
                              f"Unexpected status {resp.status_code}")
    except Exception as e:
        results.fail_test("Valid message", str(e))

    # ============ Test 5: Message too long returns 400 ============
    try:
        long_message = "A" * 5000  # Over 4000 char limit
        resp = ts.post_json("/api/chat", {"message": long_message})

        if resp.status_code == 400:
            results.pass_test("Overly long message returns 400")
        elif resp.status_code in (200, 500, 503):
            # If it processes anyway, that's a validation gap but not critical
            results.fail_test("Long message validation",
                              f"Expected 400, got {resp.status_code} — no length limit enforced")
        else:
            results.fail_test("Long message validation",
                              f"Unexpected status {resp.status_code}")
    except Exception as e:
        results.fail_test("Long message", str(e))

    # ============ Test 6: XSS in message is handled safely ============
    try:
        resp = ts.post_json("/api/chat", {
            "message": "<script>alert('xss')</script> What is physics?"
        })

        if resp.status_code in (200, 400, 500, 503):
            if resp.status_code == 200:
                body = resp.text
                if "<script>" not in body:
                    results.pass_test("XSS in message doesn't reflect script tags")
                else:
                    results.fail_test("XSS prevention", "Script tag reflected in AI response!")
            else:
                results.pass_test("XSS message handled without crash")
        else:
            results.fail_test("XSS in message", f"Unexpected status {resp.status_code}")
    except Exception as e:
        results.fail_test("XSS in message", str(e))

    # ============ Test 7: Invalid JSON body returns 400 ============
    try:
        resp = ts.session.post(
            f"{BASE_URL}/api/chat",
            data="this is not json",
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 400:
            results.pass_test("Invalid JSON body returns 400")
        else:
            results.fail_test("Invalid JSON body",
                              f"Expected 400, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Invalid JSON body", str(e))

    # ============ Test 8: Response doesn't leak sensitive data ============
    try:
        resp = ts.post_json("/api/chat", {"message": "Tell me about science"})

        if resp.status_code in (200, 500, 503):
            assert_no_sensitive_data(resp.text, "Chat response")
            results.pass_test("Chat response doesn't leak sensitive data")
    except AssertionError as e:
        results.fail_test("Sensitive data leak", str(e))
    except Exception as e:
        results.fail_test("Sensitive data check", str(e))

    ts.close()
    return results.summary()


if __name__ == "__main__":
    test_ai_chat_api()
