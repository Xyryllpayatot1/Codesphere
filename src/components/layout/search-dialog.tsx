"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, SearchX, Loader2, BookOpen, Gamepad2, Network, Award, Rocket } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { SearchResults } from "@/app/api/search/route";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openSearch = () => {
    setQ("");
    setResults(null);
    setLoading(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    const t = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
          const json = await res.json();
          setResults((json.data?.results as SearchResults | null) ?? null);
        } catch {
          setResults(null);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const hasResults = results
    ? results.courses.length +
        results.lessons.length +
        results.games.length +
        results.netMissions.length +
        results.achievements.length +
        results.projects.length >
      0
    : false;

  return (
    <>
      <button
        onClick={openSearch}
        className="hidden items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground md:inline-flex"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search…</span>
        <kbd className="hidden rounded border border-border bg-secondary px-1 text-[9px] font-semibold lg:inline">Ctrl K</kbd>
      </button>
      <button onClick={openSearch} className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground md:hidden" aria-label="Search">
        <Search className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="Search CodeSphere" description="Courses, lessons, games, missions, projects and achievements.">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “HTML”, “cable”, “boss”…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-4 max-h-80 space-y-4 overflow-y-auto">
          {loading && (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          )}

          {!loading && q.trim().length >= 2 && !hasResults && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <SearchX className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results for “{q.trim()}”</p>
            </div>
          )}

          {!loading && q.trim().length < 2 && (
            <p className="py-8 text-center text-xs text-muted-foreground">Type at least 2 characters to search.</p>
          )}

          {results && !loading && (
            <>
            <SearchGroup
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Courses"
              items={results.courses.map((c) => ({
                href: `/learn/${c.slug}`,
                title: c.title,
                sub: c.difficulty,
              }))}
              onSelect={() => setOpen(false)}
            />
            <SearchGroup
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Lessons"
              items={results.lessons.map((l) => ({
                href: `/learn/${l.courseSlug}/${l.moduleSlug}/${l.slug}`,
                title: l.title,
                sub: l.courseTitle,
              }))}
              onSelect={() => setOpen(false)}
            />
            <SearchGroup
              icon={<Gamepad2 className="h-3.5 w-3.5" />}
              label="Games"
              items={results.games.map((g) => ({ href: `/games/${g.slug}`, title: g.name, sub: "Game" }))}
              onSelect={() => setOpen(false)}
            />
            <SearchGroup
              icon={<Network className="h-3.5 w-3.5" />}
              label="Lab missions"
              items={results.netMissions.map((m) => ({
                href: `/networking?mission=${m.slug}`,
                title: m.title,
                sub: m.difficulty,
              }))}
              onSelect={() => setOpen(false)}
            />
            <SearchGroup
              icon={<Rocket className="h-3.5 w-3.5" />}
              label="Your projects"
              items={results.projects.map((p) => ({
                href: `/networking${p.missionSlug ? `?mission=${p.missionSlug}` : ""}`,
                title: p.title,
                sub: "Networking project",
              }))}
              onSelect={() => setOpen(false)}
            />
            <SearchGroup
              icon={<Award className="h-3.5 w-3.5" />}
              label="Achievements"
              items={results.achievements.map((a) => ({ href: "/achievements", title: a.name, sub: a.rarity }))}
              onSelect={() => setOpen(false)}
            />
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}

function SearchGroup({
  icon,
  label,
  items,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  items: { href: string; title: string; sub: string }[];
  onSelect?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span> {label}
      </p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <Link
            key={`${label}-${i}`}
            href={item.href}
            onClick={onSelect}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-2.5 py-2 transition hover:border-primary/40 hover:bg-secondary"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
