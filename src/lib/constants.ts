import { Course, Lesson } from '@/types';

// ============ COURSE SUB-SECTIONS ============
// For courses that need to be grouped by instructor or topic

export const P102_INSTRUCTORS = [
    { id: 'essam', name: 'Dr. Essam', nameAr: 'د. عصام' },
    { id: 'wagida', name: 'Dr. Wagida', nameAr: 'د. واجدة' },
    { id: 'mohammed', name: 'Dr. Mohammed', nameAr: 'د. محمد' }
];

export const C102_SECTIONS = [
    { id: 'physical', name: 'Physical Chemistry', nameAr: 'كيمياء فيزيائية' },
    { id: 'organic', name: 'Organic Chemistry', nameAr: 'كيمياء عضوية' }
];

// Map of courses that require sub-section selection during upload
export const COURSE_SUBSECTIONS: Record<string, {
    type: 'instructor' | 'section';
    label: string;
    options: { id: string; name: string; nameAr?: string }[]
}> = {
    'p102': { type: 'instructor', label: 'Select Doctor', options: P102_INSTRUCTORS },
    'c102': { type: 'section', label: 'Select Section', options: C102_SECTIONS }
};

// ============ MOCK COURSES & LESSONS ============
// Moved to @/lib/data/mocks.ts to improve bundle size
