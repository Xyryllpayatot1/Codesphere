// ---------------------------------------------------------------------------
// Learning modes + content-block classification.
//
// Modes re-prioritize how a lesson is presented; they never delete content.
// "Instructor mode" enforces the teach-first posture: practice blocks stay
// behind a barrier until the student says they have reviewed the teaching.
// ---------------------------------------------------------------------------

import type { ContentBlock } from "@/lib/content/types";

export const LEARNING_MODES = {
  READING: "READING",
  VIDEO: "VIDEO",
  INTERACTIVE: "INTERACTIVE",
  PRACTICE: "PRACTICE",
} as const;

export type LearningMode = (typeof LEARNING_MODES)[keyof typeof LEARNING_MODES];

export const LEARNING_MODE_META: Record<LearningMode, { label: string; short: string; icon: string; description: string }> = {
  [LEARNING_MODES.READING]: {
    label: "Reading",
    short: "Read",
    icon: "",
    description: "Follow the full concept-first lesson as a guided article.",
  },
  [LEARNING_MODES.VIDEO]: {
    label: "Video",
    short: "Watch",
    icon: "",
    description: "See the visual walkthrough — diagrams, analogies and demos.",
  },
  [LEARNING_MODES.INTERACTIVE]: {
    label: "Interactive",
    short: "Tinker",
    icon: "",
    description: "Jump straight into live demos and hands-on activities.",
  },
  [LEARNING_MODES.PRACTICE]: {
    label: "Practice",
    short: "Practice",
    icon: "",
    description: "Drill the exercises, quizzes and guided challenges.",
  },
} as const;

export const LEARNING_MODE_VALUES = Object.keys(LEARNING_MODES) as LearningMode[];

/**
 * Block categories used by mode filtering and the instructor-mode barrier.
 *  - teach:       concept-building content (reading / video material)
 *  - interactive: live demos and tinkerable examples
 *  - practice:    exercises, quizzes, guided practice, checkpoints
 *  - reflection:  end-of-lesson reflection prompts (always shown)
 */
export type BlockCategory = "teach" | "interactive" | "practice" | "reflection";

const INTERACTIVE_TYPES = new Set<ContentBlock["type"]>(["example", "demo", "promptBuilder", "promptAnalyzer"]);

const PRACTICE_TYPES = new Set<ContentBlock["type"]>(["guided", "exercise", "quiz", "checkpoint"]);

export function blockCategory(block: ContentBlock): BlockCategory {
  if (block.type === "reflection") return "reflection";
  if (INTERACTIVE_TYPES.has(block.type)) return "interactive";
  if (PRACTICE_TYPES.has(block.type)) return "practice";
  return "teach";
}

/** Teach blocks that read as "video" content — diagrams, analogies, breakdowns. */
const VIDEO_TEACH_TYPES = new Set<ContentBlock["type"]>(["section", "visual", "analogy", "breakdown", "embed", "mistake"]);

export function isVisualTeachBlock(block: ContentBlock): boolean {
  return VIDEO_TEACH_TYPES.has(block.type);
}

export function splitBlocksByCategory(blocks: ContentBlock[]) {
  const teach: ContentBlock[] = [];
  const visualTeach: ContentBlock[] = [];
  const interactive: ContentBlock[] = [];
  const practice: ContentBlock[] = [];
  const reflection: ContentBlock[] = [];
  for (const block of blocks) {
    const category = blockCategory(block);
    if (category === "teach") {
      teach.push(block);
      if (isVisualTeachBlock(block)) visualTeach.push(block);
    } else if (category === "interactive") interactive.push(block);
    else if (category === "practice") practice.push(block);
    else reflection.push(block);
  }
  return { teach, visualTeach, interactive, practice, reflection };
}

/**
 * The blocks to render for a given mode, preserving original order.
 * Non-primary teaching content is handled separately by the renderer
 * (collapsed "recap" <details>) so nothing is ever lost.
 */
export function blocksForMode(blocks: ContentBlock[], mode: LearningMode): ContentBlock[] {
  switch (mode) {
    case LEARNING_MODES.READING:
      return blocks;
    case LEARNING_MODES.VIDEO:
      return blocks.filter((b) => blockCategory(b) !== "teach" || isVisualTeachBlock(b));
    case LEARNING_MODES.INTERACTIVE:
      return blocks.filter((b) => blockCategory(b) !== "teach");
    case LEARNING_MODES.PRACTICE:
      return blocks.filter((b) => blockCategory(b) === "practice" || blockCategory(b) === "reflection");
    default:
      return blocks;
  }
}

export function teachingRecapBlocks(blocks: ContentBlock[], mode: LearningMode): ContentBlock[] {
  switch (mode) {
    case LEARNING_MODES.VIDEO:
      return blocks.filter((b) => blockCategory(b) === "teach" && !isVisualTeachBlock(b));
    case LEARNING_MODES.INTERACTIVE:
      return blocks.filter((b) => blockCategory(b) === "teach");
    case LEARNING_MODES.PRACTICE:
      return blocks.filter((b) => blockCategory(b) === "teach" || blockCategory(b) === "interactive");
    default:
      return [];
  }
}
