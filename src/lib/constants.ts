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

// ============ MOCK COURSES ============
// These match the Supabase seed data in schema.sql

export const MOCK_COURSES: Course[] = [
    // Semester 1
    {
        id: 'm101',
        name: 'Mathematics 1',
        code: 'M101',
        description: 'Fundamental concepts of calculus, algebra, and analytical geometry.',
        semester: 1,
        icon: 'calculator',
        created_at: new Date().toISOString()
    },
    {
        id: 'p101',
        name: 'General Physics 1',
        code: 'P101',
        description: 'Mechanics, properties of matter, and heat.',
        semester: 1,
        icon: 'atom',
        created_at: new Date().toISOString()
    },
    {
        id: 'p103',
        name: 'Practical Physics & Properties of Matter',
        code: 'P103',
        description: 'Laboratory experiments for properties of matter and heat.',
        semester: 1,
        icon: 'flask',
        created_at: new Date().toISOString()
    },
    {
        id: 'c101a',
        name: 'Atomic Chemistry',
        code: 'C101A',
        description: 'Atomic structure, quantum numbers, and chemical bonding.',
        semester: 1,
        icon: 'atom',
        created_at: new Date().toISOString()
    },
    {
        id: 'c101b',
        name: 'Equilibrium Chemistry',
        code: 'C101B',
        description: 'Chemical equilibrium, thermodynamics, and kinetics.',
        semester: 1,
        icon: 'flask',
        created_at: new Date().toISOString()
    },
    {
        id: 'c103',
        name: 'Practical Analytical Chemistry 1',
        code: 'C103',
        description: 'Qualitative analysis and lab techniques.',
        semester: 1,
        icon: 'microscope',
        created_at: new Date().toISOString()
    },
    {
        id: 'z101',
        name: 'General Zoology 1',
        code: 'Z101',
        description: 'Introduction to animal biology, cell structure, and diversity.',
        semester: 1,
        icon: 'dna',
        created_at: new Date().toISOString()
    },
    {
        id: 'g101',
        name: 'Physical Geology',
        code: 'G101',
        description: 'Earth materials, plate tectonics, minerals, and geological structures.',
        semester: 1,
        icon: 'globe',
        created_at: new Date().toISOString()
    },
    {
        id: 'u01',
        name: 'English Language',
        code: 'U01',
        description: 'Academic English reading and writing skills.',
        semester: 1,
        icon: 'book',
        created_at: new Date().toISOString()
    },
    {
        id: 'u02',
        name: 'Human Rights',
        code: 'U02',
        description: 'Principles of human rights and duties.',
        semester: 1,
        icon: 'scale',
        created_at: new Date().toISOString()
    },
    {
        id: 'u03',
        name: 'Environmental Culture (ثقافة بيئية)',
        code: 'U03',
        description: 'Ecological principles and environmental issues.',
        semester: 1,
        icon: 'leaf',
        created_at: new Date().toISOString()
    },

    // Semester 2
    {
        id: 'm102',
        name: 'Mathematics 2',
        code: 'M102',
        description: 'Advanced calculus and integration techniques.',
        semester: 2,
        icon: 'calculator',
        created_at: new Date().toISOString()
    },
    {
        id: 'p102',
        name: 'General Physics 2',
        code: 'P102',
        description: 'Electricity, magnetism, and modern physics.',
        semester: 2,
        icon: 'zap',
        created_at: new Date().toISOString()
    },
    {
        id: 'p104',
        name: 'Practical Physics: Electricity & Optics',
        code: 'P104',
        description: 'Lab experiments in electricity, magnetism, and optics.',
        semester: 2,
        icon: 'lightbulb',
        created_at: new Date().toISOString()
    },
    {
        id: 'c102',
        name: 'General Chemistry 2',
        code: 'C102',
        description: 'Organic chemistry fundamentals.',
        semester: 2,
        icon: 'flask-conical',
        created_at: new Date().toISOString()
    },
    {
        id: 'c104',
        name: 'Practical Organic Chemistry',
        code: 'C104',
        description: 'Lab techniques in organic chemistry.',
        semester: 2,
        icon: 'test-tube',
        created_at: new Date().toISOString()
    },
    {
        id: 'g102',
        name: 'Historical Geology',
        code: 'G102',
        description: 'History of the Earth and life evolution.',
        semester: 2,
        icon: 'hourglass',
        created_at: new Date().toISOString()
    },
    {
        id: 'z102',
        name: 'General Zoology 2',
        code: 'Z102',
        description: 'Advanced animal physiology and anatomy.',
        semester: 2,
        icon: 'bug',
        created_at: new Date().toISOString()
    },
    {
        id: 'b101',
        name: 'General Botany',
        code: 'B101',
        description: 'Plant biology, structure, and classification.',
        semester: 2,
        icon: 'flower',
        created_at: new Date().toISOString()
    },
    {
        id: 'comp101',
        name: 'Introduction to Computer',
        code: 'COMP101',
        description: 'Basics of computer science and usage.',
        semester: 2,
        icon: 'monitor',
        created_at: new Date().toISOString()
    },
    {
        id: 'so100',
        name: 'Societal Issues',
        code: 'SO100',
        description: 'Contemporary social problems and analysis.',
        semester: 2,
        icon: 'users',
        created_at: new Date().toISOString()
    }
];

// ============ MOCK LESSONS ============
// Organized by course code - synced manually from ~/projects link files

export const MOCK_LESSONS: Record<string, Lesson[]> = {
    // Mathematics M101
    'M101': [
        {
            id: 'm101-l1',
            course_id: 'm101',
            title: 'Lecture 1: Determinants',
            video_url: null, // Main URL null because we have parts
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/mNFevMZcb5g' },
                { title: 'Part 2', url: 'https://youtu.be/o3hvR_8nIkk' },
                { title: 'Part 3', url: 'https://youtu.be/Ef3RIKwO-fw' },
                { title: 'Part 4', url: 'https://youtu.be/YRhe2YYjJNQ' }
            ],
            pdf_url: '/pdfs/M101/lec_1_Determinants (1).pdf',
            quiz_id: 'm101-quiz-1',
            order_index: 0
        },
        {
            id: 'm101-l2',
            course_id: 'm101',
            title: 'Lecture 2: Matrices',
            video_url: 'https://youtube.com/playlist?list=PLy-0y1RosLEe5xfGlG-xklUQincKiBbTP',
            pdf_url: '/pdfs/M101/new_matrices.pdf',
            quiz_id: null,
            order_index: 1
        },
        {
            id: 'm101-l3',
            course_id: 'm101',
            title: 'Lecture 3: Partial Fractions',
            video_url: 'https://youtu.be/MwL5bSFIxXs',
            pdf_url: null,
            quiz_id: null,
            order_index: 2
        },
        {
            id: 'm101-l4',
            course_id: 'm101',
            title: 'Lecture 4: Infinite Series',
            video_url: 'https://youtu.be/-YQ_Cu8EeEA',
            pdf_url: '/pdfs/M101/4. Infinite series.pdf',
            quiz_id: null,
            order_index: 3
        },
        {
            id: 'm101-l5',
            course_id: 'm101',
            title: 'Lecture 5: Pair of Straight Lines',
            video_url: 'https://youtu.be/fKyR5wUuV_I',
            pdf_url: '/pdfs/M101/6-Pair of straight lines.pdf',
            quiz_id: null,
            order_index: 4
        },
        {
            id: 'm101-l6',
            course_id: 'm101',
            title: 'Lecture 6: General Equation of Two Straight Lines',
            video_url: null,
            pdf_url: '/pdfs/M101/General equation of two straight lines.pdf',
            quiz_id: null,
            order_index: 5
        },
        {
            id: 'm101-l7',
            course_id: 'm101',
            title: 'Lecture 7: Translation & Rotation of Axes',
            video_url: 'https://youtu.be/EoCBWEXUafc',
            pdf_url: null,
            quiz_id: null,
            order_index: 6
        },
        {
            id: 'm101-l8',
            course_id: 'm101',
            title: 'Lecture 8: Circle Part 1',
            video_url: 'https://youtu.be/FBtLbtAyTDY',
            pdf_url: '/pdfs/M101/9. Circle 1.pdf',
            quiz_id: null,
            order_index: 7
        },
        {
            id: 'm101-l9',
            course_id: 'm101',
            title: 'Lecture 9: Circle Part 2',
            video_url: null,
            pdf_url: '/pdfs/M101/10. Circle 2.pdf',
            quiz_id: null,
            order_index: 8
        },
        // Parabola - Combined into video_parts
        {
            id: 'm101-l10',
            course_id: 'm101',
            title: 'Lecture 10: Parabola',
            video_url: null,
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/LdObFj-rLHc' },
                { title: 'Part 2', url: 'https://youtu.be/vBzQ1Hl-ePU' },
                { title: 'Part 3', url: 'https://youtu.be/d6Y_zEyr8JU' },
                { title: 'Part 4', url: 'https://youtu.be/2SFTgIeBk-0' }
            ],
            pdf_url: '/pdfs/M101/Parabola (1).pdf',
            quiz_id: null,
            order_index: 9
        },
        {
            id: 'm101-l11',
            course_id: 'm101',
            title: 'Lecture 11: Ellipse',
            video_url: null,
            pdf_url: '/pdfs/M101/Ellipse القطع الناقص (1).pdf',
            quiz_id: null,
            order_index: 13
        }
    ],

    // Atomic Chemistry C101A
    'C101A': [
        {
            id: 'c101a-l1',
            course_id: 'c101a',
            title: 'Lecture 1: Atomic Models (Thomson, Rutherford, Bohr)',
            video_url: 'https://youtu.be/HNGz5cBAjEc', // English Thomson
            pdf_url: '/pdfs/C101/محاضره 1 كيميا.pdf',
            quiz_id: 'c101-quiz-1',
            order_index: 0
        },
        {
            id: 'c101a-l2',
            course_id: 'c101a',
            title: 'Lecture 2: Quantum Numbers & Electron Configuration',
            video_url: 'https://youtu.be/H6jvc9z7nes',
            pdf_url: null,
            quiz_id: 'c101-quiz-2',
            order_index: 1
        },
        {
            id: 'c101a-l3',
            course_id: 'c101a',
            title: 'Lecture 3: Atomic Orbitals & Effective Nuclear Charge',
            video_url: 'https://youtu.be/nNkw_0c8vY0', // English Atomic Orbitals
            pdf_url: '/pdfs/C101/محاضره 3 كيميا.pdf',
            quiz_id: 'c101-quiz-3',
            order_index: 2
        },
        {
            id: 'c101a-l4',
            course_id: 'c101a',
            title: 'Lecture 4: Atomic Sizes',
            video_url: null,
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/fP310oRWFh4' },
                { title: 'Part 2', url: 'https://youtu.be/Ilf4PwjkNcM' }
            ],
            pdf_url: '/pdfs/C101/محاضره 4 كيميا.pdf',
            quiz_id: null,
            order_index: 3
        },
        {
            id: 'c101a-l5',
            course_id: 'c101a',
            title: 'Lecture 5: Chemical Bonds',
            video_url: null,
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/gob8bcZn7lk' },
                { title: 'Part 2', url: 'https://youtu.be/oobtzvU0ilM' }
            ],
            pdf_url: '/pdfs/C101/محاضره 5 كيميا-1.pdf',
            quiz_id: 'c101-quiz-5',
            order_index: 4
        },
        {
            id: 'c101a-l6',
            course_id: 'c101a',
            title: 'Lecture 6: Advanced Bonding',
            video_url: 'https://youtu.be/hWn8lNcxdAg', // Lewis base Part 1
            pdf_url: '/pdfs/C101/محاضره 6 كيميا.pdf',
            quiz_id: 'c101-quiz-6',
            order_index: 7
        }
    ],

    // Equilibrium Chemistry C101B
    'C101B': [
        {
            id: 'c101b-l1',
            course_id: 'c101b',
            title: 'Lecture 1: Chemical Equilibrium',
            video_url: null,
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/hVoHD0Ve-7k' },
                { title: 'Part 2', url: 'https://youtu.be/y29JbJ7JU1w' }
            ],
            pdf_url: '/pdfs/C101/CH101-Lect-7 السابعة .pdf',
            quiz_id: 'c101-quiz-7',
            order_index: 0
        },
        {
            id: 'c101b-l2',
            course_id: 'c101b',
            title: 'Lecture 2: Chemical Equilibrium II',
            video_url: 'https://youtu.be/_PzmUTlrSb0',
            pdf_url: '/pdfs/C101/CH101-Lect-8 الثامنة.pdf',
            quiz_id: 'c101-quiz-8',
            order_index: 1
        },
        {
            id: 'c101b-l3',
            course_id: 'c101b',
            title: 'Lecture 3: Equilibrium Constants',
            video_url: null,
            video_parts: [
                { title: 'Part 1', url: 'https://youtu.be/0b8XDNWFus0' },
                { title: 'Part 2', url: 'https://youtu.be/wyfuG7mNrYs' }
            ],
            pdf_url: '/pdfs/C101/CH101-Lect-9 التاسعة.pdf',
            quiz_id: 'c101-quiz-9',
            order_index: 2
        },
        {
            id: 'c101b-l4',
            course_id: 'c101b',
            title: 'Lecture 4: Thermodynamics',
            video_url: null,
            pdf_url: '/pdfs/C101/CH101-Lect-10 العاشرة.pdf',
            quiz_id: null,
            order_index: 3
        },
        {
            id: 'c101b-l5',
            course_id: 'c101b',
            title: 'Lecture 5: Equilibrium Calculations',
            video_url: 'https://youtu.be/jQM8DySo0SM',
            pdf_url: '/pdfs/C101/CH101-Lect-11.pdf',
            quiz_id: 'c101-quiz-11',
            order_index: 4
        }
    ],

    // Physical Geology G101
    'G101': [
        {
            id: 'g101-l1',
            course_id: 'g101',
            title: 'Lecture 1: Introduction to Physical Geology',
            video_url: 'https://youtu.be/8m_brACQbGI',
            pdf_url: '/pdfs/G101/G101 Lecture 1.pdf',
            quiz_id: null,
            order_index: 0
        },
        {
            id: 'g101-l2',
            course_id: 'g101',
            title: 'Lecture 2: Solar System & Earth Structure',
            video_url: 'https://youtu.be/qvVurOStqwI',
            pdf_url: '/pdfs/G101/G101_Physical_Geology__lect.2_solar_system_and_earth.pdf',
            quiz_id: 'g101-quiz-2',
            order_index: 1
        },
        {
            id: 'g101-l3',
            course_id: 'g101',
            title: 'Lecture 3: Plate Tectonics',
            video_url: 'https://youtu.be/Ovho7p9x4lw',
            pdf_url: '/pdfs/G101/lect.3 plate tectonic - .pdf',
            quiz_id: 'g101-quiz-3',
            order_index: 2
        },
        {
            id: 'g101-l4',
            course_id: 'g101',
            title: 'Lecture 4: Geological Structures',
            video_url: 'https://youtube.com/playlist?list=PLT4s87tlg69f-4uqtwnSXkwmSO0t4ySdV',
            pdf_url: '/pdfs/G101/lec 4 structure - .pdf',
            quiz_id: 'g101-quiz-4',
            order_index: 3
        },
        {
            id: 'g101-l5',
            course_id: 'g101',
            title: 'Lecture 5: Minerals',
            video_url: null,
            pdf_url: '/pdfs/G101/lec 5 minerals .pdf',
            quiz_id: 'g101-quiz-5',
            order_index: 4
        },
        {
            id: 'g101-l6',
            course_id: 'g101',
            title: 'Lecture 6: Rocks',
            video_url: null,
            pdf_url: '/pdfs/G101/G101 physical geology Lec.6 rocks.pdf',
            quiz_id: 'g101-quiz-6',
            order_index: 5
        },
        {
            id: 'g101-l7',
            course_id: 'g101',
            title: 'Lecture 7: Weathering',
            video_url: null,
            pdf_url: '/pdfs/G101/G101 Physical Geology Lecture 7 Weathering.pdf',
            quiz_id: 'g101-quiz-7',
            order_index: 6
        }
    ],

    // Zoology Z101
    'Z101': [
        {
            id: 'z101-l1',
            course_id: 'z101',
            title: 'Lecture 1: Cell Structure',
            video_url: 'https://youtu.be/vwAJ8ByQH2U',
            pdf_url: '/pdfs/Z101/General Biology Lecture 1.pdf',
            quiz_id: null,
            order_index: 0
        },
        {
            id: 'z101-l2',
            course_id: 'z101',
            title: 'Lecture 2: Cell Biology',
            video_url: null,
            pdf_url: '/pdfs/Z101/General Biology Lecture 2.pdf',
            quiz_id: null,
            order_index: 1
        },
        {
            id: 'z101-l3',
            course_id: 'z101',
            title: 'Lecture 3: Cell Components',
            video_url: null,
            pdf_url: '/pdfs/Z101/General Biology Lecture 3.pdf',
            quiz_id: null,
            order_index: 2
        },
        {
            id: 'z101-l4',
            course_id: 'z101',
            title: 'Lecture 4: Advanced Cell Biology',
            video_url: null,
            pdf_url: '/pdfs/Z101/General Biology Lecture 4.pdf',
            quiz_id: null,
            order_index: 3
        },
        {
            id: 'z101-l5',
            course_id: 'z101',
            title: 'Lecture 5: Endoplasmic Reticulum',
            video_url: 'https://youtu.be/-Ejq674xbSA',
            pdf_url: null,
            quiz_id: null,
            order_index: 4
        },
        {
            id: 'z101-l6',
            course_id: 'z101',
            title: 'Lecture 6: Cancer Biology Part 1',
            video_url: 'https://youtube.com/playlist?list=PL8OvHeW9CohtZw-4tAcUd7GVXjHs-MhXg',
            pdf_url: '/pdfs/Z101/Cancer Biology.pdf',
            quiz_id: null,
            order_index: 5
        },
        {
            id: 'z101-l7',
            course_id: 'z101',
            title: 'Lecture 7: Cancer Biology Part 2',
            video_url: null,
            pdf_url: '/pdfs/Z101/Caner_2.pdf',
            quiz_id: null,
            order_index: 6
        },
        {
            id: 'z101-l8',
            course_id: 'z101',
            title: 'Lecture 8: Cell Cycle Part 1',
            video_url: 'https://youtu.be/a03HZLzlRks',
            pdf_url: '/pdfs/Z101/The Cell Cycle 1.pdf',
            quiz_id: null,
            order_index: 7
        },
        {
            id: 'z101-l9',
            course_id: 'z101',
            title: 'Lecture 9: Cell Cycle Part 2',
            video_url: null,
            pdf_url: '/pdfs/Z101/The Cell Cycle 2.pdf',
            quiz_id: null,
            order_index: 8
        },
        {
            id: 'z101-l10a',
            course_id: 'z101',
            title: 'Lecture 10: Diversity & Kingdoms (Part 1)',
            video_url: 'https://youtu.be/4jzNbj9WBAs',
            pdf_url: '/pdfs/Z101/General Zoology 1 - Lecture 7.pdf',
            quiz_id: null,
            order_index: 9
        },
        {
            id: 'z101-l10b',
            course_id: 'z101',
            title: 'Lecture 10: Diversity & Kingdoms (Part 2)',
            video_url: 'https://youtu.be/lzQd3EtBhMo',
            pdf_url: null,
            quiz_id: null,
            order_index: 10
        },
        {
            id: 'z101-l10c',
            course_id: 'z101',
            title: 'Lecture 10: Diversity & Kingdoms (Part 3)',
            video_url: 'https://youtu.be/bg8_sN3Q1Pg',
            pdf_url: null,
            quiz_id: null,
            order_index: 11
        },
        {
            id: 'z101-l10d',
            course_id: 'z101',
            title: 'Lecture 10: Diversity & Kingdoms (Part 4)',
            video_url: 'https://youtu.be/_j4BbMr2TIY',
            pdf_url: null,
            quiz_id: null,
            order_index: 12
        },
        {
            id: 'z101-l11',
            course_id: 'z101',
            title: 'Lecture 11: Classification of Kingdoms',
            video_url: null,
            pdf_url: '/pdfs/Z101/kingdoms.pdf',
            quiz_id: null,
            order_index: 13
        },
        {
            id: 'z101-l12',
            course_id: 'z101',
            title: 'Lecture 12: Histology',
            video_url: null,
            pdf_url: '/pdfs/Z101/Histology.pdf',
            quiz_id: null,
            order_index: 14
        },
        {
            id: 'z101-l13',
            course_id: 'z101',
            title: 'Lecture 13: Immunity',
            video_url: null,
            pdf_url: '/pdfs/Z101/immunity (1).pdf',
            quiz_id: null,
            order_index: 15
        },
        {
            id: 'z101-l14',
            course_id: 'z101',
            title: 'Lecture 14: Comparative Anatomy',
            video_url: null,
            pdf_url: '/pdfs/Z101/General Biology Lecture 9.pdf',
            quiz_id: null,
            order_index: 16
        }
    ]
};

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
