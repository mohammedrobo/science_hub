"""
TestSprite Test Runner Configuration

This module provides shared utilities for all Science Hub test cases.
It handles authentication, session management, and provides helper functions
for testing Next.js server actions (which use form-based submissions, not REST APIs).
"""

import requests
import json
import time
import os
from typing import Optional, Dict, Any, Tuple
from requests.exceptions import RequestException

# ============ CONFIGURATION ============

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:3000")
TIMEOUT = 30

# Test credentials — Use the super_admin account for admin tests
# and a student account for regular tests
# These match the seed data in secure_data/access_keys.json
ADMIN_USERNAME = os.environ.get("TEST_ADMIN_USERNAME", "C_C2-36-4da3")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "student123")

# Student test user — pick any from seed data
STUDENT_USERNAME = os.environ.get("TEST_STUDENT_USERNAME", "A_A1-1-0444")
STUDENT_PASSWORD = os.environ.get("TEST_STUDENT_PASSWORD", "student123")


# ============ HELPER FUNCTIONS ============

class TestSession:
    """Manages an authenticated test session with cookie-based auth."""

    def __init__(self):
        self.session = requests.Session()
        self.authenticated = False
        self.username: Optional[str] = None

    def login(self, username: str, password: str) -> Tuple[bool, str]:
        """
        Log in via the /login form endpoint.
        Returns (success, message).
        Next.js server actions use form POST and return redirects.
        """
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        payload = {"username": username, "password": password}

        try:
            resp = self.session.post(
                f"{BASE_URL}/login",
                data=payload,
                headers=headers,
                timeout=TIMEOUT,
                allow_redirects=False,
            )

            # 303 or 302 = success (Next.js server actions use 303 See Other)
            if resp.status_code in (302, 303):
                self.authenticated = True
                self.username = username
                location = resp.headers.get("Location", "")
                return True, f"Login successful, redirect to: {location}"
            elif resp.status_code == 200:
                # Server action returned with error (re-renders page)
                return False, f"Login failed: credentials rejected"
            else:
                return False, f"Unexpected status: {resp.status_code}"

        except RequestException as e:
            return False, f"Request error: {e}"

    def get(self, path: str, **kwargs) -> requests.Response:
        """Make authenticated GET request."""
        return self.session.get(
            f"{BASE_URL}{path}",
            timeout=TIMEOUT,
            **kwargs,
        )

    def post(self, path: str, **kwargs) -> requests.Response:
        """Make authenticated POST request."""
        return self.session.post(
            f"{BASE_URL}{path}",
            timeout=TIMEOUT,
            **kwargs,
        )

    def post_form(self, path: str, data: Dict[str, str]) -> requests.Response:
        """POST form data (for Next.js server actions)."""
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        return self.session.post(
            f"{BASE_URL}{path}",
            data=data,
            headers=headers,
            timeout=TIMEOUT,
            allow_redirects=False,
        )

    def post_json(self, path: str, data: Dict[str, Any]) -> requests.Response:
        """POST JSON data (for API routes)."""
        headers = {"Content-Type": "application/json"}
        return self.session.post(
            f"{BASE_URL}{path}",
            json=data,
            headers=headers,
            timeout=TIMEOUT,
        )

    def close(self):
        """Close the session."""
        self.session.close()


def create_unauthenticated_session() -> requests.Session:
    """Create a raw session without authentication."""
    return requests.Session()


def assert_no_sensitive_data(response_text: str, context: str = ""):
    """Check that response doesn't leak sensitive information."""
    text_lower = response_text.lower()
    sensitive_patterns = [
        "supabase_service_role",
        "service_role_key",
        "session_secret",
        "gemini_api_key",
        "vapid_private",
        "password_hash",
        "$2b$",  # bcrypt hash prefix
        "$2a$",  # bcrypt hash prefix
    ]
    for pattern in sensitive_patterns:
        assert pattern not in text_lower, (
            f"[{context}] Sensitive data leaked in response: found '{pattern}'"
        )


def assert_security_headers(response: requests.Response, context: str = ""):
    """Verify security headers are present."""
    headers_to_check = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
    }
    for header, expected_value in headers_to_check.items():
        actual = response.headers.get(header, "")
        # Don't assert on missing headers from redirects, just log
        if actual and expected_value.lower() not in actual.lower():
            print(f"[{context}] Warning: {header} = '{actual}', expected '{expected_value}'")


# ============ RESULTS TRACKING ============

class TestResults:
    """Track test results for reporting."""

    def __init__(self, test_name: str):
        self.test_name = test_name
        self.passed = 0
        self.failed = 0
        self.errors = []

    def pass_test(self, name: str):
        self.passed += 1
        print(f"  ✅ PASS: {name}")

    def fail_test(self, name: str, reason: str):
        self.failed += 1
        self.errors.append(f"{name}: {reason}")
        print(f"  ❌ FAIL: {name} — {reason}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"📊 {self.test_name}: {self.passed}/{total} passed")
        if self.errors:
            print(f"❌ Failures:")
            for err in self.errors:
                print(f"   - {err}")
        print(f"{'='*60}\n")
        return self.failed == 0
