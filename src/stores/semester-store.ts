import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Semester } from '@/types';

interface SemesterState {
    semester: Semester;
    setSemester: (semester: Semester) => void;

    // Hydration fix
    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useSemesterStore = create<SemesterState>()(
    persist(
        (set) => ({
            semester: 1,
            setSemester: (semester) => set({ semester }),

            hasHydrated: false,
            setHasHydrated: (state) => set({ hasHydrated: state }),
        }),
        {
            name: 'semester-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
