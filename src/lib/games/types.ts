// ---------------------------------------------------------------------------
// Learning-games data model.
//
// A game is metadata (Game row) plus N levels (GameLevel rows). Each level's
// `config` JSON is one of the discriminated unions below, keyed by
// `game.kind`. The per-kind renderer (client) and grader (server) both read the
// same shape — adding a new kind means adding a union member, a renderer in
// `src/components/games/` and a case in `src/lib/games/grade.ts`.
// ---------------------------------------------------------------------------

import type { CssCheck, ExerciseConfig, HtmlCheck } from "@/lib/engine/validation/types";

// ───────────────────────────── HTML Builder ────────────────────────────────

export type HtmlToken = {
  key: string;
  label: string;
  kind: "open" | "close" | "void" | "text";
  indent?: number; // nesting depth for the rendered result
};

export type HtmlBuilderConfig = {
  kind: "html_builder";
  description?: string;
  tokens: HtmlToken[];
  answer: string[]; // ordered token keys
  previewHtml?: string; // rendered snapshot of the correct result
};

// ────────────────────────────── CSS Painter ────────────────────────────────

export type CssDeclaration = {
  key: string;
  label: string; // e.g. "background: #16a34a"
  property: string;
  value: string;
};

export type CssPainterConfig = {
  kind: "css_painter";
  description?: string;
  target: {
    title: string;
    description: string;
    element: string; // the element to style (e.g. "button.card")
    styles: [property: string, value: string][]; // style the target element should have
  };
  declarations: CssDeclaration[];
  correct: string[]; // declaration keys
  passRatio?: number;
};

// ──────────────────────────── JS Logic Puzzle ──────────────────────────────

export type JsStatement = {
  key: string;
  code: string; // one or more lines of JS (indentation included)
};

export type JsLogicConfig = {
  kind: "js_logic";
  description?: string;
  statements: JsStatement[];
  answer: string[]; // ordered statement keys
  expectedOutput: string;
};

// ────────────────────────────── Bug Hunter ─────────────────────────────────

export type BugHunterConfig = {
  kind: "bug_hunter";
  description?: string;
  language: "html" | "css" | "javascript";
  starterCode: string;
  exerciseType: string; // any EXERCISE_TYPES value supported by validateExercise
  exerciseConfig: ExerciseConfig;
  points: number;
};

// ───────────────────────────── Cyber Escape ────────────────────────────────

export type CyberQuestion = {
  id: string;
  type: "multiple_choice" | "true_false";
  prompt: string;
  scenario?: string; // the "site" or context the player is inspecting
  url?: string; // rendered URL bar text
  options?: string[];
  answer: number | boolean;
  points: number;
  explanation: string;
};

export type CyberEscapeConfig = {
  kind: "cyber_escape";
  description?: string;
  scenario?: string;
  questions: CyberQuestion[];
  passRatio?: number;
};

// ─────────────────────────── Website Builder ───────────────────────────────

export type WebsiteBuilderConfig = {
  kind: "website_builder";
  description?: string;
  checkKind: "html_structure" | "css_check";
  checks: HtmlCheck[] | CssCheck[];
  requiredRatio?: number;
  starterCode: string;
};

// ──────────────────────────────── Union ────────────────────────────────────

export type GameLevelConfig =
  | HtmlBuilderConfig
  | CssPainterConfig
  | JsLogicConfig
  | BugHunterConfig
  | CyberEscapeConfig
  | WebsiteBuilderConfig;

// ───────────────────────────── Submissions ─────────────────────────────────

export type GameSubmission =
  | { kind: "html_builder"; order: string[] }
  | { kind: "css_painter"; selected: string[] }
  | { kind: "js_logic"; order: string[] }
  | { kind: "bug_hunter"; code: string }
  | { kind: "cyber_escape"; answers: Record<string, number | boolean> }
  | { kind: "website_builder"; code: string };

export type GameLevelResult = {
  passed: boolean;
  score: number;
  maxScore: number;
  ratio: number;
  perfect: boolean;
  feedback: string[];
  output?: string;
};

// ───────────────────────── Unlock rules (learning) ─────────────────────────

export type UnlockCriteria =
  | { kind: "levelReached"; level: number }
  | { kind: "xpReached"; xp: number }
  | { kind: "lessonsCompleted"; count: number }
  | { kind: "quizzesPassed"; count: number }
  | { kind: "courseCompleted"; slug: string }
  | { kind: "gameBeaten"; slug: string }
  | { kind: "gamePerfect"; slug: string }
  | { kind: "streakReached"; days: number }
  | { kind: "projectsApproved"; count: number }
  | { kind: "certificatesEarned"; count: number }
  | { kind: "achievementEarned"; key: string }
  | { kind: "lessonInWorld"; worldKey: string; count: number }
  | { kind: "quizScoreInWorld"; worldKey: string; percent: number }
  | { kind: "masteryReached"; worldKey: string; percent: number }
  | { kind: "worldCompleted"; worldKey: string }
  | { kind: "bossDefeated"; worldKey: string }
  | { kind: "allOf"; criteria: UnlockCriteria[] }
  | { kind: "anyOf"; criteria: UnlockCriteria[] };

export type WorldProgressContext = {
  masteryPercent: number;
  completed: boolean;
  bossDefeated: boolean;
};

export type UnlockContext = {
  level: number;
  xp: number;
  streak: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  coursesCompleted: string[];
  gamesBeaten: string[];
  gamesPerfect: string[];
  projectsApproved: number;
  certificatesEarned: number;
  achievementsEarned: string[];
  // worlds: key -> per-world progress snapshot
  worlds: Record<string, WorldProgressContext>;
  // worlds: key -> completed lesson count across the world's linked courses
  worldLessonCounts: Record<string, number>;
  // worlds: key -> best quiz score percentage across the world's linked courses
  worldQuizBest: Record<string, number>;
};

// ──────────────────────────────── Badges ───────────────────────────────────

export type GameBadge = {
  key: string;
  name: string;
  description: string;
  icon: string;
  // "beat" | "perfect" | "allPerfect" | "firstBlood"
  requirement: "beat" | "perfect" | "allPerfect";
};
