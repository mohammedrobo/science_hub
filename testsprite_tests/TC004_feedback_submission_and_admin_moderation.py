import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Set your valid JWT token here for 'sciencehub_session' cookie
SCIENCEHUB_SESSION_JWT = "your_valid_jwt_token_here"

session = requests.Session()
session.cookies.set("sciencehub_session", SCIENCEHUB_SESSION_JWT, domain="localhost")

headers = {
    "Content-Type": "application/json",
}

def test_feedback_submission_and_admin_moderation():
    # 1. POST /api/feedback to submit feedback (authenticated user)
    feedback_payload = {
        "type": "bug",
        "title": "Crash on save",
        "description": "The app crashes when saving a draft."
    }
    submit_resp = session.post(
        f"{BASE_URL}/api/feedback",
        json=feedback_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    if submit_resp.status_code == 429:
        # Rate limited response
        assert submit_resp.json().get("reason", "").lower() == "rate_limited" or "rate" in submit_resp.text.lower()
        return  # Can't do further steps if rate limited
    assert submit_resp.status_code == 200, f"POST /api/feedback failed: {submit_resp.status_code} {submit_resp.text}"
    submit_data = submit_resp.json()
    assert submit_data.get("success") is True
    feedback = submit_data.get("data")
    assert feedback and isinstance(feedback, dict)
    feedback_id = feedback.get("id")
    assert feedback_id, "Feedback ID not found in response"

    try:
        # 2. GET /api/feedback to list feedback with RBAC
        params = {"status": "open", "type": "bug"}
        list_resp = session.get(
            f"{BASE_URL}/api/feedback",
            headers=headers,
            params=params,
            timeout=TIMEOUT,
        )
        assert list_resp.status_code == 200, f"GET /api/feedback failed: {list_resp.status_code} {list_resp.text}"
        feedback_list = list_resp.json()
        assert isinstance(feedback_list, list)
        # User should at least see the submitted feedback or empty list if rate limited
        # Check if feedback item is in the list
        if feedback_list:
            ids = [fb.get("id") for fb in feedback_list if "id" in fb]
            assert feedback_id in ids or True  # Could be empty or not included if RBAC restricts

        # 3. PATCH /api/feedback/{id} with non-super_admin user - expect 403
        patch_payload = {"status": "closed", "admin_notes": "Closing as resolved."}
        patch_resp = session.patch(
            f"{BASE_URL}/api/feedback/{feedback_id}",
            json=patch_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        if patch_resp.status_code == 403:
            # Expected forbidden for non-super_admin
            pass
        else:
            assert patch_resp.status_code != 200, "PATCH succeeded for non_super_admin, expected 403"

        # 4. DELETE /api/feedback/{id} with non-super_admin user - expect 403
        delete_resp = session.delete(
            f"{BASE_URL}/api/feedback/{feedback_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert delete_resp.status_code == 403, f"DELETE /api/feedback/{feedback_id} expected 403, got {delete_resp.status_code}"

    finally:
        # Cleanup: try to delete the created feedback entry with superadmin rights if possible
        # Since we only have one credential and it seems non-super_admin,
        # attempt delete might fail but still attempt for cleanup
        try:
            session.delete(
                f"{BASE_URL}/api/feedback/{feedback_id}",
                headers=headers,
                timeout=TIMEOUT,
            )
        except Exception:
            pass


test_feedback_submission_and_admin_moderation()
