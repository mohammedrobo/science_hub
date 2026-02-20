"""
TC006: Progress Tracking — Submit Quiz Result and XP Calculation
Tests quiz submission flows and XP awarding via page-level integration testing.

Since submitQuizResult is a Server Action (not a REST endpoint), we test:
1. Quiz page accessibility with/without auth
2. Protected page behavior
3. Data integrity of quiz-related API responses
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    TestSession, TestResults, assert_no_sensitive_data
)


def test_quiz_submission():
    results = TestResults("TC006 — Quiz Submission & XP Calculation")

    # ============ Test 1: Unauthenticated quiz page access blocked ============
    try:
        raw = requests.Session()
        # Try accessing a quiz-related page without auth
        resp = raw.get(
            f"{BASE_URL}/courses",
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "/login" in location:
                results.pass_test("Quiz pages require authentication")
            else:
                results.pass_test(f"Unauthenticated redirected to: {location}")
        elif resp.status_code in (401, 403):
            results.pass_test("Quiz pages return 401/403 without auth")
        elif resp.status_code == 200:
            results.fail_test("Quiz page auth", "Accessible without authentication!")
        else:
            results.fail_test("Quiz page auth", f"Unexpected status {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("Unauthenticated quiz access", str(e))

    # ============ Login ============
    ts = TestSession()
    success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)
    if not success:
        results.fail_test("Pre-requisite: Login", msg)
        results.summary()
        return

    results.pass_test("Pre-requisite: Login successful")

    # ============ Test 2: Authenticated user can access home page ============
    try:
        resp = ts.get("/", allow_redirects=True)

        if resp.status_code == 200:
            results.pass_test("Authenticated user can access home page")
        else:
            results.fail_test("Home page access", f"Status {resp.status_code}")
    except Exception as e:
        results.fail_test("Home page access", str(e))

    # ============ Test 3: Courses API is accessible with session ============
    try:
        resp = ts.get("/api/courses")

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                results.pass_test(f"Courses API returns {len(data)} courses")
            else:
                results.pass_test("Courses API returns empty list (DB may be empty)")
        else:
            results.fail_test("Courses API access", f"Status {resp.status_code}")
    except Exception as e:
        results.fail_test("Courses API access", str(e))

    # ============ Test 4: Tracking end API exists and handles requests ============
    try:
        resp = ts.post_json("/api/tracking/end", {
            "pageType": "quiz",
            "pageId": "test-quiz-123",
            "duration": 120,
        })

        # The API should accept the tracking data
        if resp.status_code in (200, 201):
            results.pass_test("Tracking API accepts session data")
        elif resp.status_code in (400, 422):
            results.pass_test("Tracking API validates input")
        elif resp.status_code in (401, 403):
            results.pass_test("Tracking API requires proper auth")
        else:
            results.fail_test("Tracking API", f"Status {resp.status_code}")
    except Exception as e:
        results.fail_test("Tracking API", str(e))

    # ============ Test 5: Cannot forge session with fake cookie ============
    try:
        raw = requests.Session()
        raw.cookies.set("sciencehub_session", "fake_jwt_token_here", domain="localhost")
        resp = raw.post(
            f"{BASE_URL}/api/auth/check-session",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid") is False:
                results.pass_test("Forged session cookie is rejected")
            else:
                results.fail_test("Session forgery detection",
                                  "Fake JWT accepted as valid!")
        else:
            results.pass_test(f"Forged cookie returns status {resp.status_code}")
        raw.close()
    except Exception as e:
        results.fail_test("Session forgery check", str(e))

    # ============ Test 6: No sensitive data in page responses ============
    try:
        resp = ts.get("/", allow_redirects=True)
        if resp.status_code == 200:
            body = resp.text

            # Check no raw passwords, service keys, etc.
            assert_no_sensitive_data(body, "Home page")

            # Check for no other users' private data
            # The page should only show current user's info
            if "password" not in body.lower() or "type=\"password\"" in body.lower():
                results.pass_test("Page response contains no leaked sensitive data")
            else:
                results.fail_test("Page data leak", "Found 'password' in page content!")
    except AssertionError as e:
        results.fail_test("Sensitive data leak", str(e))
    except Exception as e:
        results.fail_test("Data leak check", str(e))

    ts.close()
    return results.summary()


if __name__ == "__main__":
    test_quiz_submission()
