import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { WidgetMount } from "@/components/widget-mount";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Driftwood Outfitters — support desk",
  description:
    "Rowan, the support assistant for the fictional outfitter Driftwood. Track an order, start a return, or read the shop notes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          {children}
          <Suspense fallback={null}>
            <SiteFooter />
          </Suspense>
          <Suspense fallback={null}>
            <WidgetMount />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
