import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/push-notifications';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vercel Cron or manual trigger to send push notifications
// This endpoint checks schedules and sends notifications 15 or 5 min before class

export async function GET(request: NextRequest) {
    // Verify cron secret — deny if missing or mismatched
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday
        
        // Only send on Sunday-Thursday (0-4)
        if (currentDay < 0 || currentDay > 4) {
            return NextResponse.json({ message: 'Weekend - no notifications' });
        }

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Only during school hours (8am - 6pm)
        if (currentHour < 8 || currentHour > 18) {
            return NextResponse.json({ message: 'Outside school hours' });
        }

        // Get all active push subscriptions
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (subError || !subscriptions?.length) {
            console.log('[Push Cron] No subscriptions found');
            return NextResponse.json({ message: 'No subscriptions' });
        }

        // Get schedules from secure_data
        const fs = await import('fs');
        const path = await import('path');
        
        let schedules: Record<string, any> = {};
        try {
            const schedulePath = path.join(process.cwd(), 'secure_data', 'structured_schedules.json');
            schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
        } catch (err) {
            console.error('[Push Cron] Could not load schedules:', err);
            return NextResponse.json({ error: 'Could not load schedules' }, { status: 500 });
        }

        const dayMap: Record<number, string> = {
            0: 'sunday',
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday'
        };
        
        const today = dayMap[currentDay];
        let notificationsSent = 0;
        let failedSubscriptions: string[] = [];

        // Group subscriptions by section
        const sectionSubscriptions = new Map<string, typeof subscriptions>();
        for (const sub of subscriptions) {
            const existing = sectionSubscriptions.get(sub.section_id) || [];
            existing.push(sub);
            sectionSubscriptions.set(sub.section_id, existing);
        }

        // Check each section's schedule
        for (const [sectionId, subs] of sectionSubscriptions) {
            const sectionSchedule = schedules[sectionId]?.[today];
            if (!sectionSchedule?.length) continue;

            // Find classes starting in 15 or 5 minutes
            for (const classItem of sectionSchedule) {
                const classHour = classItem.time_start;
                const classMinute = 0; // Classes start on the hour
                
                const minutesUntilClass = (classHour - currentHour) * 60 + (classMinute - currentMinute);
                
                // Send at exactly 15 or 5 minutes before (with 2 min tolerance)
                const shouldNotify = 
                    (minutesUntilClass >= 14 && minutesUntilClass <= 16) || // ~15 min
                    (minutesUntilClass >= 4 && minutesUntilClass <= 6);      // ~5 min

                if (!shouldNotify) continue;

                const notificationTag = `${sectionId}-${classItem.subject}-${classHour}-${Math.round(minutesUntilClass / 10) * 10}`;
                
                // Send to all subscribers of this section
                for (const subscription of subs) {
                    const payload = {
                        title: `📚 ${classItem.subject} in ${Math.round(minutesUntilClass)} min`,
                        body: `${classItem.class_type}${classItem.room ? ` • Room ${classItem.room}` : ''}\nStarts at ${classHour}:00`,
                        tag: notificationTag,
                        url: `/schedule/${sectionId}`
                    };

                    const success = await sendPushNotification(
                        {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.p256dh,
                                auth: subscription.auth
                            }
                        },
                        payload
                    );

                    if (success) {
                        notificationsSent++;
                    } else {
                        // Subscription is invalid, mark for deletion
                        failedSubscriptions.push(subscription.endpoint);
                    }
                }
            }
        }

        // Clean up invalid subscriptions
        if (failedSubscriptions.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .in('endpoint', failedSubscriptions);
            console.log(`[Push Cron] Cleaned up ${failedSubscriptions.length} invalid subscriptions`);
        }

        console.log(`[Push Cron] Sent ${notificationsSent} notifications`);

        return NextResponse.json({
            success: true,
            notificationsSent,
            cleanedUp: failedSubscriptions.length
        });
    } catch (error) {
        console.error('[Push Cron] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
