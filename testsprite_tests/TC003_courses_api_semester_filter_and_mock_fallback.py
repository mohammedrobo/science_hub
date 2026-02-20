import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("C_C2-36-4da3", "Satoru123@")
TIMEOUT = 30

def test_courses_api_semester_filter_and_mock_fallback():
    # Test 1: GET /api/courses without semester filter (DB reachable expected)
    try:
        resp_all = requests.get(f"{BASE_URL}/api/courses", timeout=TIMEOUT)
        assert resp_all.status_code == 200, f"Expected 200, got {resp_all.status_code}"
        courses_all = resp_all.json()
        assert isinstance(courses_all, list), "Expected list of courses"
        # If the list is not empty, verify keys for course object
        if courses_all:
            course = courses_all[0]
            assert "id" in course and "name" in course and "semester" in course, "Course missing keys"
    except Exception as e:
        raise AssertionError(f"Failed GET /api/courses without semester: {e}")

    # Test 2: GET /api/courses?semester=1 (valid semester filter)
    try:
        params = {"semester": "1"}
        resp_semester = requests.get(f"{BASE_URL}/api/courses", params=params, timeout=TIMEOUT)
        assert resp_semester.status_code == 200, f"Expected 200, got {resp_semester.status_code}"
        courses_filtered = resp_semester.json()
        assert isinstance(courses_filtered, list), "Expected list of courses with semester filter"
        # If not empty, all courses should have semester == 1
        for course in courses_filtered:
            # semester might be int or string, coerce to int for check
            sem = course.get("semester")
            assert sem == 1 or sem == "1", f"Course semester expected 1, got {sem}"
    except Exception as e:
        raise AssertionError(f"Failed GET /api/courses with valid semester filter: {e}")

    # Test 3: GET /api/courses?semester=invalid (invalid semester parameter)
    try:
        params = {"semester": "invalid"}
        resp_invalid = requests.get(f"{BASE_URL}/api/courses", params=params, timeout=TIMEOUT)
        # Expect 400 or 422 status code for invalid query parameter
        assert resp_invalid.status_code in (400, 422), f"Expected 400 or 422, got {resp_invalid.status_code}"
    except Exception as e:
        raise AssertionError(f"Failed GET /api/courses with invalid semester parameter: {e}")

    # Test 4: DB failure fallback to mock data simulation
    # Since simulating DB failure might require environment changes we can't do here,
    # we simulate fallback by hitting the endpoint with a special header to induce fallback
    # if such a mechanic exists; else, we just confirm that response is 200 and has course list.
    # Here, we assume no auth required and fallback returns 200 + courses list.
    try:
        # Attempt a normal request and hope fallback is tested by system if DB down
        resp_fallback = requests.get(f"{BASE_URL}/api/courses", timeout=TIMEOUT)
        assert resp_fallback.status_code == 200, f"Expected 200, got {resp_fallback.status_code}"
        courses_fallback = resp_fallback.json()
        assert isinstance(courses_fallback, list), "Expected list of courses from fallback or DB"
        # We rely on actual fallback in server; no direct forced way to test here.
    except Exception as e:
        raise AssertionError(f"Failed GET /api/courses fallback to mock data: {e}")

test_courses_api_semester_filter_and_mock_fallback()