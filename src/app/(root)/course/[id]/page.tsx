import { getCourseContent, getCourseProgress } from './actions';
import { MOCK_COURSES } from '@/lib/data/mocks';
import CourseClient from './CourseClient';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Course } from '@/types';

import { readSession } from '@/lib/auth/session-read';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let course: Course | undefined = MOCK_COURSES.find(c => c.id === id);

    // If not found in static mocks, check the database (for UUIDs)
    if (!course) {
        const supabase = await createClient();
        const { data: dbCourse } = await supabase
            .from('courses')
            .select('*')
            .eq('id', id)
            .single();

        if (dbCourse) {
            course = {
                id: dbCourse.id,
                code: dbCourse.code,
                name: dbCourse.name,
                description: dbCourse.description || "No description available.",
                image_url: dbCourse.image_url || "/logo.png",
                semester: 1, // Default or fetch from DB if needed
                created_at: dbCourse.created_at,
                icon: dbCourse.icon || null
                // No 'color' as it doesn't exist in Course type
            };
        }
    }

    if (!course) {
        return notFound();
    }

    // Server-side Parallel Fetch
    const [lessons, progress] = await Promise.all([
        getCourseContent(id),
        getCourseProgress(course.code)
    ]);



    return (
        <CourseClient
            id={id}
            course={course}
            initialLessons={lessons}
            initialProgress={progress}
        />
    );
}
