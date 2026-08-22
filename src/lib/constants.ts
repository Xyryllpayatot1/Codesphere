// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------
// Platform-wide constants. Strings (not enums) keep the schema provider-portable.
// ---------------------------------------------------------------------------

export const ROLES = {
  STUDENT: "STUDENT",
  INSTRUCTOR: "INSTRUCTOR",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const DIFFICULTIES = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;

export type Difficulty = (typeof DIFFICULTIES)[keyof typeof DIFFICULTIES];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const COURSE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const LESSON_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export const ENROLLMENT_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

export const PLAN_ITEM_STATUS = {
  PENDING: "PENDING",
  DONE: "DONE",
  SKIPPED: "SKIPPED",
} as const;

export const SUBMISSION_STATUS = {
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

// ---------------------------------------------------------------------------
// Learning games
// ---------------------------------------------------------------------------

export const GAME_KINDS = {
  HTML_BUILDER: "html_builder", // drag HTML tags into the right order
  CSS_PAINTER: "css_painter", // apply CSS declarations to reach a target design
  JS_LOGIC: "js_logic", // arrange statements so the program prints the expected output
  BUG_HUNTER: "bug_hunter", // find and fix errors in real code
  CYBER_ESCAPE: "cyber_escape", // spot phishing sites, fake logins and unsafe elements
  WEBSITE_BUILDER: "website_builder", // build a complete mini website from requirements
} as const;

export type GameKind = (typeof GAME_KINDS)[keyof typeof GAME_KINDS];

export const GAME_KIND_META: Record<GameKind, { label: string; short: string; skill: string }> = {
  [GAME_KINDS.HTML_BUILDER]: { label: "HTML Builder", short: "Ordering", skill: "HTML structure" },
  [GAME_KINDS.CSS_PAINTER]: { label: "CSS Painter", short: "Styling", skill: "CSS properties" },
  [GAME_KINDS.JS_LOGIC]: { label: "JS Logic Puzzle", short: "Logic", skill: "JavaScript flow" },
  [GAME_KINDS.BUG_HUNTER]: { label: "Bug Hunter", short: "Debugging", skill: "Reading code" },
  [GAME_KINDS.CYBER_ESCAPE]: { label: "Cyber Escape", short: "Security", skill: "Web safety" },
  [GAME_KINDS.WEBSITE_BUILDER]: { label: "Website Builder", short: "Build", skill: "Full pages" },
} as const;

export const GAME_LEVEL_STATUS = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  BEATEN: "BEATEN",
  PERFECT: "PERFECT",
} as const;

export type GameLevelStatus = (typeof GAME_LEVEL_STATUS)[keyof typeof GAME_LEVEL_STATUS];

// ---------------------------------------------------------------------------
// Programming worlds (adventure-map progression)
// ---------------------------------------------------------------------------

export const WORLD_STATUS = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  ACTIVE: "ACTIVE",
  MASTERED: "MASTERED",
} as const;

export type WorldStatus = (typeof WORLD_STATUS)[keyof typeof WORLD_STATUS];

/** Mastery event ledger tags (MasteryEvent.type). */
export const MASTERY_EVENT_TYPES = {
  LESSON: "lesson",
  GAME: "game",
  GAME_PERFECT: "game_perfect",
  QUIZ: "quiz",
  QUIZ_FAIL: "quiz_fail",
  PROJECT: "project",
  BOSS: "boss",
  PRACTICE: "practice",
} as const;

/**
 * Default mastery weighting. A world's mastery is earned points / total
 * possible points — each component is worth `N` points per unit. Perfection and
 * daily practice add bonus points; repeated quiz failures decay the total.
 * Every world can override these via its `masteryConfig` JSON.
 */
export const WORLD_DEFAULT_MASTERY_CONFIG = {
  lessonWeight: 10, // per completed lesson
  gameWeight: 15, // per beaten mini game
  perfectGameBonus: 5, // extra per game beaten perfectly
  quizWeight: 10, // per first-time passed quiz
  perfectQuizBonus: 5, // extra per perfect quiz
  projectWeight: 20, // per approved project
  bossWeight: 25, // one-time boss defeat
  practiceWeight: 1, // per daily practice session
  quizFailPenalty: 2, // mastery points lost per repeated quiz failure
} as const;

export type WorldMasteryConfig = typeof WORLD_DEFAULT_MASTERY_CONFIG;

/** One-time rewards for defeating a world boss / earning a world certificate. */
export const WORLD = {
  BOSS_XP_BONUS: 120, // added on top of the boss level XP
  BOSS_COINS_BONUS: 60,
  CERTIFICATE_XP: 60,
  CERTIFICATE_COINS: 30,
} as const;

/** Mastery percentage required for a world to count as "mastered". */
export const MASTERY_MASTER_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Exercise / validation types
// ---------------------------------------------------------------------------

export const EXERCISE_TYPES = {
  CODE_OUTPUT: "code_output", // run and compare stdout / result
  HTML_STRUCTURE: "html_structure", // parse DOM, assert tags/classes/ids/attributes
  CSS_CHECK: "css_check", // assert selectors / rules exist
  JS_FUNCTION: "js_function", // run test cases against an exported function
  JS_ASSERT: "js_assert", // run an assertion script against user code
  FILL_BLANK: "fill_blank", // user completes a piece of code
  CODE_COMPLETION: "code_completion", // reconstruct a program from shuffled lines
  ORDERING: "ordering", // arrange steps in the correct order
} as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[keyof typeof EXERCISE_TYPES];

// ---------------------------------------------------------------------------
// Quiz question types
// ---------------------------------------------------------------------------

export const QUIZ_QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  FILL_BLANK: "fill_blank",
  CODE_COMPLETION: "code_completion",
  ORDERING: "ordering",
  MATCHING: "matching",
} as const;

export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[keyof typeof QUIZ_QUESTION_TYPES];

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_CATEGORIES = {
  MILESTONE: "MILESTONE",
  STREAK: "STREAK",
  COURSE: "COURSE",
  QUIZ: "QUIZ",
  PROJECT: "PROJECT",
  ACTIVITY: "ACTIVITY",
  GAME: "GAME",
} as const;

export const ACTIVITY_TYPES = {
  LESSON_COMPLETED: "lesson_completed",
  EXERCISE_COMPLETED: "exercise_completed",
  QUIZ_PASSED: "quiz_passed",
  QUIZ_FAILED: "quiz_failed",
  ACHIEVEMENT_EARNED: "achievement_earned",
  LEVEL_UP: "level_up",
  TITLE_EARNED: "title_earned",
  MISSION_COMPLETED: "mission_completed",
  STREAK_MILESTONE: "streak_milestone",
  PROJECT_SUBMITTED: "project_submitted",
  PROJECT_APPROVED: "project_approved",
  CERTIFICATE_EARNED: "certificate_earned",
  COURSE_COMPLETED: "course_completed",
  STUDY_DAY: "study_day",
  GAME_LEVEL_COMPLETED: "game_level_completed",
  GAME_COMPLETED: "game_completed",
  WORLD_UNLOCKED: "world_unlocked",
  WORLD_MASTERED: "world_mastered",
  BOSS_DEFEATED: "boss_defeated",
  WORLD_CERTIFICATE: "world_certificate",
  NET_MISSION_COMPLETED: "net_mission_completed",
} as const;

// ---------------------------------------------------------------------------
// Gamification tuning
// ---------------------------------------------------------------------------

export const XP = {
  LESSON_COMPLETE: 20,
  EXERCISE_PASS: 10,
  QUIZ_PASS: 25,
  PROJECT_SUBMIT: 50,
  PROJECT_APPROVED: 100,
  STREAK_BONUS: 5, // per consecutive day
  LOGIN: 2,
  GAME_LEVEL_COMPLETE: 15, // per level (overridden per-level in seed data)
  GAME_PERFECT_BONUS: 5, // extra XP for a perfect level
  NET_MISSION_COMPLETE: 15, // per networking mission (overridden per-mission in the catalog)
} as const;

/** Ledger type tags for XpTransaction / CoinTransaction rows. */
export const XP_TYPES = {
  LESSON: "lesson_completed",
  EXERCISE: "exercise_passed",
  QUIZ: "quiz_passed",
  QUIZ_PERFECT: "quiz_perfect",
  PROJECT: "project_approved",
  GAME_LEVEL: "game_level_completed",
  GAME_PERFECT: "game_perfect",
  ACHIEVEMENT: "achievement_earned",
  STREAK: "streak_bonus",
  DAILY_LOGIN: "daily_login",
  LEVEL_UP: "level_up",
  MISSION: "mission_completed",
  CERTIFICATE: "certificate_earned",
  WORLD_CERTIFICATE: "world_certificate",
  BOSS_DEFEATED: "boss_defeated",
  STORE_PURCHASE: "store_purchase",
  NET_MISSION: "net_mission_completed",
} as const;

/** CodeCoins — the spendable currency. XP is NEVER spent. */
export const COINS = {
  LESSON_COMPLETE: 15,
  EXERCISE_PASS: 5,
  QUIZ_PASS: 8,
  QUIZ_PERFECT: 5,
  PROJECT_SUBMIT: 10,
  PROJECT_APPROVED: 25,
  GAME_LEVEL_COMPLETE: 6,
  GAME_PERFECT_BONUS: 3,
  ACHIEVEMENT: 5,
  DAILY_LOGIN: 2,
  STREAK_MILESTONE: 20,
  LEVEL_UP: 5, // per level gained
  NET_MISSION_COMPLETE: 5, // per networking mission (overridden per-mission)
} as const;

export const RARITIES = {
  COMMON: "COMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGENDARY",
  MYTHIC: "MYTHIC",
} as const;

export type Rarity = (typeof RARITIES)[keyof typeof RARITIES];

export const RARITY_META: Record<Rarity, { label: string; color: string; ring: string }> = {
  COMMON: { label: "Common", color: "#94a3b8", ring: "ring-slate-400/50" },
  RARE: { label: "Rare", color: "#38bdf8", ring: "ring-sky-400/50" },
  EPIC: { label: "Epic", color: "#a78bfa", ring: "ring-violet-400/50" },
  LEGENDARY: { label: "Legendary", color: "#fbbf24", ring: "ring-amber-400/60" },
  MYTHIC: { label: "Mythic", color: "#f472b6", ring: "ring-pink-400/60" },
};

/** Level-gated features. */
export const FEATURES = {
  MAX_LEVEL: { level: 100, key: "max_level" },
} as const;

/** Default milestone titles (the richer Title system lives in the DB). */
export const LEVEL_TITLE_BANDS: { level: number; title: string }[] = [
  { level: 1, title: "Novice" },
  { level: 5, title: "Apprentice" },
  { level: 10, title: "Coder" },
  { level: 15, title: "Builder" },
  { level: 20, title: "Crafter" },
  { level: 25, title: "Developer" },
  { level: 30, title: "Engineer" },
  { level: 35, title: "Expert" },
  { level: 40, title: "Specialist" },
  { level: 45, title: "Architect" },
  { level: 50, title: "Master" },
  { level: 60, title: "Virtuoso" },
  { level: 70, title: "Grandmaster" },
  { level: 80, title: "Savant" },
  { level: 90, title: "Legend" },
  { level: 100, title: "Mythic" },
];

export const MAX_LEVEL = 100;

export const LEVELS = {
  /** XP required to reach level N (level 1 = 0). Matches the Level-100 formula
   *  in src/lib/engine/xp.ts — kept for display only. */
  thresholds: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450],
  titles: ["Novice", "Apprentice", "Coder", "Builder", "Crafter", "Developer", "Engineer", "Architect", "Master", "Legend"],
} as const;

export const STUDY = {
  DEFAULT_DAILY_MINUTES: 30,
  PLAN_SLOTS_PER_DAY: 6,
} as const;

// Monaco language mapping — used by learning blocks and games.
export const MONACO_LANGUAGE = {
  html: "html",
  css: "css",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  sql: "sql",
  java: "java",
  cpp: "cpp",
  csharp: "csharp",
} as const;

export const APP_NAME = "CreyvaPH";

// ---------------------------------------------------------------------------
// Releases / What's New
// ---------------------------------------------------------------------------

export const RELEASE_CHANGE_TYPES = {
  NEW: "new",
  IMPROVEMENT: "improvement",
  FIX: "fix",
} as const;

export type ReleaseChangeType = (typeof RELEASE_CHANGE_TYPES)[keyof typeof RELEASE_CHANGE_TYPES];

/** Change-type metadata. `section` is the heading used on the release detail page. */
export const RELEASE_CHANGE_META: Record<ReleaseChangeType, { label: string; section: string }> = {
  new: { label: "New feature", section: "New features" },
  improvement: { label: "Improvement", section: "Improvements" },
  fix: { label: "Bug fix", section: "Bug fixes" },
};
