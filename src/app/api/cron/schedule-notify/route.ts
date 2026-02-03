import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkAndNotifyUpcomingClasses } from '@/app/schedule/notifications';

// This endpoint can be called by a cron job (Vercel Cron, external service, etc.)
// to send class reminders at regular intervals
// 
// Recommended schedule: Every 15 minutes
// Example cron: */15 * * * *
//
// SECURITY: Requires CRON_SECRET environment variable or Vercel cron header

export async function GET(request: Request) {
    const headersList = await headers();
    
    // SECURITY: Verify request is from authorized source
    // 1. Check for Vercel Cron header (automatically added by Vercel)
    const vercelCronHeader = headersList.get('x-vercel-cron');
    
    // 2. Check for manual authorization with secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    const isVercelCron = vercelCronHeader === '1';
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    // Reject if neither verification method passes
    if (!isVercelCron && !hasValidSecret) {
        console.warn('[SECURITY] Unauthorized cron access attempt');
        return NextResponse.json(
            { error: 'Unauthorized - Invalid or missing credentials' }, 
            { status: 401 }
        );
    }
    
    try {
        const result = await checkAndNotifyUpcomingClasses();
        
        // Don't expose detailed info in production
        const isProduction = process.env.NODE_ENV === 'production';
        
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            sent: result.sent,
            failed: result.failed,
            // Only show details in development
            ...(isProduction ? {} : {
                details: result.notifications.map(n => ({
                    section: n.section_id,
                    type: n.notification_type,
                    class: n.class_subject
                }))
            })
        });
        
    } catch (error) {
        console.error('Cron schedule check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST also requires authentication
export async function POST(request: Request) {
    return GET(request);
}
