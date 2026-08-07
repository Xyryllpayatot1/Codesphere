"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Code2,
  Compass,
  Eye,
  Gamepad2,
  HeartHandshake,
  Rocket,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1400;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const stats = [
  { value: 100, suffix: "+", label: "Interactive lessons", icon: BookIcon },
  { value: 400, suffix: "+", label: "Hands-on exercises", icon: Code2 },
  { value: 12000, suffix: "+", label: "Learners worldwide", icon: Users },
  { value: 40, suffix: "+", label: "Countries reached", icon: Compass },
];

const values = [
  { icon: Brain, title: "Learn by doing", text: "Reading about code is not the same as writing it. Every lesson ends with something you build, fix or run yourself." },
  { icon: ShieldCheck, title: "Honest engineering", text: "No AI-generated answers, no guesswork grading. A deterministic engine checks your work against clear, defined outcomes." },
  { icon: HeartHandshake, title: "Every learner counts", text: "Progress, streaks and achievements exist to encourage you, never to shame you. Everyone starts at the same blank editor." },
  { icon: Rocket, title: "Small steps, big goals", text: "Concepts are broken into focused lessons and mini-games so momentum compounds a little bit every single day." },
];

const timeline = [
  {
    year: "2024",
    title: "CodeSphere is born",
    text: "Founder Jhon Xyryll Samoy sketched the first prototype after watching too many learners stall on passive video courses.",
  },
  {
    year: "2025",
    title: "First courses ship",
    text: "The HTML, CSS and JavaScript tracks launched with structured lessons, sandboxed exercises and real project submissions.",
  },
  {
    year: "2025",
    title: "The playground opens",
    text: "A live coding playground gave learners a safe space to experiment with HTML, CSS and JavaScript before tackling graded work.",
  },
  {
    year: "2026",
    title: "Learning games arrive",
    text: "Six teach-programming games turned order, styling, logic, debugging, security and full-page building into playful practice.",
  },
  {
    year: "2026",
    title: "A global classroom",
    text: "Learners from 40+ countries are completing lessons, earning certificates and shipping real portfolio projects every week.",
  },
];

function BookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function AboutContent() {
  return (
    <div className="space-y-20 py-16 sm:space-y-28 sm:py-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold uppercase tracking-widest text-primary"
          >
            Our story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            CodeSphere exists so that <span className="text-primary">everyone can code</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            A small team and one clear conviction: people learn to program by building real things, not by
            watching videos. We started CodeSphere to make hands-on, honest programming education available to anyone.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg">
              <Link href="/register">
                Start learning free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">
                <Gamepad2 className="h-4 w-4" /> Explore the games
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <s.icon className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-card p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Our mission</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                To turn beginners into builders. We design every lesson, exercise and game so that the
                learner spends most of their time writing, running and fixing real code — and leaves with
                skills they can actually use.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-2xl border border-border bg-card p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Eye className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Our vision</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                A world where programming is taught like a craft: practiced daily, assessed honestly, and
                completed with a portfolio of real projects — regardless of where the learner started.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Founder */}
      <section className="mx-auto max-w-4xl px-4">
        <Reveal>
          <figure className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
              JS
            </span>
            <blockquote className="mx-auto mt-6 max-w-2xl text-balance text-xl font-medium leading-relaxed sm:text-2xl">
              &ldquo;When I learned to code, the projects that stuck with me were the ones I built by hand —
              bugs, rewrites and all. CodeSphere is my attempt to give every learner that same experience.&rdquo;
            </blockquote>
            <figcaption className="mt-6">
              <p className="font-semibold">Jhon Xyryll Samoy</p>
              <p className="text-sm text-muted-foreground">Founder, CodeSphere</p>
            </figcaption>
          </figure>
        </Reveal>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">What we believe</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Core values</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Four principles shape every feature, from the first lesson to the latest game.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40">
                <v.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-3xl px-4">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">The road so far</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Milestones</h2>
        </Reveal>
        <div className="relative mt-10 space-y-10 border-l border-border pl-8">
          {timeline.map((item, i) => (
            <Reveal key={item.year + item.title} delay={i * 0.06}>
              <div className="relative">
                <span className="absolute -left-[2.45rem] flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-background">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">{item.year}</p>
                <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Join the learners building for real
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Start with a free account, pick a course, and ship your first page today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Create your free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/courses">Browse courses</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
