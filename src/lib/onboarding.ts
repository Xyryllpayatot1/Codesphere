export type LearningPathId = "FUNDAMENTALS" | "WEB" | "PYTHON" | "NETWORKING" | "GAME_DEV" | "DATA";

export type TrackId = "web" | "programming" | "networking";

export type LearningPath = {
  id: LearningPathId;
  /** Short "I want to..." label shown on the picker card. */
  label: string;
  headline: string;
  description: string;
  /** Lucide icon name (rendered via FeatureIcon). */
  icon: string;
  color: string;
  track: TrackId;
  /** First course slug to start on. Empty = no course exists yet, fall back to Start Here defaults. */
  starter: string;
};

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "FUNDAMENTALS",
    label: "I'm new — guide me",
    headline: "Start from zero",
    description: "We'll build your very first web pages and learn the basics that power every website.",
    icon: "compass",
    color: "#6366f1",
    track: "web",
    starter: "html-fundamentals",
  },
  {
    id: "WEB",
    label: "I want to build websites",
    headline: "Web Development",
    description: "HTML, CSS and JavaScript — make real pages and apps for the browser.",
    icon: "globe",
    color: "#8b5cf6",
    track: "web",
    starter: "html-fundamentals",
  },
  {
    id: "PYTHON",
    label: "I want to learn Python",
    headline: "Programming with Python",
    description: "Write programs that solve problems. Python is the friendliest language to start with.",
    icon: "code2",
    color: "#22c55e",
    track: "programming",
    starter: "",
  },
  {
    id: "NETWORKING",
    label: "I want to work with networks",
    headline: "Networks & IT",
    description: "Design networks, trace packets and fix connections in the Networking Lab.",
    icon: "network",
    color: "#06b6d4",
    track: "networking",
    starter: "",
  },
  {
    id: "GAME_DEV",
    label: "I want to make games",
    headline: "Game Development",
    description: "Start with browser games — mechanics, loops and creativity.",
    icon: "gamepad2",
    color: "#f59e0b",
    track: "programming",
    starter: "",
  },
  {
    id: "DATA",
    label: "I want to work with data",
    headline: "Data & Automation",
    description: "Learn to collect, clean and analyse data with code.",
    icon: "database",
    color: "#ef4444",
    track: "programming",
    starter: "",
  },
];

export function pathById(id?: string | null): LearningPath | null {
  return LEARNING_PATHS.find((p) => p.id === id) ?? null;
}

export type ExperienceId = "NONE" | "LITTLE" | "COMFORTABLE";

export const EXPERIENCE_LEVELS: { id: ExperienceId; label: string; description: string; icon: string }[] = [
  { id: "NONE", label: "I've never coded", description: "No experience at all — that's the best time to start.", icon: "sprout" },
  { id: "LITTLE", label: "I've tried a little", description: "A bit of exposure, but I still need the basics.", icon: "leaf" },
  { id: "COMFORTABLE", label: "I'm comfortable coding", description: "I've written real code before and want a challenge.", icon: "trees" },
];

export const DAILY_GOALS: { minutes: number; label: string; icon: string }[] = [
  { minutes: 10, label: "10 min a day", icon: "zap" },
  { minutes: 20, label: "20 min a day", icon: "flame" },
  { minutes: 30, label: "30 min a day", icon: "rocket" },
  { minutes: 45, label: "45 min a day", icon: "target" },
];

export const DEFAULT_DAILY_GOAL_MINUTES = 20;
