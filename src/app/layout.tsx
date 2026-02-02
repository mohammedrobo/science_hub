import type { Metadata, Viewport } from "next";
import { Merriweather, Inter } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontSerif = Merriweather({
  variable: "--font-serif",
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
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
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { FloatingDaVinciWrapper } from "@/components/FloatingDaVinciWrapper";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} ${fontSerif.variable} antialiased bg-background text-foreground min-h-[100dvh] relative overflow-x-hidden`}
        suppressHydrationWarning={true}
      >
        <div className="relative w-full overflow-x-hidden min-h-[100dvh] flex flex-col">
          {children}
          <FloatingDaVinciWrapper />
          <Toaster />
        </div>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
