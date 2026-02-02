// Database types generated from Supabase schema
// Run schema.sql, schema_lessons.sql, and schema_quizzes.sql in Supabase SQL Editor

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            courses: {
                Row: {
                    id: string
                    name: string
                    code: string
                    description: string | null
                    semester: number
                    icon: string | null
                    image_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    code: string
                    description?: string | null
                    semester: number
                    icon?: string | null
                    image_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    code?: string
                    description?: string | null
                    semester?: number
                    icon?: string | null
                    image_url?: string | null
                    created_at?: string
                }
            }
            lessons: {
                Row: {
                    id: string
                    course_id: string
                    title: string
                    video_url: string | null
                    pdf_url: string | null
                    quiz_id: string | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    course_id: string
                    title: string
                    video_url?: string | null
                    pdf_url?: string | null
                    quiz_id?: string | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    course_id?: string
                    title?: string
                    video_url?: string | null
                    pdf_url?: string | null
                    quiz_id?: string | null
                    order_index?: number
                    created_at?: string
                }
            }
        }
    }
}

// Re-export convenience types from main types file
export type { Course, Lesson, Quiz, Question, QuizWithQuestions } from './index';
