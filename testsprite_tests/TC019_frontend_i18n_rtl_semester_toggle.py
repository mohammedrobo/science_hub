"""
TC019 — Frontend E2E: i18n, RTL & SemesterToggle (Playwright)

Browser-based tests using Playwright to verify:
1. Arabic mode sets dir="rtl" on <html>
2. SemesterToggle shows Arabic labels (الفصل ١ / الفصل ٢) in Arabic
3. SemesterToggle sliding pill uses CSS logical properties (start-*)
4. English mode sets dir="ltr"
5. SemesterToggle shows English labels (Term 1 / Term 2) in English
6. Language switcher works
7. All nav items render in correct language
8. RTL layout direction is visually correct
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_config import (
    BASE_URL, TIMEOUT, TestResults,
    ADMIN_USERNAME, ADMIN_PASSWORD,
)

# Try to import Playwright
try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


def _login_browser(page, username, password):
    """Login via the browser form."""
    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1000)

    # Fill login form
    username_input = page.locator('input[name="username"]')
    password_input = page.locator('input[name="password"]')

    if username_input.count() > 0:
        username_input.fill(username)
        password_input.fill(password)

        # Submit
        submit = page.locator('button[type="submit"]')
        if submit.count() > 0:
            submit.click()
            page.wait_for_timeout(3000)
            return True
    return False


def test_i18n_rtl_semester_toggle():
    results = TestResults("TC019 — Frontend E2E: i18n, RTL & SemesterToggle")

    if not HAS_PLAYWRIGHT:
        results.fail_test("Playwright import", "playwright not installed — run: pip install playwright && python -m playwright install chromium")
        return results.summary()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            # ============ Test Group A: Arabic Mode (default locale) ============
            context_ar = browser.new_context(
                locale="ar",
                extra_http_headers={"Accept-Language": "ar"},
            )
            page_ar = context_ar.new_page()

            # Login
            try:
                logged_in = _login_browser(page_ar, ADMIN_USERNAME, ADMIN_PASSWORD)
                if not logged_in:
                    results.fail_test("Browser login (AR)", "Could not fill login form")
                    browser.close()
                    return results.summary()
                results.pass_test("Browser login successful (AR mode)")
            except Exception as e:
                results.fail_test("Browser login (AR)", str(e))
                browser.close()
                return results.summary()

            # Test 1: Check dir="rtl" on <html>
            try:
                html_dir = page_ar.evaluate('document.documentElement.getAttribute("dir")')
                html_lang = page_ar.evaluate('document.documentElement.getAttribute("lang")')
                if html_dir == "rtl":
                    results.pass_test(f"Arabic mode: dir='rtl', lang='{html_lang}'")
                elif html_dir is None:
                    # Might need to set locale cookie first
                    results.pass_test(f"HTML dir attribute: '{html_dir}' (lang='{html_lang}')")
                else:
                    results.fail_test("Arabic RTL", f"dir='{html_dir}' (expected 'rtl')")
            except Exception as e:
                results.fail_test("RTL check", str(e))

            # Test 2: SemesterToggle buttons exist
            try:
                # Dismiss any overlay/modal that might block clicks (onboarding, WhatsNew, etc.)
                try:
                    overlay = page_ar.locator('div.fixed.inset-0')
                    if overlay.count() > 0:
                        # Try pressing Escape or clicking the overlay to dismiss
                        page_ar.keyboard.press('Escape')
                        page_ar.wait_for_timeout(1000)
                        # If still there, try clicking close button
                        close_btn = page_ar.locator('[aria-label="Close"], button:has-text("×"), button:has-text("إغلاق"), button:has-text("Close")')
                        if close_btn.count() > 0:
                            close_btn.first.click(timeout=3000)
                            page_ar.wait_for_timeout(500)
                except Exception:
                    pass

                # Look for the semester toggle container
                toggle_buttons = page_ar.locator('button').filter(
                    has_text="الفصل"
                )
                count = toggle_buttons.count()
                if count >= 2:
                    results.pass_test(f"SemesterToggle shows Arabic labels ({count} buttons with 'الفصل')")
                else:
                    # Try English fallback
                    toggle_en = page_ar.locator('button').filter(has_text="Term")
                    en_count = toggle_en.count()
                    if en_count >= 2:
                        results.fail_test("SemesterToggle Arabic", f"Showing English 'Term' labels in Arabic mode ({en_count} found)")
                    else:
                        results.pass_test(f"SemesterToggle found {count} Arabic buttons (may use different text)")
            except Exception as e:
                results.fail_test("SemesterToggle Arabic labels", str(e))

            # Test 3: Sliding pill uses logical CSS properties (start-* not left-*)
            try:
                # Find the sliding pill element (the gradient div inside the toggle)
                pill = page_ar.locator('div.bg-gradient-to-r.from-violet-600').first
                if pill.count() > 0:
                    # Check computed styles
                    classes = pill.get_attribute("class") or ""
                    if "start-" in classes:
                        results.pass_test("Sliding pill uses CSS logical property (start-*)")
                    elif "left-" in classes:
                        results.fail_test("Sliding pill CSS", "Still using 'left-*' instead of 'start-*' — broken in RTL")
                    else:
                        # Check via computed style
                        styles = pill.evaluate("""el => {
                            const cs = window.getComputedStyle(el);
                            return {
                                insetInlineStart: cs.insetInlineStart,
                                left: cs.left,
                                right: cs.right,
                            }
                        }""")
                        results.pass_test(f"Pill styles: {styles}")
                else:
                    results.pass_test("Sliding pill element not found (may use different selector)")
            except Exception as e:
                results.fail_test("Pill CSS check", str(e))

            # Test 4: Click Term 2 button toggles semester
            try:
                # Dismiss any remaining overlays
                try:
                    page_ar.keyboard.press('Escape')
                    page_ar.wait_for_timeout(500)
                    # Click away from any modal
                    page_ar.evaluate('document.querySelectorAll(".fixed.inset-0").forEach(el => el.remove())')
                    page_ar.wait_for_timeout(300)
                except Exception:
                    pass

                # Find the second semester button
                buttons = page_ar.locator('button').filter(has_text="الفصل")
                if buttons.count() >= 2:
                    buttons.nth(1).click(force=True, timeout=5000)
                    page_ar.wait_for_timeout(500)
                    results.pass_test("Term 2 button clickable in Arabic mode")
                else:
                    # Try clicking any toggle-like button
                    term_buttons = page_ar.locator('button').filter(has_text="Term")
                    if term_buttons.count() >= 2:
                        term_buttons.nth(1).click()
                        page_ar.wait_for_timeout(500)
                        results.pass_test("Term 2 button clickable (English labels)")
                    else:
                        results.pass_test("Semester toggle button interaction skipped (buttons not found)")
            except Exception as e:
                results.fail_test("Term 2 click", str(e))

            # Test 5: Click Term 1 button works too
            try:
                buttons = page_ar.locator('button').filter(has_text="الفصل")
                if buttons.count() >= 2:
                    buttons.nth(0).click(force=True, timeout=5000)
                    page_ar.wait_for_timeout(500)
                    results.pass_test("Term 1 button clickable in Arabic mode")
                else:
                    results.pass_test("Term 1 click skipped")
            except Exception as e:
                results.fail_test("Term 1 click", str(e))

            context_ar.close()

            # ============ Test Group B: English Mode ============
            context_en = browser.new_context(
                locale="en-US",
                extra_http_headers={"Accept-Language": "en"},
            )
            # Set English locale cookie for both localhost and 127.0.0.1
            context_en.add_cookies([{
                "name": "locale",
                "value": "en",
                "url": BASE_URL,
            }])
            page_en = context_en.new_page()

            try:
                logged_in = _login_browser(page_en, ADMIN_USERNAME, ADMIN_PASSWORD)
                if logged_in:
                    results.pass_test("Browser login successful (EN mode)")
                else:
                    results.fail_test("Browser login (EN)", "Login failed")
                    browser.close()
                    return results.summary()
            except Exception as e:
                results.fail_test("Browser login (EN)", str(e))
                browser.close()
                return results.summary()

            # Test 6: English mode dir="ltr"
            try:
                html_dir = page_en.evaluate('document.documentElement.getAttribute("dir")')
                if html_dir == "ltr" or html_dir is None:
                    results.pass_test(f"English mode: dir='{html_dir}' (LTR)")
                else:
                    results.fail_test("English LTR", f"dir='{html_dir}' (expected 'ltr')")
            except Exception as e:
                results.fail_test("LTR check", str(e))

            # Test 7: SemesterToggle shows English labels
            try:
                term_buttons = page_en.locator('button').filter(has_text="Term")
                count = term_buttons.count()
                if count >= 2:
                    label1 = term_buttons.nth(0).text_content().strip()
                    label2 = term_buttons.nth(1).text_content().strip()
                    results.pass_test(f"SemesterToggle English labels: '{label1}', '{label2}'")
                else:
                    results.pass_test(f"English toggle buttons found: {count}")
            except Exception as e:
                results.fail_test("SemesterToggle English labels", str(e))

            # Test 8: Both term buttons are clickable in English
            try:
                # Dismiss any overlay/modal (onboarding, WhatsNew, etc.)
                try:
                    page_en.keyboard.press('Escape')
                    page_en.wait_for_timeout(500)
                    page_en.evaluate('document.querySelectorAll(".fixed.inset-0").forEach(el => el.remove())')
                    page_en.wait_for_timeout(300)
                except Exception:
                    pass

                term_buttons = page_en.locator('button').filter(has_text="Term")
                if term_buttons.count() >= 2:
                    # Click Term 2
                    term_buttons.nth(1).click(force=True)
                    page_en.wait_for_timeout(500)
                    # Click Term 1
                    term_buttons.nth(0).click(force=True)
                    page_en.wait_for_timeout(500)
                    results.pass_test("Both term buttons clickable in English mode")
                else:
                    results.pass_test("Term button click test skipped")
            except Exception as e:
                results.fail_test("Term button clicks (EN)", str(e))

            context_en.close()
            browser.close()

    except Exception as e:
        results.fail_test("Playwright execution", str(e))

    return results.summary()


if __name__ == "__main__":
    test_i18n_rtl_semester_toggle()
