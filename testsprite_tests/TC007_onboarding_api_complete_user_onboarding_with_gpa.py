import requests
import random
import string

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_onboarding_api_complete_user_onboarding_with_gpa():
    session = requests.Session()

    # Step 1: Authenticate to get a valid session or token
    # As the PRD does not specify auth tokens or headers for onboarding,
    # assume a login is needed first and use session cookies for auth.
    login_url = f"{BASE_URL}/login"
    # Use a known test user credential, here using placeholders.
    login_payload = {
        "username": "testuser",
        "password": "TestPass123!"
    }
    try:
        login_resp = session.post(login_url, data=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code in (200, 302), f"Login failed: {login_resp.status_code} {login_resp.text}"
        # If 302, it indicates successful login redirect

        # Step 2: Test /actions/completeOnboarding with GPA input
        onboarding_url = f"{BASE_URL}/actions/completeOnboarding"

        # Valid GPA value test
        valid_gpa = 3.75
        headers = {"Content-Type": "application/json"}
        onboarding_payload = {"gpaTerm1": valid_gpa}
        resp = session.post(onboarding_url, json=onboarding_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Onboarding failed with valid GPA: {resp.status_code} {resp.text}"
        # Optionally validate response content if API returns JSON (not specified)
        try:
            data = resp.json()
            # Expect onboarding complete message or status confirmation
            assert isinstance(data, dict), "Response is not JSON object"
        except Exception:
            # Response might not be JSON, pass
            pass

        # Step 3: Test boundary and invalid GPA input to check validation/security

        invalid_gpas = [
            -1,           # Negative GPA (invalid)
            5.5,          # Above max GPA (assuming 4.0 scale)
            "3.0 OR 1=1", # SQL injection attempt as string
            "<script>alert(1)</script>", # XSS attempt
            None,         # Missing GPA field handled by sending empty JSON
        ]

        for gpa_test in invalid_gpas:
            if gpa_test is None:
                test_payload = {}
            else:
                test_payload = {"gpaTerm1": gpa_test}

            resp = session.post(onboarding_url, json=test_payload, headers=headers, timeout=TIMEOUT)
            # Expect 4xx status indicating rejection or validation failure
            assert resp.status_code >= 400 and resp.status_code < 500, \
                f"Invalid GPA input not rejected: {gpa_test}, Status: {resp.status_code}, Response: {resp.text}"

        # Step 4: Test authentication bypass by calling without session or token
        # New session without auth
        unauth_session = requests.Session()
        resp_unauth = unauth_session.post(onboarding_url, json={"gpaTerm1": valid_gpa}, headers=headers, timeout=TIMEOUT)

        assert resp_unauth.status_code in (401, 403), \
            f"Unauthenticated request allowed: Status {resp_unauth.status_code}, Response: {resp_unauth.text}"

    finally:
        # Clean up if needed - No resource created persisted beyond onboarding completion indicated
        # If test creates user or other entities, delete here.
        session.close()

test_onboarding_api_complete_user_onboarding_with_gpa()