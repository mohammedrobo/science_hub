import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGrade(percentage: number): { grade: string; color: string; label: string } {
  if (percentage >= 95) return { grade: 'A+', color: 'text-emerald-400', label: 'Excellent' };
  if (percentage >= 90) return { grade: 'A', color: 'text-emerald-500', label: 'Excellent' };
  if (percentage >= 85) return { grade: 'A-', color: 'text-emerald-600', label: 'Very Good' };
  if (percentage >= 80) return { grade: 'B+', color: 'text-blue-400', label: 'Very Good' };
  if (percentage >= 75) return { grade: 'B', color: 'text-blue-500', label: 'Good' };
  if (percentage >= 70) return { grade: 'C+', color: 'text-yellow-400', label: 'Good' };
  if (percentage >= 65) return { grade: 'C', color: 'text-yellow-500', label: 'Acceptable' };
  if (percentage >= 60) return { grade: 'D+', color: 'text-orange-400', label: 'Weak' };
  if (percentage >= 55) return { grade: 'D', color: 'text-orange-500', label: 'Weak' };
  if (percentage >= 50) return { grade: 'D-', color: 'text-red-400', label: 'Weak' };
  return { grade: 'F', color: 'text-red-600', label: 'Failed' };
}
