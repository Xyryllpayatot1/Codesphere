import type { TrackId } from "./onboarding";

export type Track = {
  id: TrackId;
  label: string;
  tagline: string;
  /** Lucide icon name (rendered via FeatureIcon). */
  icon: string;
  color: string;
};

export const TRACKS: Track[] = [
  { id: "web", label: "Web Development", tagline: "Build for the browser", icon: "globe", color: "#6366f1" },
  { id: "programming", label: "Programming", tagline: "Think in code", icon: "code2", color: "#10b981" },
  { id: "networking", label: "Networking", tagline: "Design and fix networks", icon: "network", color: "#06b6d4" },
];

export function trackById(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

type CourseLike = {
  category?: { slug: string } | null;
  language?: string | null;
};

/** Which track a course belongs to. Web and networking are mapped explicitly;
 * everything else (Python, game dev, data…) lands in Programming. */
export function trackForCourse(course: CourseLike): TrackId {
  const category = course.category?.slug ?? "";
  const lang = (course.language ?? "").toLowerCase();
  if (category === "web-development" || ["html", "css", "javascript", "typescript", "jsx", "tsx"].includes(lang)) return "web";
  if (category === "networking" || lang === "networking") return "networking";
  return "programming";
}
