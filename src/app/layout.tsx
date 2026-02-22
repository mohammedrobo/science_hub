import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const fontSans = Manrope({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const fontSerif = Fraunces({
  variable: "--font-serif",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const fontArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
});

const description = "Your digital science companion";

export const metadata: Metadata = {
  title: "Science Hub",
  description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Science Hub",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/InstallPrompt";
import { FeedbackButton } from "@/components/FeedbackButton";
import { WhatsNewDialog } from "@/components/WhatsNewDialog";
import { PageTracker } from "@/components/safety/PageTracker";
import { ActivityTracker } from "@/components/safety/ActivityTracker";
import { SmoothScroll } from "@/components/SmoothScroll";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontArabic.variable} antialiased bg-background text-foreground min-h-[100dvh] relative overflow-x-hidden ${locale === 'ar' ? 'font-arabic' : ''}`}
        suppressHydrationWarning={true}
      >
        <NextIntlClientProvider messages={messages}>
          <div className="relative w-full overflow-x-hidden min-h-[100dvh] flex flex-col">
            <SmoothScroll />
            <PageTracker />
            <ActivityTracker />
            {children}

            <FeedbackButton />
            <Toaster />
          </div>
          <ServiceWorkerRegistration />

          <InstallPrompt />
          <WhatsNewDialog />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
