'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { unstable_cache } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';

export interface LessonProgress {
    lessonId: string;
    isCompleted: boolean;
    quizScore: number | null;
}

import { MOCK_COURSES } from '@/lib/data/mocks';

const COURSE_CONTENT_REVALIDATE_SECONDS = examModeValue(600, 3600); // 10m normal, 60m exam mode
const COURSE_QUIZ_PROGRESS_REVALIDATE_SECONDS = examModeValue(120, 600); // 2m normal, 10m exam mode

const getCourseContentCached = unstable_cache(
    async (courseDescriptor: string) => {
        const supabase = await createServiceRoleClient();

        let courseId = courseDescriptor;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseDescriptor);

        if (!isUuid) {
            // Resolve mock ID (e.g. 'm102') to DB UUID via Code
            const mockCourse = MOCK_COURSES.find(c => c.id === courseDescriptor);
            if (mockCourse) {
                const { data: dbCourse } = await supabase
                    .from('courses')
                    .select('id')
                    .eq('code', mockCourse.code)
                    .single();

                if (dbCourse) {
                    courseId = dbCourse.id;
                } else {
                    console.error(`Course code ${mockCourse.code} not found in DB`);
                    return [];
                }
            } else {
                console.error(`Course descriptor ${courseDescriptor} unknown`);
                return [];
            }
        }

        // Fetch lessons
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });

        if (error) {
            console.error("Fetch lessons error:", error);
            return [];
        }

        return lessons.map(l => ({
            id: l.id,
            title: l.title,
            course_id: courseDescriptor, // Keep the ID the frontend used if possible, or l.course_id
            video_url: l.video_url,
            video_parts: l.video_parts || [],
            pdf_url: l.pdf_url,
            pdf_parts: l.pdf_parts || [],
            quiz_id: l.quiz_id,
            order_index: l.order_index
        }));
    },
    ['course-content-v1'],
    { revalidate: COURSE_CONTENT_REVALIDATE_SECONDS, tags: ['lessons'] }
);

export async function getCourseContent(courseDescriptor: string) {
    return getCourseContentCached(courseDescriptor);
}

const getCourseProgressCached = unstable_cache(
    async (username: string): Promise<Record<string, { score: number; status: string }>> => {
        const supabase = await createServiceRoleClient();
        const { data: progress } = await supabase
            .from('user_progress')
            .select('content_id, score, status')
            .eq('username', username)
            .eq('content_type', 'quiz');

        if (!progress) return {};

        const progressMap: Record<string, { score: number; status: string }> = {};
        for (const item of progress) {
            progressMap[item.content_id] = {
                score: item.score ?? 0,
                status: item.status || 'in_progress',
            };
        }

        return progressMap;
    },
    ['course-quiz-progress-v1'],
    { revalidate: COURSE_QUIZ_PROGRESS_REVALIDATE_SECONDS, tags: ['course-progress'] }
);

export async function getCourseProgress(): Promise<Record<string, { score: number; status: string }>> {
    const session = await getSession();
    if (!session) return {};
    return getCourseProgressCached(session.username);
}
