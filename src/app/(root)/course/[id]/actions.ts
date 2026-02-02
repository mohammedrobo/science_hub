'use server';

import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export interface LessonProgress {
    lessonId: string;
    isCompleted: boolean;
    quizScore: number | null;
}

import { MOCK_COURSES } from '@/lib/constants';

export async function getCourseContent(courseDescriptor: string) {
    const supabase = await createClient();

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
        video_parts: [], // DB doesn't support parts yet
        pdf_url: l.pdf_url,
        quiz_id: l.quiz_id,
        order_index: l.order_index
    }));
}

export async function getCourseProgress(courseCode: string): Promise<Record<string, { score: number; status: string }>> {
    const session = await getSession();
    if (!session) return {};

    const supabase = await createClient();

    // 1. Get all progress for this user
    // We fetch everything for simplicity, or we could filter by course if we had a join.
    // Since content_id in user_progress is the Quiz ID or Lesson ID, we just fetch all 'quiz' progress for now
    // to check the scores.

    const { data: progress } = await supabase
        .from('user_progress')
        .select('content_id, score, status')
        .eq('username', session.username)
        .eq('content_type', 'quiz');

    console.log(`[Server] Progress for ${session.username}:`, progress?.length, "records found");

    if (!progress) return {};

    // Map content_id (Quiz ID) to its progress
    const progressMap: Record<string, { score: number; status: string }> = {};

    progress.forEach(p => {
        progressMap[p.content_id] = {
            score: p.score ?? 0,
            status: p.status || 'in_progress'
        };
    });

    return progressMap;
}
