'use client';

import { LeaderTour } from '@/components/leader/LeaderTour';

interface LeaderTourWrapperProps {
  hasOnboarded: boolean;
}

export function LeaderTourWrapper({ hasOnboarded }: LeaderTourWrapperProps) {
  // DB says already completed — never render
  if (hasOnboarded) return null;

  // Client-side backup: localStorage flag (handles stale cache / DB sync delays)
  if (typeof window !== 'undefined' && localStorage.getItem('leader-tour-completed') === 'true') {
    return null;
  }

  return <LeaderTour page="dashboard" autoStart />;
}
