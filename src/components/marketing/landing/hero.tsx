import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Static, server-rendered product surface: a lesson pane beside the lab CLI.
 * Real commands and output from the Networking Lab — nothing mocked that the
 * product doesn't actually do.
 */
function ProductSurface() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl">
      {/* Frame */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex h-9 items-center gap-2 border-b border-border bg-sunken px-4">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          </span>
          <p className="ml-2 truncate font-mono text-2xs text-muted-foreground">
            creyvaph.app/networking — Network Fundamentals
          </p>
        </div>

        <div className="grid sm:grid-cols-5">
          {/* Lesson pane */}
          <div className="hidden flex-col gap-3 border-r border-border p-4 sm:col-span-2 sm:flex">
            <p className="text-xs font-medium text-muted-foreground">LESSON 3 · ROUTING BASICS</p>
            <p className="text-sm font-semibold leading-snug">Static routes and the gateway of last resort</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-success" /> Configure static routes on R1
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-success" /> Verify reachability with ping
              </li>
              <li className="flex items-center gap-1.5 text-foreground">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-primary" aria-hidden />
                Trace the packet path hop by hop
              </li>
            </ul>
            <div className="mt-auto rounded-lg bg-sunken p-2.5 font-mono text-[0.6875rem] leading-relaxed text-sunken-foreground">
              <p><span className="text-primary">ip route</span> 10.0.2.0 255.255.255.0 10.0.0.2</p>
              <p className="text-muted-foreground"># route added to R1 routing table</p>
            </div>
          </div>

          {/* Terminal pane */}
          <div className="bg-[#0d1117] p-4 font-mono text-xs leading-relaxed sm:col-span-3 dark:bg-[#0b0e14]">
            <p className="text-slate-500">R1 con0 is now available</p>
            <p className="text-slate-300">R1&gt; <span className="text-white">enable</span></p>
            <p className="text-slate-300">R1# <span className="text-white">configure terminal</span></p>
            <p className="text-emerald-400">R1(config)# ip route 10.0.2.0 255.255.255.0 10.0.0.2</p>
            <p className="text-slate-300">R1(config)# <span className="text-white">end</span></p>
            <p className="text-slate-300">R1# <span className="text-white">ping 10.0.2.10</span></p>
            <p className="mt-1 text-emerald-400">Type escape sequence to abort.</p>
            <p className="text-emerald-400">!!!!!</p>
            <p className="text-slate-400">Success rate is 100 percent (5/5)</p>
            <p className="mt-1 text-slate-500">
              <span className="inline-block h-3 w-1.5 animate-pulse bg-slate-300 align-middle" aria-hidden />
            </p>
          </div>
        </div>
      </div>

      {/* Grounding shadow */}
      <div className="pointer-events-none absolute inset-x-8 -bottom-6 h-8 rounded-full bg-foreground/5 blur-xl" aria-hidden />
    </div>
  );
}

export function Hero({
  courseCount,
  lessonCount,
}: {
  courseCount: number;
  lessonCount: number;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Learn technology by <span className="text-primary">actually building it</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          CreyvaPH is a hands-on learning platform for students who want real skills — write code in
          every lesson, get graded instantly, and configure real networks in a browser-based lab.
          No installs, no video-only lectures.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/register">
              Start learning free <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {(courseCount > 0 || lessonCount > 0) && (
            <>
              {courseCount} courses · {lessonCount}+ hands-on lessons ·{" "}
            </>
          )}
          Free while in beta
        </p>

        <ProductSurface />
      </div>
    </section>
  );
}
