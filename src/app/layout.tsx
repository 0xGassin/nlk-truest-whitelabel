import type { Metadata } from "next";

import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";
import { AppProvider } from "@/app/provider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  description: "External exposure management platform",
  icons: {
    apple: [{ sizes: "180x180", type: "image/png", url: "/favicon/apple-touch-icon.png?v=3" }],
    icon: [
      { type: "image/svg+xml", url: "/favicon.svg?v=3" },
      { sizes: "32x32", type: "image/png", url: "/favicon/favicon-32x32.png?v=3" },
      { sizes: "16x16", type: "image/png", url: "/favicon/favicon-16x16.png?v=3" },
    ],
    shortcut: "/favicon/favicon.ico?v=3",
  },
  manifest: "/favicon/site.webmanifest?v=3",
  title: "Truest Exposure Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                const storedTheme = localStorage.getItem('theme');
                const legacyThemes = ['mixed', 'grape', 'navy', 'light'];
                const supportedThemes = ['soft', 'dark', 'system'];
                let theme = 'soft';

                if (storedTheme && !legacyThemes.includes(storedTheme) && supportedThemes.includes(storedTheme)) {
                  theme = storedTheme;
                }

                const root = document.documentElement;
                
                if (theme === 'system') {
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'soft';
                  root.classList.add(systemTheme);
                } else {
                  root.classList.add(theme);
                }
              } catch (e) {
                // Fallback to soft if localStorage is not available
                document.documentElement.classList.add('soft');
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
