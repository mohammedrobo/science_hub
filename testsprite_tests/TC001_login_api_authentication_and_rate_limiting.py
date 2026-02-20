"""
TC001: Login API Authentication and Rate Limiting
Tests the /login POST endpoint for:
- Valid login with correct credentials
- Invalid login with wrong credentials
- Rate limiting enforcement
- SQL injection prevention
- XSS prevention
- Session cookie security
"""

import requests
import time
from test_config import (
    BASE_URL, TIMEOUT, STUDENT_USERNAME, STUDENT_PASSWORD,
    TestSession, TestResults, assert_no_sensitive_data
)


def test_login_api_authentication_and_rate_limiting():
    results = TestResults("TC001 — Login API Authentication & Rate Limiting")

    # ============ Test 1: Valid login ============
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, STUDENT_PASSWORD)

        if success:
            results.pass_test("Valid login returns redirect (302/303)")

            # Check session cookie is set
            cookies = ts.session.cookies.get_dict()
            has_session = "sciencehub_session" in cookies
            if has_session:
                results.pass_test("Session cookie set after login")
            else:
                results.fail_test("Session cookie set after login", "Cookie not found")
        else:
            results.fail_test("Valid login returns redirect", msg)

        ts.close()
    except Exception as e:
        results.fail_test("Valid login", str(e))

    # ============ Test 2: Invalid credentials ============
    try:
        ts = TestSession()
        success, msg = ts.login(STUDENT_USERNAME, "CompletelyWrongPassword123!")

        if not success:
            results.pass_test("Invalid password is rejected")
        else:
            results.fail_test("Invalid password is rejected", "Login succeeded with wrong password!")

        ts.close()
    except Exception as e:
        results.fail_test("Invalid password rejection", str(e))

    # ============ Test 3: Non-existent username ============
    try:
        ts = TestSession()
        success, msg = ts.login("nonexistent_user_xyz", "SomePassword123!")

        if not success:
            results.pass_test("Non-existent username is rejected")
        else:
            results.fail_test("Non-existent username rejected", "Login succeeded with fake user!")

        ts.close()
    except Exception as e:
        results.fail_test("Non-existent username rejection", str(e))

    # ============ Test 4: Rate limiting ============
    try:
        session = requests.Session()
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        rate_limited = False

        # Send 10 rapid failed attempts to a fake user to avoid locking real accounts
        for i in range(10):
            resp = session.post(
                f"{BASE_URL}/login",
                data={"username": "rate_limit_test_user", "password": f"wrong{i}"},
                headers=headers,
                timeout=TIMEOUT,
                allow_redirects=False,
            )
            body = resp.text.lower() if resp.status_code == 200 else ""
            if resp.status_code == 429 or "too many" in body or "try again" in body:
                rate_limited = True
                break

        if rate_limited:
            results.pass_test("Rate limiting enforced after repeated failures")
        else:
            results.fail_test("Rate limiting enforced", "No rate limit triggered after 10 attempts")

        session.close()
    except Exception as e:
        results.fail_test("Rate limiting", str(e))

    # ============ Test 5: SQL injection prevention ============
    injection_payloads = [
        {"username": "' OR '1'='1", "password": "' OR '1'='1"},
        {"username": "admin'; DROP TABLE users;--", "password": "irrelevant"},
        {"username": "' UNION SELECT * FROM allowed_users--", "password": "x"},
    ]

    for i, payload in enumerate(injection_payloads):
        try:
            ts = TestSession()
            resp = ts.session.post(
                f"{BASE_URL}/login",
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=TIMEOUT,
                allow_redirects=False,
            )

            if resp.status_code not in (302, 303):
                results.pass_test(f"SQL injection blocked (payload #{i+1})")
            else:
                results.fail_test(f"SQL injection blocked (payload #{i+1})",
                                  "Login succeeded with SQL injection payload!")

            assert_no_sensitive_data(resp.text, f"SQL injection #{i+1}")
            ts.close()
        except AssertionError as e:
            results.fail_test(f"SQL injection data leak (payload #{i+1})", str(e))
        except Exception as e:
            results.fail_test(f"SQL injection test #{i+1}", str(e))

    # ============ Test 6: XSS in username field ============
    try:
        ts = TestSession()
        resp = ts.session.post(
            f"{BASE_URL}/login",
            data={"username": "<script>alert(1)</script>", "password": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if resp.status_code not in (302, 303):
            if "<script>alert(1)</script>" not in resp.text:
                results.pass_test("XSS payload not reflected in response")
            else:
                results.fail_test("XSS prevention", "Script tag reflected in response!")
        else:
            results.fail_test("XSS prevention", "Login succeeded with XSS payload!")

        ts.close()
    except Exception as e:
        results.fail_test("XSS prevention", str(e))

    # ============ Test 7: Empty credentials ============
    try:
        ts = TestSession()
        resp = ts.session.post(
            f"{BASE_URL}/login",
            data={"username": "", "password": ""},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if resp.status_code not in (302, 303):
            results.pass_test("Empty credentials rejected")
        else:
            results.fail_test("Empty credentials rejected", "Login succeeded with empty fields!")

        ts.close()
    except Exception as e:
        results.fail_test("Empty credentials", str(e))

    # ============ Test 8: Error message doesn't enumerate usernames ============
    try:
        ts = TestSession()
        resp = ts.session.post(
            f"{BASE_URL}/login",
            data={"username": STUDENT_USERNAME, "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        body = resp.text.lower()
        if "user not found" not in body and "username does not exist" not in body:
            results.pass_test("Error message doesn't reveal if user exists")
        else:
            results.fail_test("Username enumeration prevention",
                              "Response reveals whether username exists")

        ts.close()
    except Exception as e:
        results.fail_test("Error message safety", str(e))

    return results.summary()


if __name__ == "__main__":
    test_login_api_authentication_and_rate_limiting()
