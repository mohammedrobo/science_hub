import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
USERNAME = "C_C2-36-4da3"
PASSWORD = "Satoru123@"

TIMEOUT = 30

def test_push_notification_subscription_and_sending():
    session = requests.Session()
    session.auth = HTTPBasicAuth(USERNAME, PASSWORD)
    headers = {"Content-Type": "application/json"}

    # 1. GET /api/push/subscribe to retrieve VAPID public key (no auth required)
    vapid_response = requests.get(f"{BASE_URL}/api/push/subscribe", timeout=TIMEOUT)
    assert vapid_response.status_code == 200, f"Expected 200 for VAPID key, got {vapid_response.status_code}"
    vapid_json = vapid_response.json()
    assert "publicKey" in vapid_json and isinstance(vapid_json["publicKey"], str) and len(vapid_json["publicKey"]) > 0, "VAPID publicKey missing or invalid"

    # Prepare a fake PushSubscription object to register
    push_subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/fake-token",
        "keys": {
            "p256dh": "fake_p256dh_key==",
            "auth": "fake_auth_key=="
        }
    }
    section_id = "test-section-abc"

    subscription_payload = {
        "subscription": push_subscription,
        "section_id": section_id
    }

    subscribed = False
    try:
        # 2. POST /api/push/subscribe with auth to subscribe
        subscribe_response = session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_payload, headers=headers, timeout=TIMEOUT)
        assert subscribe_response.status_code == 200, f"Expected 200 on subscribe, got {subscribe_response.status_code}"
        subscribe_json = subscribe_response.json()
        assert "success" in subscribe_json and subscribe_json["success"] is True, "Subscription success flag missing or false"
        subscribed = True

        # 3. POST /api/push/send with Bearer token auth (use Basic token replaced by bearer here)
        # The PRD says bearer token required. We will get bearer token by converting basic auth to base64
        # But since only basic auth credential is provided, assume same creds used for bearer token for testing purpose
        import base64
        bearer_token = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
        send_headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json"
        }
        send_response = requests.post(f"{BASE_URL}/api/push/send", headers=send_headers, timeout=TIMEOUT)
        assert send_response.status_code == 200, f"Expected 200 on push send, got {send_response.status_code}"
        send_json = send_response.json()
        assert "success" in send_json and send_json["success"] is True, "Push send success flag missing or false"
        assert "sent" in send_json and isinstance(send_json["sent"], int) and send_json["sent"] >= 0, "Push send sent count missing or invalid"

    finally:
        if subscribed:
            # 4. DELETE /api/push/subscribe with auth to unsubscribe by endpoint
            unsubscribe_payload = {"endpoint": push_subscription["endpoint"]}
            unsubscribe_response = session.delete(f"{BASE_URL}/api/push/subscribe", json=unsubscribe_payload, headers=headers, timeout=TIMEOUT)
            assert unsubscribe_response.status_code == 200, f"Expected 200 on unsubscribe, got {unsubscribe_response.status_code}"
            unsubscribe_json = unsubscribe_response.json()
            assert "success" in unsubscribe_json and unsubscribe_json["success"] is True, "Unsubscribe success flag missing or false"

test_push_notification_subscription_and_sending()