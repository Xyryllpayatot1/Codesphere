// ---------------------------------------------------------------------------
// CodeSphere
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CodeSphere
// ---------------------------------------------------------------------------

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { BRAND_FOOTER_LINE, BRAND_NAME, COPYRIGHT_YEAR, CREATOR_NAME } from "@/lib/brand";

/**
 * Professional product footer used across both the marketing site and the
 * main application. Attribution is kept subtle — authorship without
 * overpowering the CodeSphere brand.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{BRAND_FOOTER_LINE}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Learn</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/courses" className="text-muted-foreground transition hover:text-foreground">
                Courses
              </Link>
            </li>
            <li>
              <Link href="/#features" className="text-muted-foreground transition hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="text-muted-foreground transition hover:text-foreground">
                How it works
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Project</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-muted-foreground transition hover:text-foreground">
                About CodeSphere
              </Link>
            </li>
            <li>
              <Link href="/credits" className="text-muted-foreground transition hover:text-foreground">
                Credits
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Ownership</p>
          <p className="text-muted-foreground">
            © {COPYRIGHT_YEAR} {BRAND_NAME} — {CREATOR_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
