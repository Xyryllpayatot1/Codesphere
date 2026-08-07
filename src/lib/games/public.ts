// ---------------------------------------------------------------------------
// Produces a client-safe view of a level's config. Answer keys (correct order,
// correct selection, question answers/explanations) are stripped so players
// can't cheat by reading the payload — only what the renderer needs is sent.
// ---------------------------------------------------------------------------

import type { GameLevelConfig } from "@/lib/games/types";

export type PublicLevelConfig = Record<string, unknown>;

export function publicLevelConfig(kind: string, config: GameLevelConfig): PublicLevelConfig {
  switch (kind) {
    case "html_builder": {
      const c = config as Extract<GameLevelConfig, { kind: "html_builder" }>;
      return { kind: c.kind, description: c.description, tokens: c.tokens };
    }
    case "css_painter": {
      const c = config as Extract<GameLevelConfig, { kind: "css_painter" }>;
      return { kind: c.kind, description: c.description, target: c.target, declarations: c.declarations };
    }
    case "js_logic": {
      const c = config as Extract<GameLevelConfig, { kind: "js_logic" }>;
      return { kind: c.kind, description: c.description, statements: c.statements, expectedOutput: c.expectedOutput };
    }
    case "bug_hunter": {
      const c = config as Extract<GameLevelConfig, { kind: "bug_hunter" }>;
      return { kind: c.kind, description: c.description, language: c.language, starterCode: c.starterCode };
    }
    case "cyber_escape": {
      const c = config as Extract<GameLevelConfig, { kind: "cyber_escape" }>;
      return {
        kind: c.kind,
        description: c.description,
        scenario: c.scenario,
        questions: c.questions.map(({ id, type, prompt, scenario, url, options, points }) => ({
          id,
          type,
          prompt,
          scenario,
          url,
          options,
          points,
        })),
      };
    }
    case "website_builder": {
      const c = config as Extract<GameLevelConfig, { kind: "website_builder" }>;
      return { kind: c.kind, description: c.description, starterCode: c.starterCode };
    }
    default:
      return config as unknown as PublicLevelConfig;
  }
}
