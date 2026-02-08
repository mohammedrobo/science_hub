import { create } from 'zustand';

interface LessonContext {
    courseId: string | null;
    lessonId: string | null;
    lessonTitle: string | null;
    pdfUrl: string | null;
    videoUrl: string | null;
}

interface LessonStore extends LessonContext {
    setLessonContext: (context: Partial<LessonContext>) => void;
    clearContext: () => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
    courseId: null,
    lessonId: null,
    lessonTitle: null,
    pdfUrl: null,
    videoUrl: null,

    setLessonContext: (context) => set((state) => ({ ...state, ...context })),
    clearContext: () => set({
        courseId: null,
        lessonId: null,
        lessonTitle: null,
        pdfUrl: null,
        videoUrl: null
    })
}));
