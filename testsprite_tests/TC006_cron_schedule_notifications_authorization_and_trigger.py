import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

BEARER_TOKEN = "valid_token"

def test_cron_schedule_notifications_authorization_and_trigger():
    headers_cron = {
        "X-Vercel-Cron": "true",
        "Authorization": f"Bearer {BEARER_TOKEN}"
    }

    # Test GET /api/cron/schedule-notify with valid Vercel cron header (authorized)
    response_get_cron = requests.get(
        f"{BASE_URL}/api/cron/schedule-notify",
        headers=headers_cron,
        timeout=TIMEOUT
    )
    assert response_get_cron.status_code == 200, f"GET cron notify expected 200 but got {response_get_cron.status_code}"
    json_get = response_get_cron.json()
    assert json_get.get("success") is True, f"GET cron notify response missing success:true"
    assert isinstance(json_get.get("notifications_sent"), int), "GET cron notify notifications_sent should be int"

    # Test GET /api/cron/schedule-notify without authorization (no header or invalid auth) -> 401
    response_get_unauth = requests.get(
        f"{BASE_URL}/api/cron/schedule-notify",
        timeout=TIMEOUT
    )
    assert response_get_unauth.status_code == 401, f"GET cron notify without auth should be 401 but got {response_get_unauth.status_code}"

    # Test POST /api/cron/schedule-notify with valid Vercel cron header (delegates to GET handler)
    response_post_cron = requests.post(
        f"{BASE_URL}/api/cron/schedule-notify",
        headers=headers_cron,
        timeout=TIMEOUT
    )
    assert response_post_cron.status_code == 200, f"POST cron notify expected 200 but got {response_post_cron.status_code}"
    json_post = response_post_cron.json()
    assert json_post.get("success") is True, f"POST cron notify response missing success:true"
    assert isinstance(json_post.get("notifications_sent"), int), "POST cron notify notifications_sent should be int"


test_cron_schedule_notifications_authorization_and_trigger()