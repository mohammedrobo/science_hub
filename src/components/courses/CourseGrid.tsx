'use client';

import { Course } from '@/types';
import { CourseCard } from './CourseCard';
import { motion, Variants, useReducedMotion } from 'framer-motion';

interface CourseGridProps {
    courses: Course[];
    progress?: Record<string, number>;
}

export function CourseGrid({ courses, progress = {} }: CourseGridProps) {
    const prefersReducedMotion = useReducedMotion();

    if (courses.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                No courses found for this semester.
            </div>
        );
    }

    // Stagger container variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.07,
                delayChildren: prefersReducedMotion ? 0 : 0.05
            }
        }
    };

    // Individual card variants - fade in and slide up
    const cardVariants: Variants = {
        hidden: {
            opacity: 0,
            y: prefersReducedMotion ? 0 : 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: prefersReducedMotion ? 0 : 0.4,
                ease: "easeOut"
            }
        }
    };

    return (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {courses.map((course) => (
                <motion.div
                    key={course.id}
                    variants={cardVariants}
                >
                    <CourseCard
                        course={course}
                        progress={progress[course.id] || 0}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}
