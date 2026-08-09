// ---------------------------------------------------------------------------
// Lesson content model. Lessons are stored as an ordered array of these
// blocks. The renderer (`src/components/learning/blocks/`) maps each block to
// a React component. NEW block types require no app-code changes beyond adding
// a renderer entry in the registry — lessons themselves are pure data.
// ---------------------------------------------------------------------------

import type { TemplateName } from "@/lib/net/sim";

export type CalloutVariant = "info" | "tip" | "warning" | "danger";

export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "code"; language: string; code: string; title?: string }
  | { type: "callout"; variant: CalloutVariant; title?: string; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "quote"; text: string; cite?: string }
  | {
      type: "example";
      title: string;
      description?: string;
      html?: string;
      css?: string;
      js?: string;
      height?: number;
    }
  | { type: "exercise"; exerciseKey: string; title?: string }
  | { type: "quiz"; quizKey: string; title?: string }
  | { type: "checkpoint"; title?: string; items: string[] }
  | { type: "divider" }
  | { type: "embed"; url: string; provider?: string; title?: string }
  // ── Concept-driven learning flow (see LEARNING_FLOW_PHASES) ────────────────
  | {
      type: "section";
      step: number; // 1..10 phase index
      title: string;
      subtitle?: string;
    }
  | { type: "analogy"; topic: string; real: string; mapping: { real: string; concept: string }[] }
  | {
      type: "visual";
      title?: string;
      caption?: string;
      nodes: { id: string; label: string; detail?: string; tone?: "default" | "primary" | "muted" | "success" | "warning" | "danger" }[];
      edges?: { from: string; to: string; label?: string }[];
    }
  | {
      type: "breakdown";
      title?: string;
      language: string;
      steps: { code: string; explain: string; why?: string; mistake?: string }[];
    }
  | { type: "demo"; title: string; description?: string; html?: string; css?: string; js?: string; height?: number }
  | {
      type: "guided";
      title?: string;
      steps: { instruction: string; explain?: string; check?: string }[];
    }
  | {
      type: "mistake";
      title?: string;
      language?: string;
      wrong: string;
      wrongWhy: string;
      right: string;
      rightWhy: string;
      fix?: string;
    }
  | { type: "reflection"; title?: string; questions: string[] }
  // ── Prompt Studio embeds (Coding with AI) ──────────────────────────────────
  | { type: "promptBuilder"; title?: string }
  | { type: "promptAnalyzer"; title?: string; example?: string }
  // ── Networking Lab embed ───────────────────────────────────────────────────
  | {
      type: "netlab";
      title?: string;
      template?: "empty" | TemplateName;
      missionSlug?: string;
    };

export type ContentBlockType = ContentBlock["type"];

export const CONTENT_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "code",
  "callout",
  "image",
  "table",
  "quote",
  "example",
  "exercise",
  "quiz",
  "checkpoint",
  "divider",
  "embed",
  "section",
  "analogy",
  "visual",
  "breakdown",
  "demo",
  "guided",
  "mistake",
  "reflection",
  "promptBuilder",
  "promptAnalyzer",
  "netlab",
] as const;

// ---------------------------------------------------------------------------
// The concept-first learning flow every lesson can follow. Phase 6 and 9 map
// to the "section" step numbers; content authors set section.step to these.
// ---------------------------------------------------------------------------

export const LEARNING_FLOW_PHASES = [
  { step: 1, title: "Introduction", icon: "👋" },
  { step: 2, title: "Real-Life Analogy", icon: "🌍" },
  { step: 3, title: "Why It Matters", icon: "💡" },
  { step: 4, title: "Visual Explanation", icon: "🔍" },
  { step: 5, title: "Step-by-Step", icon: "🧭" },
  { step: 6, title: "Interactive Demonstration", icon: "🎮" },
  { step: 7, title: "Guided Practice", icon: "🤝" },
  { step: 8, title: "Explain Every Mistake", icon: "⚠️" },
  { step: 9, title: "Challenge", icon: "🏆" },
  { step: 10, title: "Reflection", icon: "🪞" },
] as const;

export function learningPhase(step: number) {
  return LEARNING_FLOW_PHASES.find((p) => p.step === step) ?? null;
}
