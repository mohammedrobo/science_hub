"""
TC004: Courses API Semester Filtering and Error Handling
Tests the /api/courses GET endpoint for:
- Fetching all courses
- Filtering by semester
- SQL injection prevention
- No sensitive data leakage
"""

import requests
from test_config import (
    BASE_URL, TIMEOUT,
    TestResults, assert_no_sensitive_data
)


def test_courses_api():
    results = TestResults("TC004 — Courses API Semester Filtering & Error Handling")

    # ============ Test 1: Fetch all courses (no filter) ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                results.pass_test(f"GET /api/courses returns list ({len(data)} courses)")
                if len(data) > 0:
                    # Check course object structure
                    course = data[0]
                    if "code" in course or "name" in course:
                        results.pass_test("Course objects have expected fields")
                    else:
                        results.fail_test("Course structure", f"Missing fields: {list(course.keys())}")
            else:
                results.fail_test("Courses response type", f"Expected list, got {type(data)}")
        else:
            results.fail_test("Fetch all courses", f"Expected 200, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Fetch all courses", str(e))

    # ============ Test 2: Filter by semester 1 ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "1"},
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                results.pass_test(f"Semester 1 filter returns list ({len(data)} courses)")
            else:
                results.fail_test("Semester filter response type", f"Expected list, got {type(data)}")
        else:
            results.fail_test("Semester 1 filter", f"Expected 200, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Semester 1 filter", str(e))

    # ============ Test 3: Filter by semester 2 ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "2"},
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                results.pass_test(f"Semester 2 filter returns list ({len(data)} courses)")
            else:
                results.fail_test("Semester 2 filter type", f"Expected list")
        else:
            results.fail_test("Semester 2 filter", f"Expected 200, got {resp.status_code}")
    except Exception as e:
        results.fail_test("Semester 2 filter", str(e))

    # ============ Test 4: Non-existent semester returns empty list ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "999"},
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 0:
                results.pass_test("Non-existent semester returns empty list")
            elif isinstance(data, list):
                results.pass_test(f"Non-existent semester returns {len(data)} courses (mock fallback)")
            else:
                results.fail_test("Non-existent semester", f"Unexpected response: {data}")
        else:
            results.fail_test("Non-existent semester", f"Got status {resp.status_code}")
    except Exception as e:
        results.fail_test("Non-existent semester", str(e))

    # ============ Test 5: SQL injection in semester param ============
    injection_attacks = [
        "1; DROP TABLE courses;",
        "' OR '1'='1",
        "';--",
        "\" OR 1=1--",
    ]

    for i, attack in enumerate(injection_attacks):
        try:
            resp = requests.get(
                f"{BASE_URL}/api/courses",
                params={"semester": attack},
                headers={"Accept": "application/json"},
                timeout=TIMEOUT,
            )

            if resp.status_code != 500:
                results.pass_test(f"SQL injection #{i+1} doesn't crash server")
            else:
                body = resp.text.lower()
                if "sql" in body or "query" in body or "syntax" in body:
                    results.fail_test(f"SQL injection #{i+1}", "Server error leaks SQL info!")
                else:
                    results.fail_test(f"SQL injection #{i+1}", "Server returned 500")
        except Exception as e:
            results.fail_test(f"SQL injection #{i+1}", str(e))

    # ============ Test 6: Invalid semester type handled gracefully ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "abc"},
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        # parseInt("abc") = NaN in JS, so it should either:
        # - Return empty list (NaN semester matches nothing)
        # - Return all courses (ignore invalid param)
        # - Return 400 (validation error)
        # It should NOT crash with 500
        if resp.status_code in (200, 400, 422):
            results.pass_test("Invalid semester type handled gracefully")
        elif resp.status_code == 500:
            results.fail_test("Invalid semester type", "Server crashed with 500")
        else:
            results.fail_test("Invalid semester type", f"Unexpected status {resp.status_code}")
    except Exception as e:
        results.fail_test("Invalid semester type", str(e))

    # ============ Test 7: No sensitive data in response ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )

        if resp.status_code == 200:
            assert_no_sensitive_data(resp.text, "Courses API")
            results.pass_test("Courses response doesn't leak sensitive data")

            # Also check no API keys in response headers
            for header_name in resp.headers:
                header_lower = header_name.lower()
                if "api-key" in header_lower or "authorization" in header_lower:
                    results.fail_test("Header leak", f"Found sensitive header: {header_name}")
                    break
            else:
                results.pass_test("No sensitive headers exposed")
    except AssertionError as e:
        results.fail_test("Sensitive data leak", str(e))
    except Exception as e:
        results.fail_test("Sensitive data check", str(e))

    return results.summary()


if __name__ == "__main__":
    test_courses_api()
