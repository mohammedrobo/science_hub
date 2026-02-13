import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";

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

          <FeedbackButton />
          <Toaster />
        </div>
        <ServiceWorkerRegistration />

        <InstallPrompt />
        <WhatsNewDialog />
      </body>
    </html>
  );
}
