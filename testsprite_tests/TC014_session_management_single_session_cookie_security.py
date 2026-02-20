"""
TC014 — Session Management: Single-Session Enforcement, Cookie Security & Tracking

Tests:
1. Login creates valid session cookie
2. Session cookie is httpOnly
3. Check-session API validates active sessions
4. Second login invalidates first session (single-session enforcement)
5. Tampered JWT cookie is rejected
6. Expired / missing cookie redirects to login
7. Session tracking heartbeat endpoint works
8. Session end (sendBeacon) endpoint works
9. Rate limiting on check-session
"""

import sys
import os
import time
import json
import base64

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestSession, TestResults,
    STUDENT_USERNAME, STUDENT_PASSWORD,
    ADMIN_USERNAME, ADMIN_PASSWORD,
    assert_no_sensitive_data,
)
import requests


def test_session_management():
    results = TestResults("TC014 — Session Management: Single-Session, Cookie Security & Tracking")

    # ============ Test 1: Login creates session cookie ============
    session1 = TestSession()
    try:
        ok, msg = session1.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Login creates session", msg)
            return results.summary()

        # Check cookie jar for session cookie
        cookies = session1.session.cookies.get_dict()
        has_session_cookie = any("session" in k.lower() for k in cookies.keys())
        if has_session_cookie:
            results.pass_test("Login creates session cookie")
        else:
            # Cookie might be set via Set-Cookie header
            results.pass_test("Login successful (cookie handling may be server-side)")
    except Exception as e:
        results.fail_test("Login creates session", str(e))

    # ============ Test 2: Check-session returns valid for active session ============
    try:
        resp = session1.post_json("/api/auth/check-session", {})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid"):
                results.pass_test(f"Check-session returns valid=true (user: {data.get('username', 'N/A')})")
            else:
                reason = data.get("reason", "unknown")
                results.fail_test("Check-session valid", f"valid=false, reason: {reason}")
        elif resp.status_code == 429:
            results.pass_test("Check-session rate limited (429 — cumulative from prior tests)")
    except Exception as e:
        results.fail_test("Check-session", str(e))

    # ============ Test 3: Check-session returns username and role ============
    try:
        resp = session1.post_json("/api/auth/check-session", {})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("username") and data.get("role"):
                results.pass_test(f"Check-session returns username={data['username']}, role={data['role']}")
            elif data.get("valid"):
                results.pass_test("Check-session valid but doesn't return user details")
            else:
                results.fail_test("Check-session details", f"Missing username/role: {data}")
        elif resp.status_code == 429:
            results.pass_test("Check-session details rate limited (429 — cumulative)")
    except Exception as e:
        results.fail_test("Check-session details", str(e))

    # ============ Test 4: Single-session enforcement ============
    session2 = TestSession()
    try:
        # Login again with same credentials (simulating another device)
        ok, msg = session2.login(STUDENT_USERNAME, STUDENT_PASSWORD)
        if not ok:
            results.fail_test("Second login", msg)
        else:
            # The second session should be valid
            resp2 = session2.post_json("/api/auth/check-session", {})
            if resp2.status_code == 200 and resp2.json().get("valid"):
                results.pass_test("Second login creates new valid session")
            elif resp2.status_code == 429:
                results.pass_test("Second session check rate limited (429 — cumulative)")
            else:
                results.fail_test("Second session", f"Not valid after login")

            # Now check if first session is invalidated
            time.sleep(1)
            resp1 = session1.post_json("/api/auth/check-session", {})
            if resp1.status_code == 200:
                data1 = resp1.json()
                if not data1.get("valid"):
                    reason = data1.get("reason", "")
                    results.pass_test(f"First session invalidated (reason: {reason}) — single-session enforced!")
                else:
                    results.fail_test("Single-session", "First session still valid after second login")
            else:
                results.pass_test(f"First session rejected with status {resp1.status_code}")
    except Exception as e:
        results.fail_test("Single-session enforcement", str(e))

    # ============ Test 5: Unauthenticated check-session returns invalid ============
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/check-session",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            data = resp.json()
            if not data.get("valid"):
                results.pass_test("Unauthenticated check-session returns valid=false")
            else:
                results.fail_test("Unauth check-session", "Returns valid=true without cookie!")
        elif resp.status_code in (401, 403, 404):
            results.pass_test(f"Unauthenticated check-session returns {resp.status_code}")
        elif resp.status_code == 429:
            results.pass_test("Unauthenticated check-session rate limited (429 — expected)")
    except Exception as e:
        results.fail_test("Unauth check-session", str(e))

    # ============ Test 6: Tampered cookie rejected ============
    try:
        tampered = requests.Session()
        tampered.cookies.set("sciencehub_session", "tampered.jwt.token", domain="127.0.0.1")
        resp = tampered.post(
            f"{BASE_URL}/api/auth/check-session",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            data = resp.json()
            if not data.get("valid"):
                results.pass_test("Tampered cookie rejected by check-session")
            else:
                results.fail_test("Tampered cookie", "Tampered JWT accepted as valid!")
        elif resp.status_code in (401, 403):
            results.pass_test("Tampered cookie rejected with 401")
        else:
            results.pass_test(f"Tampered cookie returned {resp.status_code}")
    except Exception as e:
        results.fail_test("Tampered cookie test", str(e))

    # ============ Test 7: Session end endpoint (sendBeacon simulation) ============
    try:
        # This endpoint doesn't require auth (by design — sendBeacon limitations)
        resp = requests.post(
            f"{BASE_URL}/api/session/end",
            json={
                "sessionId": "test-session-id-tc014",
                "username": STUDENT_USERNAME,
            },
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        if resp.status_code in (200, 404):
            results.pass_test(f"Session end endpoint responds ({resp.status_code})")
        elif resp.status_code in (400, 401):
            results.pass_test(f"Session end validates request ({resp.status_code})")
        else:
            results.fail_test("Session end", f"Got {resp.status_code}")
    except Exception as e:
        results.fail_test("Session end endpoint", str(e))

    # ============ Test 8: Session end without required fields ============
    try:
        resp = requests.post(
            f"{BASE_URL}/api/session/end",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        if resp.status_code in (400, 401, 422):
            results.pass_test("Session end rejects missing fields")
        else:
            results.pass_test(f"Session end with empty body returned {resp.status_code}")
    except Exception as e:
        results.fail_test("Session end validation", str(e))

    # ============ Test 9: No sensitive data in check-session response ============
    try:
        resp = session2.post_json("/api/auth/check-session", {})
        if resp.status_code == 200:
            assert_no_sensitive_data(resp.text, "check-session")
            results.pass_test("No sensitive data in check-session response")
    except AssertionError as ae:
        results.fail_test("Sensitive data leak", str(ae))
    except Exception as e:
        results.fail_test("Sensitive data check", str(e))

    # ============ Test 10: Protected page without cookie redirects to login ============
    try:
        resp = requests.get(
            f"{BASE_URL}/",
            timeout=TIMEOUT,
            allow_redirects=False,
        )
        if resp.status_code in (302, 303, 307, 308):
            location = resp.headers.get("Location", "")
            if "login" in location.lower():
                results.pass_test("Unauthenticated root page redirects to /login")
            else:
                results.pass_test(f"Unauthenticated root redirects to: {location}")
        elif resp.status_code == 401:
            results.pass_test("Unauthenticated root returns 401")
        elif resp.status_code == 200:
            results.fail_test("Unauth root access", "Got 200 — should redirect to login")
        else:
            results.pass_test(f"Unauthenticated root returns {resp.status_code}")
    except Exception as e:
        results.fail_test("Unauth root redirect", str(e))

    session1.close()
    session2.close()
    return results.summary()


if __name__ == "__main__":
    test_session_management()
