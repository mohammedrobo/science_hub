
import fs from 'fs';
import path from 'path';
import { COURSES_DATA } from '../lib/seed';
import { MOCK_COURSES, MOCK_LESSONS } from '../lib/constants';

// Manual Video URL Map (Lesson ID -> URL)
// We extract this from the IMPORTED constants to preserve existing links
const VIDEO_MAP: Record<string, string> = {};
Object.values(MOCK_LESSONS).flat().forEach(l => {
    if (l.video_url) {
        // normalized ID matching (some might be inconsistent)
        const simplifiedId = l.id.toLowerCase().replace('lec-', 'l');
        VIDEO_MAP[simplifiedId] = l.video_url;
        // Also map by "CourseID-Order" as fallback? 
        // Better: Map by "CourseID-LectureNum"
        // But let's stick to ID first.
    }
});

// Helper to preserve metadata (icons, specific descriptions) from existing constants
const COURSE_META: Record<string, any> = {};
MOCK_COURSES.forEach(c => {
    COURSE_META[c.code] = {
        icon: c.icon,
        description: c.description
    };
});

const FINAL_COURSES = COURSES_DATA.map(seedCourse => {
    const meta = COURSE_META[seedCourse.code] || {};
    return {
        ...seedCourse,
        // Preserve icon and manual description if available
        icon: meta.icon || seedCourse.icon,
        description: meta.description || seedCourse.description,
        lessons: undefined // Remove lessons from the Course object itself
    };
});

const FINAL_LESSONS: Record<string, any[]> = {};

COURSES_DATA.forEach(seedCourse => {
    const lessons = seedCourse.lessons.map(l => {
        // Try to find a video URL
        // Method 1: Exact ID match
        let video = VIDEO_MAP[l.id];

        // Method 2: Fuzzy match if ID changed slightly (e.g. c101a-l1 vs c101a-lec-1)
        if (!video) {
            const keys = Object.keys(VIDEO_MAP);
            const match = keys.find(k => k.replace(/[^a-z0-9]/g, '') === l.id.replace(/[^a-z0-9]/g, ''));
            if (match) video = VIDEO_MAP[match];
        }

        return {
            ...l,
            video_url: video || null
        };
    });

    FINAL_LESSONS[seedCourse.code] = lessons;
});

// Generate Output String
const OUTPUT = `import { Course, Lesson } from '@/types';

// ============ MOCK COURSES ============
// Generated from src/lib/seed.ts

export const MOCK_COURSES: Course[] = ${JSON.stringify(FINAL_COURSES, null, 4)};

// ============ MOCK LESSONS ============

export const MOCK_LESSONS: Record<string, Lesson[]> = ${JSON.stringify(FINAL_LESSONS, null, 4)};

// Helper to get lessons for a course
export function getLessonsForCourse(courseCode: string): Lesson[] {
    return MOCK_LESSONS[courseCode] || [];
}

// Helper to get course by ID
export function getCourseById(id: string): Course | undefined {
    return MOCK_COURSES.find(c => c.id === id);
}

// Helper to get course by code
export function getCourseByCode(code: string): Course | undefined {
    return MOCK_COURSES.find(c => c.code === code);
}
`;

// Write to file
const CONSTANTS_PATH = path.join(__dirname, '../lib/constants.ts');
fs.writeFileSync(CONSTANTS_PATH, OUTPUT);

console.log('constants.ts regenerated successfully!');
