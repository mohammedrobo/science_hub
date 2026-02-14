import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session-read';
import { createClient } from '@supabase/supabase-js';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push-notifications';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Return VAPID public key for client
export async function GET() {
    try {
        if (!isPushConfigured()) {
            return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
        }
        return NextResponse.json({
            publicKey: getVapidPublicKey()
        });
    } catch {
        return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
    }
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        // Verify user session
        const session = await readSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { subscription, sectionId } = body;

        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }

        if (!sectionId) {
            return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
        }

        // Upsert subscription (update if endpoint exists)
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                username: session.username,
                section_id: sectionId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'endpoint'
            });

        if (error) {
            console.error('[Push Subscribe] Error:', error);
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
        }

        console.log(`[Push Subscribe] User ${session.username} subscribed for section ${sectionId}`);

        return NextResponse.json({ success: true, message: 'Subscribed to notifications' });
    } catch (error) {
        console.error('[Push Subscribe] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const session = await readSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('username', session.username)
            .eq('endpoint', endpoint);

        if (error) {
            console.error('[Push Unsubscribe] Error:', error);
            return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
        }

        console.log(`[Push Unsubscribe] User ${session.username} unsubscribed`);

        return NextResponse.json({ success: true, message: 'Unsubscribed from notifications' });
    } catch (error) {
        console.error('[Push Unsubscribe] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
