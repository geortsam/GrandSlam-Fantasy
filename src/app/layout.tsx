import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "GrandSlam Fantasy", template: "%s · GrandSlam Fantasy" },
  description: "Fantasy tennis for the ATP and WTA tours: draft players, set rosters and follow live leaderboards.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="container py-6 md:py-10">
            {children}
          </main>
          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            GrandSlam Fantasy · Not affiliated with the ATP, WTA or any tournament.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
