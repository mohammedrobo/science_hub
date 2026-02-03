// Web Push Notifications - Works on phones!
import webpush from 'web-push';

// VAPID keys for push authentication
// These MUST be set in environment variables - no fallbacks for security
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Only configure if keys are present
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:science-hub@example.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface NotificationPayload {
    title: string;
    body: string;
    tag?: string;
    url?: string;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
): Promise<boolean> {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys
            },
            JSON.stringify(payload),
            {
                TTL: 3600, // 1 hour
                urgency: 'high'
            }
        );
        console.log('[Push] Notification sent successfully');
        return true;
    } catch (error: any) {
        console.error('[Push] Error sending notification:', error);
        
        // If subscription is no longer valid, return false so caller can clean up
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[Push] Subscription expired or invalid');
            return false;
        }
        
        throw error;
    }
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string {
    if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured');
    }
    return VAPID_PUBLIC_KEY;
}
