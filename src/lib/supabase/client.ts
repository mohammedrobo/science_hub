import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import type { Course, Lesson } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Comprehensive Headers Polyfill (Browser Extension / Edge Case Fix)
// Some environments have broken Headers implementation
if (typeof Headers !== 'undefined') {
    // Polyfill .has() if missing
    if (!Headers.prototype.has) {
        Headers.prototype.has = function (name: string): boolean {
            try {
                // @ts-ignore - Access internal storage
                const entries = this._headers || this.entries?.() || [];
                for (const [key] of entries) {
                    if (key.toLowerCase() === name.toLowerCase()) return true;
                }
                return false;
            } catch {
                return false;
            }
        };
    }

    // Polyfill .get() if missing
    if (!Headers.prototype.get) {
        Headers.prototype.get = function (name: string): string | null {
            try {
                // @ts-ignore
                const entries = this._headers || this.entries?.() || [];
                for (const [key, value] of entries) {
                    if (key.toLowerCase() === name.toLowerCase()) return value;
                }
                return null;
            } catch {
                return null;
            }
        };
    }

    // Polyfill .set() if missing
    if (!Headers.prototype.set) {
        Headers.prototype.set = function (name: string, value: string): void {
            try {
                // @ts-ignore
                if (!this._headers) this._headers = new Map();
                // @ts-ignore
                this._headers.set(name.toLowerCase(), value);
            } catch (e) {
                console.warn('Headers.set polyfill failed:', e);
            }
        };
    }

    // Polyfill .append() if missing
    if (!Headers.prototype.append) {
        Headers.prototype.append = function (name: string, value: string): void {
            try {
                if (typeof this.has === 'function' && typeof this.get === 'function' && typeof this.set === 'function') {
                    if (this.has(name)) {
                        this.set(name, this.get(name) + ', ' + value);
                    } else {
                        this.set(name, value);
                    }
                } else {
                    // @ts-ignore
                    this[name] = value;
                }
            } catch (e) {
                console.warn('Headers.append polyfill failed:', e);
            }
        };
    }
}

// Create typed Supabase client with failover
let client: ReturnType<typeof createBrowserClient<Database>>;

try {
    client = createBrowserClient<Database>(supabaseUrl, supabaseKey);
} catch (error) {
    console.warn('createBrowserClient failed, trying fallback...', error);

    // Explicit manual client creation to bypass some hooks
    client = createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }) as any;
}

export const supabase = client;

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    return supabaseUrl.length > 0 &&
        supabaseKey.length > 0 &&
        !supabaseUrl.includes('your-project') &&
        !supabaseUrl.includes('placeholder');
};

// ============ COURSE HELPERS ============

export async function getCourses(semester?: number): Promise<Course[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = supabase.from('courses').select('*');

        if (semester) {
            query = query.eq('semester', semester);
        }

        const { data, error } = await query.order('code');

        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error('Supabase error:', e);
        return [];
    }
}

export async function getCourseById(id: string): Promise<Course | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching course:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Supabase error:', e);
        return null;
    }
}

export async function getCourseByCode(code: string): Promise<Course | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            console.error('Error fetching course:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Supabase error:', e);
        return null;
    }
}

// ============ LESSON HELPERS ============

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index');

        if (error) {
            console.error('Error fetching lessons:', error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error('Supabase error:', e);
        return [];
    }
}

// ============ QUIZ HELPERS ============
// Quiz helpers use raw queries since the tables might not exist yet

export interface QuizData {
    id: string;
    course_id: string;
    lesson_id: string | null;
    title: string;
    description: string | null;
    created_at: string;
    questions: QuestionData[];
}

export interface QuestionData {
    id: string;
    quiz_id: string;
    type: 'mcq' | 'true_false' | 'fill_blank';
    text: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string | null;
    order_index: number;
}

export async function getQuizById(id: string): Promise<QuizData | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        // Use raw query to avoid type issues with tables that might not exist
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .single();

        if (quizError || !quiz) {
            console.error('Error fetching quiz:', quizError);
            return null;
        }

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', id)
            .order('order_index');

        if (questionsError) {
            console.error('Error fetching questions:', questionsError);
        }

        // Cast to our interface since types might not align perfectly
        const quizData = quiz as unknown as Omit<QuizData, 'questions'>;

        return {
            ...quizData,
            questions: (questions as unknown as QuestionData[]) || []
        };
    } catch (e) {
        console.error('Supabase error:', e);
        return null;
    }
}

export async function getQuizzesByCourse(courseId: string): Promise<Omit<QuizData, 'questions'>[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('course_id', courseId)
            .order('title');

        if (error) {
            console.error('Error fetching quizzes:', error);
            return [];
        }

        return (data as unknown as Omit<QuizData, 'questions'>[]) || [];
    } catch (e) {
        console.error('Supabase error:', e);
        return [];
    }
}
