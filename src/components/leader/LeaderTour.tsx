'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './leader-tour.css';
import { useTranslations } from 'next-intl';
import { completeLeaderOnboarding } from '@/app/leader/tour-actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const TOUR_STATE_KEY = 'leader-tour-state';
const TOUR_COMPLETED_KEY = 'leader-tour-completed';

interface TourState {
  active: boolean;
  currentPage: 'dashboard' | 'upload' | 'lessons' | 'guild';
  completedPages: string[];
}

function getTourState(): TourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOUR_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setTourState(state: TourState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state));
}

function clearTourState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOUR_STATE_KEY);
}

function isTourCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}

function markTourCompleted() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
}

const PAGE_FLOW: TourState['currentPage'][] = ['dashboard', 'upload', 'lessons', 'guild'];

function getNextPage(current: string) {
  const idx = PAGE_FLOW.indexOf(current as TourState['currentPage']);
  return idx < PAGE_FLOW.length - 1 ? PAGE_FLOW[idx + 1] : null;
}

function getPageRoute(p: string) {
  switch (p) {
    case 'dashboard': return '/leader';
    case 'upload': return '/admin/upload';
    case 'lessons': return '/admin/lessons';
    case 'guild': return '/guild';
    default: return '/leader';
  }
}

interface LeaderTourProps {
  page: 'dashboard' | 'upload' | 'lessons' | 'guild';
  autoStart?: boolean;
}

export function LeaderTour({ page, autoStart = false }: LeaderTourProps) {
  const t = useTranslations('tour');
  const router = useRouter();
  const [tourStarted, setTourStarted] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const completedRef = useRef(false);

  const filterSteps = useCallback((steps: DriveStep[]): DriveStep[] => {
    return steps.filter(step => {
      if (!step.element) return true;
      return !!document.querySelector(step.element as string);
    });
  }, []);

  // ─── DASHBOARD ──────────────────────────────────────────
  const getDashboardSteps = useCallback((): DriveStep[] => [
    { popover: { title: t('welcome'), description: t('welcomeDesc') } },
    { element: '[data-tour="notify-section"]', popover: { title: t('notifySection'), description: t('notifySectionDesc'), side: 'top', align: 'center' } },
    { element: '[data-tour="guild-card"]', popover: { title: t('guildCard'), description: t('guildCardDesc'), side: 'bottom', align: 'center' } },
    { element: '[data-tour="upload-card"]', popover: { title: t('uploadCard'), description: t('uploadCardDesc'), side: 'bottom', align: 'center' } },
    { element: '[data-tour="manage-card"]', popover: { title: t('manageCard'), description: t('manageCardDesc'), side: 'bottom', align: 'center' } },
    { popover: { title: t('dashboardDone'), description: t('dashboardDoneDesc') } },
  ], [t]);

  // ─── UPLOAD ─────────────────────────────────────────────
  const getUploadSteps = useCallback((): DriveStep[] => [
    { popover: { title: t('uploadWelcome'), description: t('uploadWelcomeDesc') } },
    { element: '[data-tour="course-select"]', popover: { title: t('uploadStep1'), description: t('uploadStep1Desc'), side: 'bottom', align: 'center' } },
    { element: '[data-tour="lesson-title"]', popover: { title: t('uploadTitleStep'), description: t('uploadTitleStepDesc'), side: 'bottom', align: 'center' } },
    { element: '[data-tour="video-url"]', popover: { title: t('uploadVideoStep'), description: t('uploadVideoStepDesc'), side: 'bottom', align: 'center' } },
    { element: '[data-tour="pdf-section"]', popover: { title: t('uploadPdfStep'), description: t('uploadPdfStepDesc'), side: 'top', align: 'center' } },
    { element: '[data-tour="quiz-section"]', popover: { title: t('uploadQuizStep'), description: t('uploadQuizStepDesc'), side: 'top', align: 'center' } },
    { element: '[data-tour="submit-btn"]', popover: { title: t('uploadStep3'), description: t('uploadStep3Desc'), side: 'top', align: 'center' } },
    { popover: { title: t('uploadDone'), description: t('uploadDoneDesc') } },
  ], [t]);

  // ─── LESSONS ────────────────────────────────────────────
  const getLessonsSteps = useCallback((): DriveStep[] => [
    { popover: { title: t('lessonsWelcome'), description: t('lessonsWelcomeDesc') } },
    { element: '[data-tour="lessons-list"]', popover: { title: t('lessonsOverview'), description: t('lessonsOverviewDesc'), side: 'top', align: 'center' } },
    { element: '[data-tour="lesson-actions"]', popover: { title: t('lessonsActions'), description: t('lessonsActionsDesc'), side: 'left', align: 'center' } },
    { popover: { title: t('lessonsDone'), description: t('lessonsDoneDesc') } },
  ], [t]);

  // ─── GUILD ──────────────────────────────────────────────
  const getGuildSteps = useCallback((): DriveStep[] => [
    { popover: { title: t('guildWelcome'), description: t('guildWelcomeDesc') } },
    { element: '[data-tour="quest-board"]', popover: { title: t('guildQuestBoard'), description: t('guildQuestBoardDesc'), side: 'right', align: 'center' } },
    { element: '[data-tour="guild-chat"]', popover: { title: t('guildChat'), description: t('guildChatDesc'), side: 'left', align: 'center' } },
    { element: '[data-tour="nickname-btn"]', popover: { title: t('guildNickname'), description: t('guildNicknameDesc'), side: 'bottom', align: 'center' } },
    { popover: { title: t('complete'), description: t('completeDesc') } },
  ], [t]);

  const getSteps = useCallback(() => {
    switch (page) {
      case 'dashboard': return getDashboardSteps();
      case 'upload': return getUploadSteps();
      case 'lessons': return getLessonsSteps();
      case 'guild': return getGuildSteps();
      default: return getDashboardSteps();
    }
  }, [page, getDashboardSteps, getUploadSteps, getLessonsSteps, getGuildSteps]);

  const navigateToNext = useCallback(async () => {
    const nextPage = getNextPage(page);

    if (nextPage) {
      const state = getTourState();
      const completed = state?.completedPages || [];
      if (!completed.includes(page)) completed.push(page);
      setTourState({ active: true, currentPage: nextPage, completedPages: completed });
      router.push(getPageRoute(nextPage));
    } else {
      // Final page — mark complete locally + in DB, done forever
      clearTourState();
      markTourCompleted();
      if (!completedRef.current) {
        completedRef.current = true;
        try {
          const result = await completeLeaderOnboarding();
          if (result.error) {
            toast.error(t('tourSaveError'));
          } else {
            toast.success(t('complete'));
          }
        } catch {
          toast.error(t('tourSaveError'));
        }
      }
      router.push('/leader');
    }
  }, [page, router, t]);

  const skipTour = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    clearTourState();
    markTourCompleted();
    if (!completedRef.current) {
      completedRef.current = true;
      await completeLeaderOnboarding();
    }
    toast.success(t('tourSkipped'));
    router.push('/leader');
  }, [router, t]);

  const startTour = useCallback(() => {
    const steps = filterSteps(getSteps());
    if (steps.length === 0) {
      navigateToNext();
      return;
    }

    const nextPage = getNextPage(page);
    const isLastPage = !nextPage;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'leader-tour-popover',
      nextBtnText: t('nextStep'),
      prevBtnText: t('prevStep'),
      doneBtnText: isLastPage ? t('finish') : t('continueToNext'),
      progressText: t('stepOf', { current: '{{current}}', total: '{{total}}' }),
      steps,
      onDestroyed: () => {
        navigateToNext();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
    setTourStarted(true);
  }, [getSteps, filterSteps, t, page, navigateToNext]);

  useEffect(() => {
    if (tourStarted) return;

    // If already completed (localStorage guard), never start again
    if (isTourCompleted()) {
      clearTourState();
      return;
    }

    const state = getTourState();
    const shouldResume = state?.active && state.currentPage === page;
    const shouldStart = autoStart || shouldResume;

    if (shouldStart) {
      if (autoStart && !state?.active) {
        setTourState({ active: true, currentPage: 'dashboard', completedPages: [] });
      }
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [autoStart, tourStarted, page, startTour]);

  if (!tourStarted) return null;

  return (
    <button
      onClick={skipTour}
      className="fixed bottom-4 end-4 z-[100001] px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900/90 border border-zinc-700 hover:border-red-500/50 rounded-lg backdrop-blur-sm transition-all hover:bg-red-900/30"
    >
      {t('skipTour')}
    </button>
  );
}
