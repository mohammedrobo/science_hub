import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MOCK_COURSES } from '@/lib/data/mocks';

export const revalidate = 3600;

const CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

// GET /api/courses
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');

    try {
        const supabase = await createClient();
        let query = supabase.from('courses').select('*');

        if (semester) {
            query = query.eq('semester', parseInt(semester));
        }

        const { data, error } = await query.order('code');

        if (error) {
            console.error('Database error:', error);
            // Fallback to mock data if DB fails
            return fetchMockCourses(semester);
        }

        return NextResponse.json(data, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to mock data if unexpected error
        return fetchMockCourses(semester);
    }
}

function fetchMockCourses(semester: string | null) {
    let courses = MOCK_COURSES;

    if (semester) {
        const sem = parseInt(semester);
        courses = courses.filter(c => c.semester === sem);
    }

    // Create a delay to simulate network
    // await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json(courses, { headers: CACHE_HEADERS });
}
