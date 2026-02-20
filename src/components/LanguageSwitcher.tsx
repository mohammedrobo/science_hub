'use client';

import { useLocale, useTranslations } from 'next-intl';
import { setLocale } from '@/app/actions/locale';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(async () => {
      await setLocale(newLocale);
    });
  };

  if (variant === 'full') {
    return (
      <button
        onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}
        disabled={isPending}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors w-full"
      >
        <Globe className="h-5 w-5 text-sky-500" />
        <span className="font-medium">
          {locale === 'en' ? 'العربية' : 'English'}
        </span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-400 hover:text-white"
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('switchLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-900 border-zinc-800 min-w-[140px]"
      >
        <DropdownMenuItem
          onClick={() => switchLocale('en')}
          className={`cursor-pointer focus:bg-zinc-800 focus:text-white ${locale === 'en' ? 'text-violet-400' : ''}`}
        >
          <span className="text-base me-2">🇺🇸</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale('ar')}
          className={`cursor-pointer focus:bg-zinc-800 focus:text-white ${locale === 'ar' ? 'text-violet-400' : ''}`}
        >
          <span className="text-base me-2">🇸🇦</span>
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
