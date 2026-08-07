// ---------------------------------------------------------------------------
// Deterministic grading engine for learning games. Dispatches on `gameKind`
// and interprets the level's `config` JSON. Reuses the existing exercise
// validation engine (sandboxed JS, jsdom HTML/CSS checks) so game grading is
// consistent with lesson grading — no AI anywhere.
// ---------------------------------------------------------------------------

import { runJavaScript } from "@/lib/engine/validation/runner-js";
import { validateExercise } from "@/lib/engine/validation";
import type { GameLevelConfig, GameLevelResult, GameSubmission } from "@/lib/games/types";

export function gradeGameLevel(gameKind: string, config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  switch (gameKind) {
    case "html_builder":
      return gradeHtmlBuilder(config, submission);
    case "css_painter":
      return gradeCssPainter(config, submission);
    case "js_logic":
      return gradeJsLogic(config, submission);
    case "bug_hunter":
      return gradeBugHunter(config, submission);
    case "cyber_escape":
      return gradeCyberEscape(config, submission);
    case "website_builder":
      return gradeWebsiteBuilder(config, submission);
    default:
      return {
        passed: false,
        score: 0,
        maxScore: 0,
        ratio: 0,
        perfect: false,
        feedback: [`Unsupported game kind: ${gameKind}`],
      };
  }
}

function finalize(
  passed: boolean,
  ratio: number,
  maxScore: number,
  feedback: string[],
  output?: string
): GameLevelResult {
  return {
    passed,
    score: Math.round(maxScore * ratio),
    maxScore,
    ratio,
    perfect: passed && ratio >= 1,
    feedback,
    output,
  };
}

// ───────────────────────────── HTML Builder ────────────────────────────────

function gradeHtmlBuilder(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "html_builder" }>;
  const order = (submission as Extract<GameSubmission, { kind: "html_builder" }>).order ?? [];
  const maxScore = 100;

  if (order.length !== cfg.answer.length) {
    return finalize(false, 0, maxScore, [`Place all ${cfg.answer.length} blocks to build the page.`]);
  }

  const correct = order.reduce((n, key, i) => n + (key === cfg.answer[i] ? 1 : 0), 0);
  const ratio = correct / cfg.answer.length;
  const feedback =
    correct === cfg.answer.length
      ? ["Perfect structure — the page is built exactly right!"]
      : [
          `${correct} of ${cfg.answer.length} blocks are in the right position.`,
          order
            .map((key, i) => (key === cfg.answer[i] ? `✓ Step ${i + 1} correct.` : `✗ Step ${i + 1} should use a different tag.`))
            .join("\n"),
        ];
  return finalize(ratio >= 1, ratio, maxScore, feedback);
}

// ────────────────────────────── CSS Painter ────────────────────────────────

function gradeCssPainter(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "css_painter" }>;
  const selected = new Set((submission as Extract<GameSubmission, { kind: "css_painter" }>).selected ?? []);
  const maxScore = cfg.correct.length * 10;
  const passRatio = cfg.passRatio ?? 0.75;

  const correct = new Set(cfg.correct);
  const rightPicks = [...selected].filter((k) => correct.has(k)).length;
  const wrongPicks = [...selected].filter((k) => !correct.has(k)).length;
  const missed = [...correct].filter((k) => !selected.has(k)).length;

  const scoreRatio = Math.max(0, (rightPicks - wrongPicks) / correct.size);
  const ratio = scoreRatio;
  const passed = correct.size > 0 && ratio >= passRatio;

  const feedback: string[] = [];
  if (rightPicks > 0) feedback.push(`✓ ${rightPicks} correct declaration${rightPicks === 1 ? "" : "s"} applied.`);
  if (wrongPicks > 0) feedback.push(`✗ ${wrongPicks} declaration${wrongPicks === 1 ? "" : "s"} don't belong here.`);
  if (missed > 0) feedback.push(`Missing ${missed} declaration${missed === 1 ? "" : "s"}.`);
  if (passed && wrongPicks === 0 && missed === 0) feedback.push("The target design is matched exactly!");

  return finalize(passed, ratio, maxScore, feedback);
}

// ──────────────────────────── JS Logic Puzzle ──────────────────────────────

function gradeJsLogic(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "js_logic" }>;
  const order = (submission as Extract<GameSubmission, { kind: "js_logic" }>).order ?? [];
  const maxScore = 100;
  const byKey = new Map(cfg.statements.map((s) => [s.key, s]));

  if (order.length !== cfg.answer.length || order.some((k) => !byKey.has(k))) {
    return finalize(false, 0, maxScore, ["Arrange every statement block before running the program."]);
  }

  const code = order.map((key) => byKey.get(key)!.code).join("\n");
  const result = runJavaScript(code);

  if (result.error) {
    return finalize(false, 0, maxScore, [`Runtime error: ${result.error}`, "Re-order the blocks so the program runs top to bottom."], result.output);
  }

  const normalize = (s: string) => s.trim().split("\n").map((l) => l.trim()).join("\n").toLowerCase();
  const expected = normalize(cfg.expectedOutput);
  const actual = normalize(result.output);
  const passed = actual === expected;

  return finalize(
    passed,
    passed ? 1 : 0,
    maxScore,
    passed
      ? ["The program runs and prints exactly the expected output!"]
      : [`Expected output:\n${expected || "(empty)"}`, `Your output:\n${actual || "(empty)"}`],
    result.output
  );
}

// ────────────────────────────── Bug Hunter ─────────────────────────────────

function gradeBugHunter(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "bug_hunter" }>;
  const code = (submission as Extract<GameSubmission, { kind: "bug_hunter" }>).code ?? "";
  const result = validateExercise({ type: cfg.exerciseType, config: cfg.exerciseConfig, points: cfg.points }, code);
  return finalize(result.passed, result.ratio, cfg.points, result.feedback, result.output);
}

// ───────────────────────────── Cyber Escape ────────────────────────────────

function gradeCyberEscape(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "cyber_escape" }>;
  const answers = (submission as Extract<GameSubmission, { kind: "cyber_escape" }>).answers ?? {};
  const maxScore = cfg.questions.reduce((s, q) => s + q.points, 0);
  const passRatio = cfg.passRatio ?? 0.8;

  let score = 0;
  const feedback: string[] = [];
  for (const q of cfg.questions) {
    const given = answers[q.id];
    const correct = q.type === "true_false" ? given === q.answer : given === q.answer;
    if (correct) {
      score += q.points;
      feedback.push(`✓ ${q.prompt} — correct.`);
    } else {
      feedback.push(`✗ ${q.prompt} — ${q.explanation}`);
    }
  }
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  return finalize(ratio >= passRatio, ratio, maxScore, feedback);
}

// ─────────────────────────── Website Builder ───────────────────────────────

function gradeWebsiteBuilder(config: GameLevelConfig, submission: GameSubmission): GameLevelResult {
  const cfg = config as Extract<GameLevelConfig, { kind: "website_builder" }>;
  const code = (submission as Extract<GameSubmission, { kind: "website_builder" }>).code ?? "";
  const result = validateExercise(
    {
      type: cfg.checkKind === "css_check" ? "css_check" : "html_structure",
      config:
        cfg.checkKind === "css_check"
          ? { kind: "css_check", checks: cfg.checks as never, requiredRatio: cfg.requiredRatio }
          : { kind: "html_structure", checks: cfg.checks as never, requiredRatio: cfg.requiredRatio },
      points: 100,
    },
    code
  );
  return finalize(result.passed, result.ratio, 100, result.feedback, result.output);
}
