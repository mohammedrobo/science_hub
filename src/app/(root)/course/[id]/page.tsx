import { getCourseContent, getCourseProgress } from './actions';
import { MOCK_COURSES } from '@/lib/data/mocks';
import CourseClient from './CourseClient';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Course } from '@/types';
import { unstable_cache } from 'next/cache';

export async function generateStaticParams() {
    return MOCK_COURSES.map((course) => ({
        id: course.id,
    }));
}

export const revalidate = 1800; // 30 min ISR
export const dynamicParams = true; // Allow UUID params not in generateStaticParams

const getCourseByIdCached = unstable_cache(
    async (courseId: string) => {
        const supabase = await createServiceRoleClient();
        const { data: dbCourse } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
        return dbCourse;
    },
    ['course-by-id-v1'],
    { revalidate: 3600, tags: ['lessons'] }
);

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let course: Course | undefined = MOCK_COURSES.find(c => c.id === id);

    // If not found in static mocks, check the database (for UUIDs)
    if (!course) {
        const dbCourse = await getCourseByIdCached(id);

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
            };
        }
    }

    if (!course) {
        return notFound();
    }

    // Server-side Parallel Fetch
    const [lessons, progress] = await Promise.all([
        getCourseContent(id),
        getCourseProgress()
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
