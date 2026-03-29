'use client';

import { useLocale } from 'next-intl';
import { setLocale } from '@/app/actions/locale';
import { useTransition } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function LanguageDropdownItem() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchLocale = () => {
    startTransition(async () => {
      await setLocale(locale === 'en' ? 'ar' : 'en');
    });
  };

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        if (!isPending) switchLocale();
      }}
      disabled={isPending}
      className={`focus:bg-zinc-800 focus:text-white cursor-pointer w-full text-foreground ${isPending ? 'opacity-50' : ''}`}
    >
      <Languages className={`me-2 h-4 w-4 ${locale === 'en' ? 'text-violet-400' : 'text-sky-400'}`} />
      <span>{locale === 'en' ? 'Arabic' : 'English'}</span>
    </DropdownMenuItem>
  );
}

export function LanguageMobileButton({ className }: { className?: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchLocale = () => {
    startTransition(async () => {
      await setLocale(locale === 'en' ? 'ar' : 'en');
    });
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!isPending) switchLocale();
      }}
      disabled={isPending}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all w-full text-zinc-300 hover:text-white ${isPending ? 'opacity-50' : ''} ${className || ''}`}
    >
      <Languages className={`h-5 w-5 shrink-0 ${locale === 'en' ? 'text-violet-400' : 'text-sky-400'}`} />
      <span className="text-sm font-medium">{locale === 'en' ? 'Arabic' : 'English'}</span>
    </button>
  );
}

export function LanguageToggleButton() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchLocale = () => {
    startTransition(async () => {
      await setLocale(locale === 'en' ? 'ar' : 'en');
    });
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!isPending) switchLocale();
      }}
      disabled={isPending}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-lg ${isPending ? 'opacity-50' : ''}`}
    >
      <Languages className={`h-4 w-4 ${locale === 'en' ? 'text-violet-400' : 'text-sky-400'}`} />
      <span className="text-xs font-medium">{locale === 'en' ? 'Arabic' : 'English'}</span>
    </button>
  );
}
