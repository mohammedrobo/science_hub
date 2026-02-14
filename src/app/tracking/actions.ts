'use server';

import { logActivity } from '@/lib/safety/logger';
import { getSession } from '@/app/login/actions';

export async function logPageView(pathname: string) {
    const session = await getSession();

    if (!session) return;

    await logActivity({
        action: 'PAGE_VIEW',
        username: session.username,
        details: {
            path: pathname,
            role: session.role
        }
    });
}

export async function logLessonView(lessonId: string, lessonTitle: string, courseId: string) {
    const session = await getSession();
    if (!session) return;

    await logActivity({
        action: 'LESSON_VIEW',
        username: session.username,
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

    await logActivity({
        action: chatType === 'ai' ? 'CHAT_AI' : 'CHAT_MESSAGE',
        username: session.username,
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

    await logActivity({
        action: 'SCHEDULE_VIEW',
        username: session.username,
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

    await logActivity({
        action,
        username: session.username,
        details: { changeType, ...details, role: session.role }
    });
}

export async function logCourseView(courseId: string, courseName: string) {
    const session = await getSession();
    if (!session) return;

    await logActivity({
        action: 'COURSE_VIEW',
        username: session.username,
        details: { courseId, courseName, role: session.role }
    });
}

export async function logGuildAction(actionType: string, details?: Record<string, any>) {
    const session = await getSession();
    if (!session) return;

    await logActivity({
        action: 'GUILD_ACTION',
        username: session.username,
        details: { actionType, ...details, role: session.role }
    });
}
