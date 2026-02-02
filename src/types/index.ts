export type Semester = 1 | 2;

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string | null;
  semester: Semester;
  icon: string | null;
  image_url?: string;
  created_at: string;
}

// Lesson type matching lessons table
export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string | null;
  video_parts?: { title: string; url: string }[];
  pdf_url: string | null;
  quiz_id: string | null;
  order_index: number;
  created_at?: string;
}

export type CourseWithLessons = Course & {
  lessons: Lesson[];
};

// Quiz types for interactive quizzes
export interface Quiz {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank';

export interface Question {
  id: string;
  quiz_id: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  order_index: number;
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[];
}

