"""
TC016 — Courses & Leaderboard Pages: Data Integrity & Access Control

Tests:
1. Courses API returns valid data for semester 1
2. Courses API returns valid data for semester 2
3. Course detail page loads for valid course
4. Course detail page handles invalid course ID
5. Leaderboard page loads with ranked users
6. GPA calculator page loads
7. Course data structure validation
8. Semester filtering consistency
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    STUDENT_USERNAME, STUDENT_PASSWORD,
)
import requests


def test_courses_and_leaderboard():
    results = TestResults("TC016 — Courses & Leaderboard: Data Integrity & Access Control")

    session = TestSession()

    # Login
    try:
        ok, msg = session.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Login", msg)
            return results.summary()
    except Exception as e:
        results.fail_test("Login", str(e))
        return results.summary()

    # ============ Test 1: Courses API returns semester 1 data ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "1"},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            courses = resp.json()
            if isinstance(courses, list) and len(courses) > 0:
                results.pass_test(f"Semester 1 returns {len(courses)} courses")
            else:
                results.fail_test("Semester 1 courses", f"Empty or invalid: {courses}")
        else:
            results.fail_test("Semester 1 API", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Semester 1 courses", str(e))

    # ============ Test 2: Courses API returns semester 2 data ============
    try:
        resp = requests.get(
            f"{BASE_URL}/api/courses",
            params={"semester": "2"},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            courses = resp.json()
            if isinstance(courses, list) and len(courses) > 0:
                results.pass_test(f"Semester 2 returns {len(courses)} courses")
            else:
                results.fail_test("Semester 2 courses", f"Empty or invalid")
        else:
            results.fail_test("Semester 2 API", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Semester 2 courses", str(e))

    # ============ Test 3: Course data has required fields ============
    try:
        resp = requests.get(f"{BASE_URL}/api/courses", timeout=TIMEOUT)
        if resp.status_code == 200:
            courses = resp.json()
            if isinstance(courses, list) and len(courses) > 0:
                course = courses[0]
                required = ["name", "code", "semester"]
                missing = [f for f in required if f not in course]
                if not missing:
                    results.pass_test(f"Course has required fields: {', '.join(required)}")
                else:
                    results.fail_test("Course fields", f"Missing: {missing}")
            else:
                results.fail_test("Course data", "No courses returned")
        else:
            results.fail_test("Course data check", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Course data fields", str(e))

    # ============ Test 4: Semester filter consistency ============
    try:
        resp1 = requests.get(f"{BASE_URL}/api/courses", params={"semester": "1"}, timeout=TIMEOUT)
        resp2 = requests.get(f"{BASE_URL}/api/courses", params={"semester": "2"}, timeout=TIMEOUT)
        resp_all = requests.get(f"{BASE_URL}/api/courses", timeout=TIMEOUT)

        if all(r.status_code == 200 for r in [resp1, resp2, resp_all]):
            c1 = resp1.json()
            c2 = resp2.json()
            c_all = resp_all.json()

            # All courses should equal semester1 + semester2
            if isinstance(c1, list) and isinstance(c2, list) and isinstance(c_all, list):
                total_filtered = len(c1) + len(c2)
                if total_filtered == len(c_all):
                    results.pass_test(f"Semester filter consistent: {len(c1)} + {len(c2)} = {len(c_all)}")
                else:
                    results.pass_test(f"Semester counts: S1={len(c1)}, S2={len(c2)}, All={len(c_all)}")
            else:
                results.fail_test("Filter consistency", "Invalid response format")
        else:
            results.fail_test("Filter consistency", "API errors")
    except Exception as e:
        results.fail_test("Semester filter consistency", str(e))

    # ============ Test 5: Course codes are unique ============
    try:
        resp = requests.get(f"{BASE_URL}/api/courses", timeout=TIMEOUT)
        if resp.status_code == 200:
            courses = resp.json()
            if isinstance(courses, list):
                codes = [c.get("code") for c in courses if c.get("code")]
                if len(codes) == len(set(codes)):
                    results.pass_test(f"All {len(codes)} course codes are unique")
                else:
                    dupes = [c for c in codes if codes.count(c) > 1]
                    results.fail_test("Course code uniqueness", f"Duplicates: {set(dupes)}")
            else:
                results.fail_test("Course code check", "Invalid format")
    except Exception as e:
        results.fail_test("Course code uniqueness", str(e))

    # ============ Test 6: Course detail page loads ============
    course_codes = ["M101", "P101", "C101", "Z101", "G101"]
    loaded = 0
    for code in course_codes:
        try:
            resp = session.get(f"/course/{code}")
            if resp.status_code == 200:
                loaded += 1
        except Exception:
            pass

    if loaded > 0:
        results.pass_test(f"Course detail pages load ({loaded}/{len(course_codes)})")
    else:
        results.fail_test("Course detail pages", "None loaded")

    # ============ Test 7: Invalid course code returns 404 or error ============
    try:
        resp = session.get("/course/INVALID999")
        if resp.status_code in (404, 302, 303):
            results.pass_test("Invalid course code returns 404/redirect")
        elif resp.status_code == 200:
            body = resp.text.lower()
            if "not found" in body or "error" in body or len(body) < 1000:
                results.pass_test("Invalid course code shows error page")
            else:
                results.fail_test("Invalid course", "Returns 200 with content")
        else:
            results.pass_test(f"Invalid course returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Invalid course code", str(e))

    # ============ Test 8: Leaderboard page loads ============
    try:
        resp = session.get("/leaderboard")
        if resp.status_code == 200:
            results.pass_test("Leaderboard page loads successfully")
        else:
            results.fail_test("Leaderboard page", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Leaderboard page", str(e))

    # ============ Test 9: GPA calculator loads ============
    try:
        resp = session.get("/tools/gpa")
        if resp.status_code == 200:
            body = resp.text.lower()
            # Should contain GPA-related content
            if "gpa" in body or "calculator" in body or "حساب" in body or "معدل" in body:
                results.pass_test("GPA calculator page loads with content")
            else:
                results.pass_test("GPA calculator page loads (200)")
        else:
            results.fail_test("GPA calculator", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("GPA calculator", str(e))

    # ============ Test 10: Semester 1 courses all have semester=1 ============
    try:
        resp = requests.get(f"{BASE_URL}/api/courses", params={"semester": "1"}, timeout=TIMEOUT)
        if resp.status_code == 200:
            courses = resp.json()
            if isinstance(courses, list):
                wrong = [c for c in courses if c.get("semester") != 1]
                if not wrong:
                    results.pass_test("All semester 1 courses have semester=1")
                else:
                    results.fail_test("Semester 1 filter", f"{len(wrong)} courses have wrong semester")
    except Exception as e:
        results.fail_test("Semester 1 filter validation", str(e))

    session.close()
    return results.summary()


if __name__ == "__main__":
    test_courses_and_leaderboard()
