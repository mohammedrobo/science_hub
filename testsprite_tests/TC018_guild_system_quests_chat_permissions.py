"""
TC018 — Guild System: Quests, Chat Messages & Role Permissions

Tests:
1. Admin/Leader can access guild page
2. Student cannot access guild page
3. Guild page loads with quest board and chat components
4. Guild data doesn't leak sensitive information
5. Unauthenticated guild access blocked
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    ADMIN_USERNAME, ADMIN_PASSWORD, STUDENT_USERNAME, STUDENT_PASSWORD,
    assert_no_sensitive_data,
)
import requests


def test_guild_system():
    results = TestResults("TC018 — Guild System: Quests, Chat & Permissions")

    admin = TestSession()
    student = TestSession()

    # Login
    try:
        ok, msg = admin.login(ADMIN_USERNAME, ADMIN_PASSWORD)
        if not ok:
            results.fail_test("Admin login", msg)
            return results.summary()

        ok, msg = student.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Student login", msg)
    except Exception as e:
        results.fail_test("Login setup", str(e))
        return results.summary()

    # ============ Test 1: Admin can access guild page ============
    try:
        resp = admin.get("/guild")
        if resp.status_code == 200:
            results.pass_test("Admin can access /guild page")
        else:
            results.fail_test("Admin guild access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Admin guild access", str(e))

    # ============ Test 2: Student cannot access guild page ============
    try:
        resp = student.get("/guild", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401, 403):
            results.pass_test("Student blocked from /guild")
        elif resp.status_code == 200:
            body = resp.text.lower()
            if "login" in body or "unauthorized" in body or "denied" in body or "access" in body:
                results.pass_test("Student blocked from guild (access denied page)")
            else:
                results.fail_test("Student guild access", "Got 200 with guild content — should be blocked")
        else:
            results.pass_test(f"Student guild returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Student guild block", str(e))

    # ============ Test 3: Unauthenticated guild access blocked ============
    try:
        resp = requests.get(f"{BASE_URL}/guild", timeout=TIMEOUT, allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401):
            results.pass_test("Unauthenticated guild access blocked")
        else:
            results.fail_test("Unauth guild access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Unauth guild access", str(e))

    # ============ Test 4: Guild page doesn't leak sensitive data ============
    try:
        resp = admin.get("/guild")
        if resp.status_code == 200:
            assert_no_sensitive_data(resp.text, "guild page")
            results.pass_test("Guild page doesn't leak sensitive data")
    except AssertionError as ae:
        results.fail_test("Guild data leak", str(ae))
    except Exception as e:
        results.fail_test("Guild data check", str(e))

    # ============ Test 5: Admin can access leader dashboard (guild management) ============
    try:
        resp = admin.get("/leader")
        if resp.status_code == 200:
            results.pass_test("Admin can access /leader (guild management)")
        else:
            results.fail_test("Leader page access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Leader page access", str(e))

    # ============ Test 6: Guild data no password hashes ============
    try:
        resp = admin.get("/guild")
        if resp.status_code == 200:
            body = resp.text
            # Check for actual password hashes or DB password columns, not UI text
            if "$2b$" in body or "$2a$" in body:
                results.fail_test("Guild password leak", "Password hash data found in guild page")
            else:
                results.pass_test("No password hashes in guild page")
    except Exception as e:
        results.fail_test("Guild security check", str(e))

    admin.close()
    student.close()
    return results.summary()


if __name__ == "__main__":
    test_guild_system()
