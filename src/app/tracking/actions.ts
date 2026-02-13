'use server';

import { logActivity } from '@/lib/safety/logger';
import { getSession } from '@/app/login/actions';

export async function logPageView(pathname: string) {
    const session = await getSession();

    if (!session) return;

    // Don't log admin pages to avoid noise, unless specifically requested.
    // The dean wants to track students, best to track everyone but maybe filter out admin later?
    // Requirement: "I wanna see every student log in log out... track all the students"
    // So logging everyone is safer. `logActivity` handles IP/UA automatically.

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
