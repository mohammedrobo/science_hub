import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { MOCK_COURSES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/courses
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const semester = searchParams.get('semester');

        // Check if Supabase is configured
        if (isSupabaseConfigured()) {
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

            return NextResponse.json(data);
        } else {
            // Return mock data if no DB
            return fetchMockCourses(semester);
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    return NextResponse.json(courses);
}
