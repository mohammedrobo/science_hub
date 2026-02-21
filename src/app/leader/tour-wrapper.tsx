'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LeaderTour } from '@/components/leader/LeaderTour';

interface LeaderTourWrapperProps {
  hasOnboarded: boolean;
}

export function LeaderTourWrapper({ hasOnboarded }: LeaderTourWrapperProps) {
  const searchParams = useSearchParams();
  const isReplay = searchParams.get('replay') === '1';
  const [shouldStart, setShouldStart] = useState(false);

  useEffect(() => {
    if (isReplay) {
      // Clear completed state so the tour can replay
      localStorage.removeItem('leader-tour-completed');
      localStorage.removeItem('leader-tour-state');
      setShouldStart(true);
      // Clean URL without reload
      window.history.replaceState({}, '', '/leader');
    }
  }, [isReplay]);

  // Replay mode — start even if already onboarded
  if (shouldStart) {
    return <LeaderTour page="dashboard" autoStart />;
  }

  // DB says already completed — never render
  if (hasOnboarded) return null;

  // Client-side backup: localStorage flag (handles stale cache / DB sync delays)
  if (typeof window !== 'undefined' && localStorage.getItem('leader-tour-completed') === 'true') {
    return null;
  }

  return <LeaderTour page="dashboard" autoStart />;
}
