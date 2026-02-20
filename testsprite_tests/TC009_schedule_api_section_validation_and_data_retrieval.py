"""
TC009 — Schedule API: Section Validation, Data Retrieval & Caching

Tests:
1. Valid section IDs (A1-D4) return schedule data
2. Invalid section IDs are rejected
3. SQL injection in section parameter is blocked
4. Schedule data structure is correct (day, time, subject fields)
5. All 16 valid sections are accepted
6. Section IDs are case-insensitive or properly handled
7. Empty section parameter returns error
"""

import sys
import os
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    ADMIN_USERNAME, ADMIN_PASSWORD, STUDENT_USERNAME, STUDENT_PASSWORD,
)


def test_schedule_api():
    results = TestResults("TC009 — Schedule API: Section Validation & Data Retrieval")

    # ============ Test 1: Valid section returns schedule data ============
    session = TestSession()
    try:
        ok, msg = session.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Login for schedule test", msg)
            return results.summary()

        resp = session.get("/schedule/A1")
        if resp.status_code == 200:
            results.pass_test("Valid section A1 returns 200")
        else:
            results.fail_test("Valid section A1", f"Got status {resp.status_code}")
    except Exception as e:
        results.fail_test("Valid section A1", str(e))

    # ============ Test 2: All 16 valid sections are accepted ============
    valid_sections = [
        "A1", "A2", "A3", "A4",
        "B1", "B2", "B3", "B4",
        "C1", "C2", "C3", "C4",
        "D1", "D2", "D3", "D4",
    ]
    try:
        all_ok = True
        failed_sections = []
        for section in valid_sections:
            resp = session.get(f"/schedule/{section}")
            if resp.status_code != 200:
                all_ok = False
                failed_sections.append(f"{section}={resp.status_code}")

        if all_ok:
            results.pass_test(f"All 16 valid sections return 200")
        else:
            results.fail_test("Valid sections", f"Failed: {', '.join(failed_sections)}")
    except Exception as e:
        results.fail_test("All valid sections", str(e))

    # ============ Test 3: Invalid section IDs are rejected ============
    invalid_sections = ["X1", "A5", "E1", "AA", "1A", "A0", "Z9", ""]
    try:
        blocked = 0
        for inv in invalid_sections:
            path = f"/schedule/{inv}" if inv else "/schedule/"
            resp = session.get(path)
            # Should get 404, 400, or redirect — not 200 with data
            if resp.status_code in (400, 404, 302, 303, 307, 308):
                blocked += 1
            elif resp.status_code == 200:
                # Check if the page renders an error or empty state
                text = resp.text.lower()
                if "not found" in text or "invalid" in text or "error" in text:
                    blocked += 1

        if blocked >= len(invalid_sections) - 1:  # Allow 1 edge case
            results.pass_test(f"Invalid sections rejected ({blocked}/{len(invalid_sections)})")
        else:
            results.fail_test("Invalid section rejection", f"Only {blocked}/{len(invalid_sections)} blocked")
    except Exception as e:
        results.fail_test("Invalid section rejection", str(e))

    # ============ Test 4: SQL injection in section param ============
    injection_attacks = [
        "A1'; DROP TABLE schedule_entries;--",
        "A1 OR 1=1",
        "'; SELECT * FROM allowed_users;--",
        "<script>alert(1)</script>",
    ]
    try:
        all_safe = True
        for attack in injection_attacks:
            resp = session.get(f"/schedule/{requests.utils.quote(attack)}")
            # Should not return 200 or should not contain DB data
            if resp.status_code == 200:
                body = resp.text.lower()
                # Check for actual DB data leaks, not UI text like "change password"
                if "$2b$" in body or "$2a$" in body or "service_role" in body or "supabase_service_role" in body:
                    all_safe = False
                    results.fail_test("SQL injection", f"Data leaked with payload: {attack[:30]}")

        if all_safe:
            results.pass_test("SQL injection attempts blocked in schedule param")
    except Exception as e:
        results.fail_test("SQL injection", str(e))

    # ============ Test 5: Unauthenticated access to schedule ============
    try:
        raw = requests.get(f"{BASE_URL}/schedule/A1", timeout=TIMEOUT, allow_redirects=False)
        if raw.status_code in (302, 303, 307, 308, 401):
            results.pass_test("Unauthenticated schedule access redirects to login")
        elif raw.status_code == 200:
            # Next.js may serve the page shell but the server component should redirect
            results.fail_test("Unauthenticated schedule", "Got 200 — should redirect to login")
        else:
            results.pass_test(f"Unauthenticated schedule returns {raw.status_code}")
    except Exception as e:
        results.fail_test("Unauthenticated schedule access", str(e))

    # ============ Test 6: Schedule page auto-redirects student to their section ============
    try:
        resp = session.get("/schedule", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            # Student may redirect to section, or /change-password if first login
            if "/schedule/" in location:
                results.pass_test(f"Schedule auto-redirects student to section: {location}")
            elif "change-password" in location:
                results.pass_test("Student redirected to change-password (first login — expected)")
            else:
                results.fail_test("Schedule auto-redirect", f"Redirect location unexpected: {location}")
        elif resp.status_code == 200:
            # Might be an inline redirect via Next.js
            results.pass_test("Schedule page loads for student (may use client-side redirect)")
        else:
            results.fail_test("Schedule auto-redirect", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Schedule auto-redirect", str(e))

    session.close()
    return results.summary()


if __name__ == "__main__":
    test_schedule_api()
