// ---------------------------------------------------------------------------
// Exercise validation orchestrator. Dispatches on the exercise kind and
// returns a structured, deterministic result. This is the AI-free grading
// engine behind every "Check answer" button.
// ---------------------------------------------------------------------------

import { runJavaScript, deepEqual } from "@/lib/engine/validation/runner-js";
import { checkHtml } from "@/lib/engine/validation/checker-html";
import { checkCss } from "@/lib/engine/validation/checker-css";
import {
  DEFAULT_REQUIRED_RATIO,
  type ExerciseConfig,
  type ExerciseResult,
  type FunctionTest,
} from "@/lib/engine/validation/types";

export type ExerciseLike = {
  type: string;
  config: unknown;
  points?: number;
  solution?: string | null;
};

function normalizeOutput(s: string, trimLines: boolean, ignoreCase: boolean): string {
  let out = s.trim();
  if (trimLines) out = out.split("\n").map((l) => l.trim()).join("\n");
  if (ignoreCase) out = out.toLowerCase();
  return out;
}

function buildFunctionHarness(userCode: string, functionName: string, tests: FunctionTest[]): string {
  const testsJson = JSON.stringify(tests).replace(/</g, "\\u003c");
  return `
${userCode}

(function () {
  var __tests = ${testsJson};
  var __results = [];
  var __fn = ${functionName};
  for (var i = 0; i < __tests.length; i++) {
    var t = __tests[i];
    try {
      var res = __fn.apply(null, t.args);
      var passed = typeof __deepEqual === 'function' ? __deepEqual(res, t.expected) : JSON.stringify(res) === JSON.stringify(t.expected);
      __results.push({ passed: passed, got: typeof __stringify === 'function' ? __stringify(res) : String(res) });
    } catch (e) {
      __results.push({ passed: false, got: String((e && e.message) || e) });
    }
  }
  globalThis.__testResults = __results;
})();
`;
}

export function validateExercise(exercise: ExerciseLike, userCode: string): ExerciseResult {
  const config = exercise.config as ExerciseConfig;
  const maxScore = exercise.points ?? 10;

  const ratioScore = (ratio: number): ExerciseResult => {
    const required = (config as { requiredRatio?: number }).requiredRatio ?? DEFAULT_REQUIRED_RATIO;
    const score = Math.round(maxScore * ratio);
    return {
      passed: ratio >= required,
      score,
      maxScore,
      ratio,
      feedback: [],
    };
  };

  switch (exercise.type) {
    case "code_output": {
      const cfg = config as Extract<ExerciseConfig, { kind: "code_output" }>;
      const result = runJavaScript(userCode);
      if (result.error) {
        return {
          passed: false,
          score: 0,
          maxScore,
          ratio: 0,
          feedback: [`Runtime error: ${result.error}`],
          output: result.output,
        };
      }
      const actual = normalizeOutput(result.output, cfg.trimLines ?? true, cfg.ignoreCase ?? false);
      const expected = normalizeOutput(cfg.expectedOutput, cfg.trimLines ?? true, cfg.ignoreCase ?? false);
      const pass = actual === expected;
      return {
        passed: pass,
        score: pass ? maxScore : 0,
        maxScore,
        ratio: pass ? 1 : 0,
        feedback: pass
          ? ["Output matches the expected result. Great job!"]
          : [
              `Expected output:\n${expected || "(empty)"}`,
              `Your output:\n${actual || "(empty)"}`,
            ],
        output: result.output,
      };
    }

    case "js_function": {
      const cfg = config as Extract<ExerciseConfig, { kind: "js_function" }>;
      const harness = buildFunctionHarness(userCode, cfg.functionName, cfg.tests);
      let collected: { passed: boolean; got: string }[] = [];
      const result = runJavaScript(harness, {
        globals: {
          __deepEqual: deepEqual,
          __stringify: (v: unknown) => {
            try {
              return JSON.stringify(v);
            } catch {
              return String(v);
            }
          },
        },
        onDone: (sandbox) => {
          const r = sandbox.__testResults;
          if (Array.isArray(r)) collected = r as { passed: boolean; got: string }[];
        },
      });
      if (result.error) {
        return {
          passed: false,
          score: 0,
          maxScore,
          ratio: 0,
          feedback: [`Error: ${result.error}`],
        };
      }
      const results = collected;
      const passed = results.filter((r) => r.passed).length;
      const ratio = results.length === 0 ? 0 : passed / results.length;
      const feedback = results.map((r, i) => {
        const desc = cfg.tests[i]?.description ?? `Test case ${i + 1}`;
        return r.passed
          ? `✓ ${desc}`
          : `✗ ${desc} — got ${r.got}`;
      });
      const base = ratioScore(ratio);
      return { ...base, feedback };
    }

    case "js_assert": {
      const cfg = config as Extract<ExerciseConfig, { kind: "js_assert" }>;
      const combined = `${userCode}\n\n${cfg.test}`;
      const result = runJavaScript(combined, {
        globals: {
          assert: (cond: unknown, msg?: string) => {
            if (!cond) throw new Error(msg || "Assertion failed");
          },
        },
      });
      const pass = !result.error;
      return {
        passed: pass,
        score: pass ? maxScore : 0,
        maxScore,
        ratio: pass ? 1 : 0,
        feedback: pass
          ? ["All assertions passed!"]
          : [`Assertion failed: ${result.error}`],
        output: result.output,
      };
    }

    case "html_structure": {
      const cfg = config as Extract<ExerciseConfig, { kind: "html_structure" }>;
      const { passedCount, total, feedback } = checkHtml(userCode, cfg.checks);
      const ratio = total === 0 ? 0 : passedCount / total;
      const required = cfg.requiredRatio ?? DEFAULT_REQUIRED_RATIO;
      return {
        passed: ratio >= required,
        score: Math.round(maxScore * ratio),
        maxScore,
        ratio,
        feedback,
      };
    }

    case "css_check": {
      const cfg = config as Extract<ExerciseConfig, { kind: "css_check" }>;
      const { passedCount, total, feedback } = checkCss(userCode, cfg.checks);
      const ratio = total === 0 ? 0 : passedCount / total;
      const required = cfg.requiredRatio ?? DEFAULT_REQUIRED_RATIO;
      return {
        passed: ratio >= required,
        score: Math.round(maxScore * ratio),
        maxScore,
        ratio,
        feedback,
      };
    }

    case "fill_blank": {
      const cfg = config as Extract<ExerciseConfig, { kind: "fill_blank" }>;
      // userCode contains answers joined by a delimiter in blank order.
      const answers = userCode.split("|||");
      let correct = 0;
      const feedback: string[] = [];
      cfg.blanks.forEach((expected, i) => {
        const actual = normalizeText(answers[i] ?? "");
        const accepts = (Array.isArray(expected) ? expected : [expected]).map((a) => normalizeText(a));
        if (accepts.includes(actual)) {
          correct++;
          feedback.push(`✓ Blank ${i + 1} correct.`);
        } else {
          feedback.push(`✗ Blank ${i + 1} is not quite right.`);
        }
      });
      const ratio = cfg.blanks.length === 0 ? 0 : correct / cfg.blanks.length;
      const required = cfg.requiredRatio ?? DEFAULT_REQUIRED_RATIO;
      return {
        passed: ratio >= required,
        score: Math.round(maxScore * ratio),
        maxScore,
        ratio,
        feedback,
      };
    }

    case "code_completion":
    case "ordering": {
      const cfg = config as Extract<ExerciseConfig, { kind: "code_completion" | "ordering" }>;
      const submitted = parseIndexes(userCode);
      let correct = 0;
      for (let i = 0; i < cfg.answer.length; i++) {
        if (submitted[i] === cfg.answer[i]) correct++;
      }
      const ratio = cfg.answer.length === 0 ? 0 : correct / cfg.answer.length;
      const required = cfg.requiredRatio ?? DEFAULT_REQUIRED_RATIO;
      return {
        passed: ratio >= required,
        score: Math.round(maxScore * ratio),
        maxScore,
        ratio,
        feedback:
          ratio >= required
            ? ["Everything is in the right order. Nicely done!"]
            : [`${correct} of ${cfg.answer.length} items are in the correct position.`],
      };
    }

    default:
      return {
        passed: false,
        score: 0,
        maxScore,
        ratio: 0,
        feedback: [`Unsupported exercise type: ${exercise.type}`],
      };
  }
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseIndexes(raw: string): number[] {
  return String(raw)
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n));
}
