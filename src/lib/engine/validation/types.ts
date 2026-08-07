// ---------------------------------------------------------------------------
// Exercise validation configuration + results.
//
// Validation is deterministic and AI-free: it uses a sandboxed JS runner
// (node:vm), a DOM parser (jsdom) for HTML/CSS structure checks, and plain
// test-case comparison. New check kinds are added by extending these unions —
// never by changing lessons.
// ---------------------------------------------------------------------------

export type HtmlCheck =
  | { type: "tag"; selector: string; min?: number } // at least N matching elements
  | { type: "class"; selector: string; className: string }
  | { type: "id"; selector: string; id: string }
  | { type: "attribute"; selector: string; attr: string; value?: string }
  | { type: "text"; selector: string; contains: string; ignoreCase?: boolean }
  | { type: "noTag"; selector: string }; // element must NOT exist

export type CssCheck =
  | { type: "selector"; selector: string }
  | { type: "property"; selector: string; property: string; value?: string }
  | { type: "media"; query: string }
  | { type: "animation"; selector: string; name: string };

export type FunctionTest = {
  args: unknown[];
  expected: unknown;
  description?: string;
};

export type ExerciseConfig =
  | { kind: "code_output"; expectedOutput: string; trimLines?: boolean; ignoreCase?: boolean; requiredRatio?: number }
  | { kind: "js_function"; functionName: string; tests: FunctionTest[]; requiredRatio?: number }
  | { kind: "js_assert"; test: string; requiredRatio?: number }
  | { kind: "html_structure"; checks: HtmlCheck[]; requiredRatio?: number }
  | { kind: "css_check"; checks: CssCheck[]; requiredRatio?: number }
  | { kind: "fill_blank"; template: string; blanks: (string | string[])[]; requiredRatio?: number }
  | { kind: "code_completion"; lines: string[]; answer: number[]; requiredRatio?: number }
  | { kind: "ordering"; steps: string[]; answer: number[]; requiredRatio?: number };

export type ExerciseResult = {
  passed: boolean;
  score: number;
  maxScore: number;
  ratio: number;
  feedback: string[];
  output?: string;
};

export const DEFAULT_REQUIRED_RATIO = 1;
