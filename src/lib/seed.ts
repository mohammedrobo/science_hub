
import { Course, Lesson, Semester } from '../types';

// ==========================================
// 1. RAW DATA MAPPING
// ==========================================
// This data mirrors the User's local file structure exactly as scanned.

const RAW_COURSES = [
    {
        courseCode: "C101A",
        title: "Atomic Chemistry",
        semester: 1 as Semester,
        description: "Introduction to Atomic Theory and Structure",
        files: {
            pdfs: [
                "محاضره 1 كيميا.pdf",
                "محاضره 3 كيميا.pdf",
                "محاضره 4 كيميا.pdf",
                "محاضره 5 كيميا-1.pdf",
                "محاضره 6 كيميا.pdf"
            ],
            quizzes: [] as string[]
        }
    },
    {
        courseCode: "C101B",
        title: "Equilibrium Chemistry",
        semester: 1 as Semester,
        description: "Chemical Equilibrium and Kinetics",
        files: {
            pdfs: [
                "CH101-Lect-7 السابعة .pdf",
                "CH101-Lect-8 الثامنة.pdf",
                "CH101-Lect-9 التاسعة.pdf",
                "CH101-Lect-10 العاشرة.pdf",
                "L1  اتزان كيميائى.pdf",
                "L2   اتزان كيميائى (1).pdf",
                "Lec 3.pdf",
                "Lec.5.pdf",
                "Lec.6.pdf",
                "Lec.7.pdf",
                "Lec.8 (1).pdf",
                "Lec.9.pdf",
                "Lec.10.pdf",
                "Lec.3 (1).pdf"
            ],
            quizzes: [
                "lec10_quiz.md",
                "lec2_quiz.md",
                "lec3_quiz.md",
                "lec5_quiz.md",
                "lec6_quiz.md",
                "lec7_quiz.md",
                "lec8_quiz.md",
                "lec9_quiz.md",
                "lec_1_quiz.md"
            ]
        }
    },
    {
        courseCode: "G101",
        title: "Physical Geology",
        semester: 1 as Semester,
        description: "Fundamentals of Physical Geology",
        files: {
            pdfs: [
                "G101 Lecture 1.pdf",
                "G101 Physical Geology Lecture 7 Weathering.pdf",
                "G101 physical geology Lec.6 rocks.pdf",
                "G101_Physical_Geology__lect.2_solar_system_and_earth.pdf",
                "lec 4 structure - .pdf",
                "lec 5 minerals .pdf",
                "lect.3 plate tectonic - .pdf"
            ],
            quizzes: [
                "lec2_quiz.md",
                "lec3_quiz.md",
                "lec4_quiz.md",
                "lec5_quiz.md",
                "lec6-part_two_quiz.md",
                "lec6_quiz.md",
                "lec7_quiz.md"
                // Missing lec1 quiz?
            ]
        }
    },
    {
        courseCode: "M101",
        title: "Mathematics",
        semester: 1 as Semester,
        description: "Calculus and Analytical Geometry",
        files: {
            pdfs: [
                "10. Circle 2.pdf",
                "11. Conic Sections_Parabola.pdf",
                "4. Infinite series.pdf",
                "6-Pair of straight lines.pdf",
                "9. Circle 1.pdf",
                "Ellipse القطع الناقص (1).pdf", // Needs manual mapping or smart title
                "General equation of two straight lines.pdf",
                "Parabola (1).pdf",
                "lec_1_Determinants (1).pdf",
                "new_matrices.pdf"
            ],
            quizzes: [] as string[]
        }
    },
    {
        courseCode: "Z101",
        title: "Zoology",
        semester: 1 as Semester,
        description: "General Zoology and Biology",
        files: {
            pdfs: [
                "Cancer Biology.pdf",
                "Caner_2.pdf",
                "General Biology Lecture 1.pdf",
                "General Biology Lecture 2.pdf",
                "General Biology Lecture 3.pdf",
                "General Biology Lecture 4.pdf",
                "General Biology Lecture 9.pdf",
                "General Zoology 1 - Lecture 7.pdf",
                "Histology.pdf",
                "The Cell Cycle 1.pdf",
                "The Cell Cycle 2.pdf",
                "experimental animals - Copy.pdf",
                "immunity (1).pdf",
                "kingdoms.pdf"
            ],
            quizzes: [] as string[]
        }
    }
];

// ==========================================
// 2. INTELLIGENT HELPERS
// ==========================================

/**
 * Extracts a lesson number from various filename patterns.
 * e.g., "Lec 5" -> 5
 * e.g., "10. Circle" -> 10
 */
function extractLessonNumber(filename: string): number | null {
    const lower = filename.toLowerCase();

    // 1. Explicit "Lecture X" or "Lec X" patterns
    // Matches: "Lec.5", "Lecture 7", "Lect-9", "L2"
    const lecMatch = lower.match(/(?:lec|lect|lecture|l)[a-z]*[-._\s]*(\d+)/i);
    if (lecMatch && lecMatch[1]) {
        return parseInt(lecMatch[1], 10);
    }

    // 2. Start-of-sentence specific for Math "10. Circle"
    const startNumMatch = lower.match(/^(\d+)[-.]/);
    if (startNumMatch && startNumMatch[1]) {
        return parseInt(startNumMatch[1], 10);
    }

    // 3. Arabic specific: "محاضره X" (Lecture X)
    const arabicMatch = lower.match(/محاضره\s*(\d+)/);
    if (arabicMatch && arabicMatch[1]) {
        return parseInt(arabicMatch[1], 10);
    }

    // 4. Special cases based on keywords if no number (Ordering fallback)
    if (lower.includes("intro")) return 1;

    return null;
}

/**
 * Cleans up filenames to generate pretty Titles.
 */
function cleanTitle(filename: string, num: number | null): string {
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, "");

    // Specific mappings
    if (name.includes("new_matrices")) return "Matrices";
    if (name.includes("immunity")) return "Immunity";
    if (name.includes("The Cell Cycle")) return name.replace(/[0-9]/g, "").trim(); // "The Cell Cycle"

    // Standard Cleaning
    // Remove "G101", "CH101" prefixes
    name = name.replace(/^[A-Z]+\d+[A-Z]*[-_\s]*/i, "");

    // Remove "Lecture X", "Lec.5", "محاضره 1"
    name = name.replace(/(?:lec|lect|lecture|l|محاضره)[a-z]*[-._\s]*\d+/gi, "");
    name = name.replace(/^\d+[-.]/, ""); // Remove "10. "

    // Remove Arabic text if mixed (optional, but requested "nice titles")
    // For now we keep useful Arabic descriptors if they are the ONLY thing, 
    // but remove clutter.
    // E.g. "L1 اتزان كيميائى" -> "Chemical Equilibrium" (Hard to translate auto, so we clean delimiters)

    name = name.replace(/[-_]/g, " ").trim();
    name = name.replace(/\s+/g, " ");

    // If result is empty or just special chars, fall back to generic
    if (name.length < 2 || name.match(/^[^a-zA-Z0-9\u0600-\u06FF]+$/)) {
        return num ? `Lecture ${num}` : "Supplemental Material";
    }

    // Capitalize
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Finds a specific quiz file for a lesson number.
 */
function findQuiz(lessonNum: number | null, quizList: string[]): string | null {
    if (lessonNum === null) return null;

    return quizList.find(q => {
        const qNum = extractLessonNumber(q);
        return qNum === lessonNum;
    }) || null;
}

// ==========================================
// 3. EXPORTED DATA
// ==========================================

export const COURSES_DATA: (Course & { lessons: Lesson[] })[] = RAW_COURSES.map(course => {
    const courseId = course.courseCode.toLowerCase();
    const currentDetails = {
        id: courseId,
        name: course.title,
        code: course.courseCode,
        description: course.description,
        semester: course.semester,
        icon: null,
        created_at: new Date().toISOString()
    };

    // Process Lessons
    // We strictly map 1 PDF -> 1 Lesson
    const lessons: Lesson[] = course.files.pdfs.map((pdf, idx) => {
        const num = extractLessonNumber(pdf);
        const titleRaw = cleanTitle(pdf, num);
        const quizFile = findQuiz(num, course.files.quizzes);

        // Final Title Polish: Add Number if valid
        const finalTitle = num
            ? `Lecture ${num}: ${titleRaw === "Material" ? "Topic" : titleRaw}`
            : titleRaw;

        return {
            id: `${courseId}-l${num || 'extra-' + idx}`,
            course_id: courseId,
            title: finalTitle.replace(/: \s*$/, ""), // Remove trailing colon if title matched nothing
            video_url: num ? null : null, // Reset to null, will be populated by merger if needed
            pdf_url: `/pdfs/${course.courseCode}/${pdf}`, // Assumed storage path
            quiz_id: quizFile ? `${courseId}-quiz-${num}` : null,
            order_index: num ?? (999 + idx), // Sort known numbers first, others later
            created_at: new Date().toISOString()
        };
    });

    // Sort
    lessons.sort((a, b) => a.order_index - b.order_index);

    return {
        ...currentDetails,
        lessons
    };
});
