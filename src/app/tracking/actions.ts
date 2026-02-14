'use server';

import { logActivity } from '@/lib/safety/logger';
import { getSession } from '@/app/login/actions';

// ── Simple in-memory rate limiter for tracking actions ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 calls per minute per user

function isRateLimited(username: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(username);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(username, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) return true;
    return false;
}

// Periodically clean stale entries (every 5 min)
if (typeof globalThis !== 'undefined') {
    const cleanup = () => {
        const now = Date.now();
        for (const [key, val] of rateLimitMap) {
            if (now > val.resetAt) rateLimitMap.delete(key);
        }
    };
    setInterval(cleanup, 5 * 60_000).unref?.();
}

export async function logPageView(pathname: string) {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    // Fire and forget — don't await to avoid slowing navigation
    logActivity({
        action: 'PAGE_VIEW',
        username: session.username,
        userId: (session as any).id,
        details: {
            path: pathname,
            role: session.role
        }
    });
}

export async function logLessonView(lessonId: string, lessonTitle: string, courseId: string) {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    logActivity({
        action: 'LESSON_VIEW',
        username: session.username,
        userId: (session as any).id,
        details: {
            lessonId,
            lessonTitle,
            courseId,
            role: session.role
        }
    });
}

export async function logChatMessage(messagePreview: string, chatType: 'ai' | 'guild') {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    logActivity({
        action: chatType === 'ai' ? 'CHAT_AI' : 'CHAT_MESSAGE',
        username: session.username,
        userId: (session as any).id,
        details: {
            preview: messagePreview.substring(0, 100),
            chatType,
            role: session.role,
        }
    });
}

export async function logScheduleView() {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    logActivity({
        action: 'SCHEDULE_VIEW',
        username: session.username,
        userId: (session as any).id,
        details: { role: session.role }
    });
}

export async function logProfileChange(changeType: string, details?: Record<string, any>) {
    const session = await getSession();
    if (!session) return;

    const action = changeType === 'password' ? 'PASSWORD_CHANGE' as const
        : changeType === 'picture' ? 'PROFILE_PIC_CHANGE' as const
        : changeType === 'nickname' ? 'NICKNAME_CHANGE' as const
        : 'PROFILE_UPDATE' as const;

    logActivity({
        action,
        username: session.username,
        userId: (session as any).id,
        details: { changeType, ...details, role: session.role }
    });
}

export async function logCourseView(courseId: string, courseName: string) {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    logActivity({
        action: 'COURSE_VIEW',
        username: session.username,
        userId: (session as any).id,
        details: { courseId, courseName, role: session.role }
    });
}

export async function logGuildAction(actionType: string, details?: Record<string, any>) {
    const session = await getSession();
    if (!session) return;
    if (isRateLimited(session.username)) return;

    logActivity({
        action: 'GUILD_ACTION',
        username: session.username,
        userId: (session as any).id,
        details: { actionType, ...details, role: session.role }
    });
}
