// ---------------------------------------------------------------------------
// CodeSphere
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CodeSphere
// ---------------------------------------------------------------------------

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

// Server-rendered per request (course data is DB-backed) — no static build deps.
export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/courses" className="transition hover:text-foreground">
              Courses
            </Link>
            <Link href="/about" className="transition hover:text-foreground">
              About
            </Link>
            <Link href="/credits" className="transition hover:text-foreground">
              Credits
            </Link>
            <Link href="/#features" className="transition hover:text-foreground">
              Features
            </Link>
            <Link href="/#how-it-works" className="transition hover:text-foreground">
              How it works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Get started free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
