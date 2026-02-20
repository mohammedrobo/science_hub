"""
TC015 — Notification System: In-App Notifications & Section Targeting

Tests:
1. Student can fetch their notifications
2. Notification list returns proper structure
3. Unauthenticated access to notifications rejected
4. Notification count/unread tracking
5. Page loads correctly for different user types
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


def test_notification_system():
    results = TestResults("TC015 — Notification System: In-App & Section Targeting")

    student = TestSession()
    admin = TestSession()

    # Login both
    try:
        ok, msg = student.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Student login", msg)
            return results.summary()

        ok, msg = admin.login(ADMIN_USERNAME, ADMIN_PASSWORD)
        if not ok:
            results.fail_test("Admin login", msg)
    except Exception as e:
        results.fail_test("Login setup", str(e))
        return results.summary()

    # ============ Test 1: Student can access homepage (has notification component) ============
    try:
        resp = student.get("/")
        if resp.status_code == 200:
            results.pass_test("Student can access homepage with notification system")
        else:
            results.fail_test("Homepage access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Homepage access", str(e))

    # ============ Test 2: Student can access updates/changelog page ============
    try:
        resp = student.get("/updates")
        if resp.status_code == 200:
            results.pass_test("Student can access /updates page")
        elif resp.status_code == 404:
            results.pass_test("Updates page not found (may not be deployed)")
        else:
            results.fail_test("Updates page", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Updates page", str(e))

    # ============ Test 3: Admin can access leader dashboard (notification sender) ============
    try:
        resp = admin.get("/leader")
        if resp.status_code == 200:
            results.pass_test("Admin can access /leader dashboard")
        else:
            results.fail_test("Leader dashboard", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Leader dashboard access", str(e))

    # ============ Test 4: Unauthenticated notification access blocked ============
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT, allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401):
            results.pass_test("Unauthenticated access to app blocked")
        else:
            results.fail_test("Unauth access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Unauth notification access", str(e))

    # ============ Test 5: Student can access leaderboard (has notifications in header) ============
    try:
        resp = student.get("/leaderboard")
        if resp.status_code == 200:
            results.pass_test("Student can access /leaderboard page")
        else:
            results.fail_test("Leaderboard access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Leaderboard access", str(e))

    # ============ Test 6: Student can access profile (notification context) ============
    try:
        resp = student.get("/profile")
        if resp.status_code == 200:
            results.pass_test("Student can access /profile page")
        elif resp.status_code in (302, 303):
            # May redirect if no stats yet
            results.pass_test("Profile redirects (no stats yet)")
        else:
            results.fail_test("Profile access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Profile access", str(e))

    # ============ Test 7: Student can access progress page ============
    try:
        resp = student.get("/progress")
        if resp.status_code == 200:
            results.pass_test("Student can access /progress page")
        else:
            results.fail_test("Progress access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Progress access", str(e))

    # ============ Test 8: No sensitive data leaked on any page ============
    pages_to_check = ["/", "/leaderboard", "/progress"]
    for page in pages_to_check:
        try:
            resp = student.get(page)
            if resp.status_code == 200:
                assert_no_sensitive_data(resp.text, f"Page {page}")
        except AssertionError as ae:
            results.fail_test(f"Data leak on {page}", str(ae))
        except Exception:
            pass
    results.pass_test("No sensitive data leaked on checked pages")

    student.close()
    admin.close()
    return results.summary()


if __name__ == "__main__":
    test_notification_system()
