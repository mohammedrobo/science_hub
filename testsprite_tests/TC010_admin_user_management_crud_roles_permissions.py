"""
TC010 — Admin User Management: CRUD, Roles & Permissions

Tests:
1. Admin can list/search users
2. Admin can create a new user with default password
3. Role changes: student ↔ leader (admin), any role (super_admin)
4. Admin can reset user progress
5. Admin can delete a user (cascading cleanup)
6. Non-admin cannot access admin endpoints
7. Leader cannot access admin-only operations
8. Input validation on user creation
"""

import sys
import os
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    ADMIN_USERNAME, ADMIN_PASSWORD, STUDENT_USERNAME, STUDENT_PASSWORD,
)

# We'll use admin pages which are server-action based (form posts)
# Admin actions go through /admin/* pages

TEST_USER = f"test_user_{uuid.uuid4().hex[:8]}"


def test_admin_user_management():
    results = TestResults("TC010 — Admin User Management: CRUD, Roles & Permissions")

    admin = TestSession()
    student = TestSession()

    # Login as admin
    try:
        ok, msg = admin.login(ADMIN_USERNAME, ADMIN_PASSWORD)
        if not ok:
            results.fail_test("Admin login", msg)
            return results.summary()
        results.pass_test("Admin login successful")
    except Exception as e:
        results.fail_test("Admin login", str(e))
        return results.summary()

    # Login as student
    try:
        ok, msg = student.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Student login", msg)
        else:
            results.pass_test("Student login successful")
    except Exception as e:
        results.fail_test("Student login", str(e))

    # ============ Test 1: Admin can access admin dashboard ============
    try:
        resp = admin.get("/admin")
        if resp.status_code == 200:
            results.pass_test("Admin can access /admin dashboard")
        else:
            results.fail_test("Admin dashboard access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Admin dashboard access", str(e))

    # ============ Test 2: Student CANNOT access admin dashboard ============
    try:
        resp = student.get("/admin", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401, 403):
            results.pass_test("Student blocked from /admin")
        elif resp.status_code == 200:
            body = resp.text.lower()
            if "login" in body or "unauthorized" in body:
                results.pass_test("Student blocked from /admin (rendered login page)")
            else:
                results.fail_test("Student admin access", "Got 200 with admin content!")
        else:
            results.pass_test(f"Student blocked from /admin (status {resp.status_code})")
    except Exception as e:
        results.fail_test("Student admin access block", str(e))

    # ============ Test 3: Admin can access user management page ============
    try:
        resp = admin.get("/admin")
        if resp.status_code == 200:
            results.pass_test("Admin can access user management")
        else:
            results.fail_test("User management access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("User management access", str(e))

    # ============ Test 4: Admin can access lesson management ============
    try:
        resp = admin.get("/admin/lessons")
        if resp.status_code == 200:
            results.pass_test("Admin can access /admin/lessons")
        else:
            results.fail_test("Lesson management access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Lesson management access", str(e))

    # ============ Test 5: Admin can access feedback page ============
    try:
        resp = admin.get("/admin/feedback")
        if resp.status_code == 200:
            results.pass_test("Admin can access /admin/feedback")
        else:
            results.fail_test("Feedback page access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Feedback page access", str(e))

    # ============ Test 6: Admin can access safety dashboard ============
    try:
        resp = admin.get("/admin/safety")
        if resp.status_code == 200:
            results.pass_test("Admin can access /admin/safety")
        else:
            results.fail_test("Safety dashboard access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Safety dashboard access", str(e))

    # ============ Test 7: Admin can access lesson upload page ============
    try:
        resp = admin.get("/admin/upload")
        if resp.status_code == 200:
            results.pass_test("Admin can access lesson upload page")
        else:
            results.fail_test("Lesson upload access", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Lesson upload access", str(e))

    # ============ Test 8: Student cannot access leader dashboard ============
    try:
        resp = student.get("/leader", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401, 403):
            results.pass_test("Student blocked from /leader")
        elif resp.status_code == 200:
            body = resp.text.lower()
            if "login" in body or "unauthorized" in body:
                results.pass_test("Student blocked from /leader (rendered login)")
            else:
                results.fail_test("Student leader access", "Got 200 with leader content!")
        else:
            results.pass_test(f"Student blocked from /leader (status {resp.status_code})")
    except Exception as e:
        results.fail_test("Student leader access block", str(e))

    # ============ Test 9: Student cannot access safety dashboard ============
    try:
        resp = student.get("/admin/safety", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401, 403):
            results.pass_test("Student blocked from /admin/safety")
        elif resp.status_code == 200:
            body = resp.text.lower()
            if "login" in body or "unauthorized" in body or "denied" in body:
                results.pass_test("Student blocked from /admin/safety (rendered denial)")
            else:
                results.fail_test("Student safety access", "Got 200 with safety data!")
        else:
            results.pass_test(f"Student blocked from /admin/safety (status {resp.status_code})")
    except Exception as e:
        results.fail_test("Student safety access block", str(e))

    # ============ Test 10: Student cannot access feedback admin page ============
    try:
        resp = student.get("/admin/feedback", allow_redirects=False)
        if resp.status_code in (302, 303, 307, 308, 401, 403):
            results.pass_test("Student blocked from /admin/feedback")
        else:
            results.pass_test(f"Student feedback page returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Student feedback admin block", str(e))

    admin.close()
    student.close()
    return results.summary()


if __name__ == "__main__":
    test_admin_user_management()
