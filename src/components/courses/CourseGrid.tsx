'use client';

import { Course } from '@/types';
import { CourseCard } from './CourseCard';

interface CourseGridProps {
    courses: Course[];
    progress?: Record<string, number>;
}

export function CourseGrid({ courses, progress = {} }: CourseGridProps) {
    if (courses.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                No courses found for this semester.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {courses.map((course) => (
                <div 
                    key={course.id}
                    className="hover:scale-[1.02] transition-transform duration-200"
                >
                    <CourseCard
                        course={course}
                        progress={progress[course.id] || 0}
                    />
                </div>
            ))}
        </div>
    );
}
