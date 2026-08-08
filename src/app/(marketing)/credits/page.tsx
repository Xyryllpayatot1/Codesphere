// ---------------------------------------------------------------------------
// CodeSphere
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CodeSphere
// ---------------------------------------------------------------------------

import Link from "next/link";
import { ArrowLeft, Boxes, Bot, Medal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AI_ASSISTED_DISCLOSURE,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  CREATOR_NAME,
  CREATOR_ROLE,
  CREATOR_TITLES,
} from "@/lib/brand";

export const dynamic = "force-dynamic";

const technology = [
  { name: "Next.js (App Router)", detail: "Web framework powering the full platform" },
  { name: "React 19 + TypeScript", detail: "UI library and type-safe application code" },
  { name: "Tailwind CSS", detail: "Styling system and design tokens" },
  { name: "Prisma ORM + PostgreSQL", detail: "Database access and storage" },
  { name: "Sandboxed Code Engine", detail: "Runs HTML, CSS and JavaScript exercises safely" },
  { name: "Virtual Networking Lab", detail: "Custom network simulation, packets and routing" },
  { name: "Monaco Editor", detail: "In-browser code editing for lessons and the playground" },
  { name: "Zustand + TanStack Query", detail: "Client state and server data management" },
  { name: "PWA Tooling", detail: "Installable app experience on mobile and desktop" },
];

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-16 sm:py-20">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Credits</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Product, creator and technology credits for {BRAND_NAME}.
        </p>
      </div>

      {/* Product */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold">Product</h2>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">Product</dt>
            <dd className="font-semibold">{BRAND_NAME}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">Description</dt>
            <dd className="text-muted-foreground">{BRAND_DESCRIPTION}</dd>
          </div>
        </dl>
      </section>

      {/* Creator & Project Lead */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Medal className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold">Creator &amp; Project Lead</h2>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">Name</dt>
            <dd className="font-semibold">{CREATOR_NAME}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">Role</dt>
            <dd>{CREATOR_ROLE}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
            <dt className="w-32 shrink-0 font-medium text-muted-foreground">Attribution</dt>
            <dd>{CREATOR_TITLES.join(" · ")}</dd>
          </div>
        </dl>
      </section>

      {/* Technology */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold">Technology</h2>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {technology.map((t) => (
            <li key={t.name} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="w-56 shrink-0 font-medium">{t.name}</span>
              <span className="text-sm text-muted-foreground">{t.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* AI-Assisted Development */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Bot className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold">AI-Assisted Development</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{AI_ASSISTED_DISCLOSURE}</p>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND_NAME}
      </p>
    </div>
  );
}
