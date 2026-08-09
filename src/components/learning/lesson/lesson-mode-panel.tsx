"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/content/types";
import {
  LEARNING_MODE_META,
  LEARNING_MODE_VALUES,
  blockCategory,
  blocksForMode,
  teachingRecapBlocks,
  type LearningMode,
} from "@/lib/content/modes";
import { LessonBlocks } from "@/components/learning/blocks";
import { Button } from "@/components/ui/button";

function storageKey(lessonId: string) {
  return `instructor:${lessonId}:practice-unlocked`;
}

export function LessonModePanel({
  lessonId,
  blocks,
  initialMode,
  initialInstructorMode,
}: {
  lessonId: string;
  blocks: ContentBlock[];
  initialMode: LearningMode;
  initialInstructorMode: boolean;
}) {
  const [mode, setMode] = useState<LearningMode>(initialMode);
  const [instructorMode, setInstructorMode] = useState(initialInstructorMode);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(storageKey(lessonId)) === "1";
    } catch {
      // storage unavailable
      return false;
    }
  });

  async function persist(patch: { learningMode?: LearningMode; instructorMode?: boolean }) {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      // best-effort persistence
    }
  }

  function switchMode(next: LearningMode) {
    if (next === mode) return;
    setMode(next);
    void persist({ learningMode: next });
  }

  function toggleInstructor() {
    const next = !instructorMode;
    setInstructorMode(next);
    void persist({ instructorMode: next });
  }

  function unlockPractice() {
    setUnlocked(true);
    try {
      localStorage.setItem(storageKey(lessonId), "1");
    } catch {
      // ignore
    }
  }

  function relockPractice() {
    setUnlocked(false);
    try {
      localStorage.removeItem(storageKey(lessonId));
    } catch {
      // ignore
    }
  }

  const visible = blocksForMode(blocks, mode);
  const recap = teachingRecapBlocks(blocks, mode);
  const prePractice: ContentBlock[] = [];
  const practiceBlocks: ContentBlock[] = [];
  for (const b of visible) {
    const cat = blockCategory(b);
    if (cat === "practice" || cat === "reflection") practiceBlocks.push(b);
    else prePractice.push(b);
  }
  const gated = instructorMode && !unlocked && practiceBlocks.length > 0;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {LEARNING_MODE_VALUES.map((m) => {
              const meta = LEARNING_MODE_META[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span aria-hidden>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <button
              type="button"
              role="switch"
              aria-checked={instructorMode}
              onClick={toggleInstructor}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                instructorMode ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  instructorMode ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
            <span className="font-medium">Instructor mode</span>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {LEARNING_MODE_META[mode].description}{" "}
          {instructorMode && "Instructor mode is on — practice unlocks only after you review the teaching."}
        </p>
      </div>

      {recap.length > 0 && (
        <details className="my-6 rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <BookOpen className="h-4 w-4 text-primary" /> Teaching recap ({recap.length} {recap.length === 1 ? "section" : "sections"}) — expand to read the full concept first
          </summary>
          <div className="border-t border-border p-4">
            <LessonBlocks blocks={recap} />
          </div>
        </details>
      )}

      <LessonBlocks blocks={prePractice} />

      {gated ? (
        <div className="my-8 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">Teach first, practice second</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/85">
            Your instructor-mode rule is holding back {practiceBlocks.length} practice{" "}
            {practiceBlocks.length === 1 ? "block" : "blocks"} (exercises, quizzes and guided practice). Review
            the steps above first, then unlock them.
          </p>
          <Button className="mt-4" onClick={unlockPractice}>
            <Unlock className="h-4 w-4" /> I&apos;ve reviewed the teaching — unlock practice
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Once unlocked for this lesson, it stays unlocked on this device.
          </p>
        </div>
      ) : (
        <>
          {instructorMode && practiceBlocks.length > 0 && (
            <button
              type="button"
              onClick={relockPractice}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Lock className="h-3.5 w-3.5" /> Lock practice again
            </button>
          )}
          <LessonBlocks blocks={practiceBlocks} />
        </>
      )}
    </div>
  );
}
