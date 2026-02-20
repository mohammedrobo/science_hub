#!/usr/bin/env python3
"""
TestSprite — Science Hub Complete Test Runner

Runs all test cases (backend API, frontend E2E, security) and generates a report.

Usage:
  python run_all_tests.py [--base-url http://localhost:3000]
  python run_all_tests.py --only TC009            # Run single test
  python run_all_tests.py --only TC009,TC010      # Run multiple tests
  python run_all_tests.py --skip-security         # Skip security tests
  python run_all_tests.py --skip-frontend         # Skip Playwright E2E tests
  python run_all_tests.py --backend-only          # Run only backend API tests
  python run_all_tests.py --frontend-only         # Run only Playwright E2E tests
"""

import sys
import os
import time
import json
import argparse
from datetime import datetime

# Ensure test directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    parser = argparse.ArgumentParser(description="Science Hub TestSprite Runner")
    parser.add_argument("--base-url", default="http://localhost:3000",
                        help="Base URL of the running app")
    parser.add_argument("--skip-security", action="store_true",
                        help="Skip security tests (TC008, TC022)")
    parser.add_argument("--skip-frontend", action="store_true",
                        help="Skip Playwright frontend E2E tests (TC019-TC021)")
    parser.add_argument("--backend-only", action="store_true",
                        help="Run only backend API tests (TC001-TC018, TC022)")
    parser.add_argument("--frontend-only", action="store_true",
                        help="Run only Playwright frontend E2E tests (TC019-TC021)")
    parser.add_argument("--only", type=str, default=None,
                        help="Run only specific test(s), comma-separated (e.g., TC001,TC009)")
    args = parser.parse_args()

    # Set base URL
    os.environ["TEST_BASE_URL"] = args.base_url

    print("=" * 70)
    print(f"🧪 Science Hub — TestSprite Complete Test Suite")
    print(f"📍 Target: {args.base_url}")
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ── Import all test modules ──────────────────────────────────────────
    # Original backend tests (TC001-TC008)
    from TC001_login_api_authentication_and_rate_limiting import test_login_api_authentication_and_rate_limiting
    from TC002_change_password_api_strength_validation_and_confirmation import test_change_password_api
    from TC004_courses_api_semester_filtering_and_error_handling import test_courses_api
    from TC005_progress_tracking_api_mark_content_as_completed import test_progress_tracking_mark_content
    from TC006_progress_tracking_api_submit_quiz_result_and_xp_calculation import test_quiz_submission
    from TC007_onboarding_api_complete_user_onboarding_with_gpa import test_onboarding_api
    from TC008_comprehensive_security_audit import test_comprehensive_security

    # New backend tests (TC009-TC018)
    from TC009_schedule_api_section_validation_and_data_retrieval import test_schedule_api
    from TC010_admin_user_management_crud_roles_permissions import test_admin_user_management
    from TC011_feedback_api_submission_rate_limiting_moderation import test_feedback_api
    from TC012_push_notification_api_vapid_subscribe_unsubscribe import test_push_notification_api
    from TC013_file_upload_image_validation_size_security import test_file_upload_api
    from TC014_session_management_single_session_cookie_security import test_session_management
    from TC015_notification_system_inapp_section_targeting import test_notification_system
    from TC016_courses_leaderboard_data_integrity_access import test_courses_and_leaderboard
    from TC017_middleware_route_protection_auth_role_guards import test_middleware_route_protection
    from TC018_guild_system_quests_chat_permissions import test_guild_system

    # Frontend E2E tests (TC019-TC021) — require Playwright
    from TC019_frontend_i18n_rtl_semester_toggle import test_i18n_rtl_semester_toggle
    from TC020_frontend_pages_navigation_components import test_frontend_pages_and_components
    from TC021_frontend_gpa_calculator_accuracy import test_gpa_calculator_accuracy

    # Extended security (TC022)
    from TC022_security_hardening_headers_cors_injection import test_security_hardening

    # ── Define test categories ───────────────────────────────────────────
    backend_tests = {
        "TC001": ("Login API Auth & Rate Limiting", test_login_api_authentication_and_rate_limiting),
        "TC002": ("Change Password Validation", test_change_password_api),
        "TC004": ("Courses API Filtering", test_courses_api),
        "TC005": ("Progress Tracking — Mark Content", test_progress_tracking_mark_content),
        "TC006": ("Quiz Submission & XP", test_quiz_submission),
        "TC007": ("Onboarding API", test_onboarding_api),
        "TC009": ("Schedule API — Section Validation", test_schedule_api),
        "TC010": ("Admin User Management & Roles", test_admin_user_management),
        "TC011": ("Feedback API — Submit & Moderate", test_feedback_api),
        "TC012": ("Push Notification API — VAPID", test_push_notification_api),
        "TC013": ("File Upload — Image Validation", test_file_upload_api),
        "TC014": ("Session — Single-Session Enforcement", test_session_management),
        "TC015": ("Notification System — In-App", test_notification_system),
        "TC016": ("Courses & Leaderboard — Data", test_courses_and_leaderboard),
        "TC017": ("Middleware — Route Protection", test_middleware_route_protection),
        "TC018": ("Guild System — Quests & Chat", test_guild_system),
    }

    security_tests = {
        "TC008": ("Comprehensive Security Audit", test_comprehensive_security),
        "TC022": ("Security Hardening — Headers & CORS", test_security_hardening),
    }

    frontend_tests = {
        "TC019": ("Frontend E2E — i18n/RTL/SemesterToggle", test_i18n_rtl_semester_toggle),
        "TC020": ("Frontend E2E — Pages & Navigation", test_frontend_pages_and_components),
        "TC021": ("Frontend E2E — GPA Calculator", test_gpa_calculator_accuracy),
    }

    # ── Assemble the test run ────────────────────────────────────────────
    tests = {}

    if args.frontend_only:
        tests.update(frontend_tests)
    elif args.backend_only:
        tests.update(backend_tests)
        if not args.skip_security:
            tests.update(security_tests)
    else:
        tests.update(backend_tests)
        if not args.skip_security:
            tests.update(security_tests)
        if not args.skip_frontend:
            tests.update(frontend_tests)

    # Filter to specific tests if --only is used
    if args.only:
        requested = [t.strip().upper() for t in args.only.split(",")]
        all_available = {**backend_tests, **security_tests, **frontend_tests}
        filtered = {}
        unknown = []
        for tid in requested:
            if tid in all_available:
                filtered[tid] = all_available[tid]
            else:
                unknown.append(tid)
        if unknown:
            print(f"⚠️  Unknown test(s): {', '.join(unknown)}")
            print(f"Available: {', '.join(sorted(all_available.keys()))}")
        if not filtered:
            sys.exit(1)
        tests = filtered

    # Sort by test ID
    tests = dict(sorted(tests.items()))

    print(f"\n📦 Running {len(tests)} test(s): {', '.join(tests.keys())}")

    # ── Run tests ────────────────────────────────────────────────────────
    all_passed = True
    total_start = time.time()
    test_results = []

    for test_id, (name, test_fn) in tests.items():
        print(f"\n{'─'*60}")
        category = "🖥️  FE" if test_id in frontend_tests else ("🔒 SEC" if test_id in security_tests else "⚙️  BE")
        print(f"{category} {test_id}: {name}")
        print(f"{'─'*60}")

        try:
            start = time.time()
            passed = test_fn()
            elapsed = time.time() - start

            if not passed:
                all_passed = False

            test_results.append({
                "id": test_id,
                "name": name,
                "passed": passed,
                "elapsed": round(elapsed, 1),
            })

            print(f"⏱️  Completed in {elapsed:.1f}s")
        except Exception as e:
            all_passed = False
            elapsed = time.time() - start
            test_results.append({
                "id": test_id,
                "name": name,
                "passed": False,
                "elapsed": round(elapsed, 1),
                "error": str(e),
            })
            print(f"  💥 CRASH: {e}")
            import traceback
            traceback.print_exc()

    total_elapsed = time.time() - total_start

    # ── Final report ─────────────────────────────────────────────────────
    passed_count = sum(1 for r in test_results if r["passed"])
    failed_count = len(test_results) - passed_count

    print("\n" + "=" * 70)
    print(f"📋 FINAL REPORT")
    print(f"{'='*70}")
    print(f"⏱️  Total time: {total_elapsed:.1f}s")
    print(f"📅 Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📊 Results: {passed_count} passed, {failed_count} failed out of {len(test_results)} tests")
    print()

    for r in test_results:
        icon = "✅" if r["passed"] else "❌"
        print(f"  {icon} {r['id']}: {r['name']} ({r['elapsed']}s)")
        if r.get("error"):
            print(f"      💥 {r['error'][:80]}")

    print()
    if all_passed:
        print(f"✅ ALL {len(test_results)} TESTS PASSED!")
    else:
        print(f"❌ {failed_count} TEST(S) FAILED — review output above")

    print("=" * 70)

    # ── Save results JSON ────────────────────────────────────────────────
    results_path = os.path.join(os.path.dirname(__file__), "tmp", "test_results_full.json")
    os.makedirs(os.path.dirname(results_path), exist_ok=True)
    with open(results_path, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "base_url": args.base_url,
            "total_elapsed": round(total_elapsed, 1),
            "passed": passed_count,
            "failed": failed_count,
            "total": len(test_results),
            "all_passed": all_passed,
            "tests": test_results,
        }, f, indent=2)
    print(f"📄 Results saved to {results_path}")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
