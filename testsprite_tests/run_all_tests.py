#!/usr/bin/env python3
"""
TestSprite — Science Hub Complete Test Runner

Runs all test cases (frontend, backend, security) and generates a report.
Usage: python run_all_tests.py [--base-url http://localhost:3000]
"""

import sys
import os
import time
import argparse
from datetime import datetime

# Ensure test directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    parser = argparse.ArgumentParser(description="Science Hub TestSprite Runner")
    parser.add_argument("--base-url", default="http://localhost:3000",
                        help="Base URL of the running app")
    parser.add_argument("--skip-security", action="store_true",
                        help="Skip security tests")
    parser.add_argument("--only", type=str, default=None,
                        help="Run only specific test (e.g., TC001)")
    args = parser.parse_args()

    # Set base URL
    os.environ["TEST_BASE_URL"] = args.base_url

    print("=" * 70)
    print(f"🧪 Science Hub — TestSprite Complete Test Suite")
    print(f"📍 Target: {args.base_url}")
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Import test modules
    from TC001_login_api_authentication_and_rate_limiting import test_login_api_authentication_and_rate_limiting
    from TC002_change_password_api_strength_validation_and_confirmation import test_change_password_api
    from TC003_ai_chat_api_message_handling_and_error_responses import test_ai_chat_api
    from TC004_courses_api_semester_filtering_and_error_handling import test_courses_api
    from TC005_progress_tracking_api_mark_content_as_completed import test_progress_tracking_mark_content
    from TC006_progress_tracking_api_submit_quiz_result_and_xp_calculation import test_quiz_submission
    from TC007_onboarding_api_complete_user_onboarding_with_gpa import test_onboarding_api
    from TC008_comprehensive_security_audit import test_comprehensive_security

    tests = {
        "TC001": ("Login API Auth & Rate Limiting", test_login_api_authentication_and_rate_limiting),
        "TC002": ("Change Password Validation", test_change_password_api),
        "TC003": ("AI Chat API", test_ai_chat_api),
        "TC004": ("Courses API", test_courses_api),
        "TC005": ("Progress Tracking — Mark Content", test_progress_tracking_mark_content),
        "TC006": ("Quiz Submission & XP", test_quiz_submission),
        "TC007": ("Onboarding API", test_onboarding_api),
        "TC008": ("Comprehensive Security Audit", test_comprehensive_security),
    }

    if args.only:
        test_id = args.only.upper()
        if test_id in tests:
            tests = {test_id: tests[test_id]}
        else:
            print(f"❌ Unknown test: {args.only}")
            print(f"Available: {', '.join(tests.keys())}")
            sys.exit(1)

    if args.skip_security:
        tests.pop("TC008", None)

    # Run tests
    all_passed = True
    total_start = time.time()

    for test_id, (name, test_fn) in tests.items():
        print(f"\n{'─'*60}")
        print(f"🧪 Running {test_id}: {name}")
        print(f"{'─'*60}")

        try:
            start = time.time()
            passed = test_fn()
            elapsed = time.time() - start

            if not passed:
                all_passed = False

            print(f"⏱️  Completed in {elapsed:.1f}s")
        except Exception as e:
            all_passed = False
            print(f"  💥 CRASH: {e}")
            import traceback
            traceback.print_exc()

    total_elapsed = time.time() - total_start

    # Final report
    print("\n" + "=" * 70)
    print(f"📋 FINAL REPORT")
    print(f"{'='*70}")
    print(f"⏱️  Total time: {total_elapsed:.1f}s")
    print(f"📅 Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if all_passed:
        print(f"✅ ALL TESTS PASSED!")
    else:
        print(f"❌ SOME TESTS FAILED — review output above")

    print("=" * 70)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
