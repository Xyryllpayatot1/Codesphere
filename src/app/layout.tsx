import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ReactQueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { APP_NAME } from "@/lib/constants";
import type { ThemePreference } from "@/store/use-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Learn to Code, Interactively`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "An interactive programming learning platform. Learn HTML, CSS, JavaScript and more with hands-on exercises, quizzes, projects and adaptive study plans.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const themeCookie = store.get("codesphere_theme")?.value;
  const initialTheme: ThemePreference =
    themeCookie === "light" || themeCookie === "dark" || themeCookie === "system" ? themeCookie : "system";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider initial={initialTheme} />
        <ReactQueryProvider>
          {children}
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
