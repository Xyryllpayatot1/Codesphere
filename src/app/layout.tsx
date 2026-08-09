// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ReactQueryProvider } from "@/components/providers/query-provider";
import { PwaRegister } from "@/components/providers/pwa-register";
import { Toaster } from "@/components/ui/toaster";
import { APP_NAME } from "@/lib/constants";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE, CREATOR_NAME } from "@/lib/brand";
import { siteOrigin, siteUrl } from "@/lib/site-url";
import type { ThemePreference } from "@/store/use-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const HOME_TITLE = `${APP_NAME} — Interactive Technology Learning Platform`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: HOME_TITLE,
    template: `%s · ${APP_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  keywords: [
    "CreyvaPH",
    "learning platform",
    "programming",
    "web development",
    "networking",
    "interactive lessons",
    "hands-on education",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: HOME_TITLE,
    description: BRAND_DESCRIPTION,
    url: siteUrl("/"),
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: BRAND_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl("/")}#organization`,
      name: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      slogan: BRAND_TAGLINE,
      url: siteUrl("/"),
      founder: {
        "@type": "Person",
        name: CREATOR_NAME,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl("/")}#website`,
      url: siteUrl("/"),
      name: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      inLanguage: "en",
      publisher: {
        "@id": `${siteUrl("/")}#organization`,
      },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f0a1e" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0a1e" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const themeCookie = store.get("creyvaph_theme")?.value;
  const initialTheme: ThemePreference =
    themeCookie === "light" || themeCookie === "dark" || themeCookie === "system" ? themeCookie : "system";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider initial={initialTheme} />
        <PwaRegister />
        <ReactQueryProvider>
          {children}
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
