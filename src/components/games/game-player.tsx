"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Send } from "lucide-react";
import { GAME_KINDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GameResultPanel,
  GameSubmitResult,
  GameView,
  GameLevelView,
  isLevelBeaten,
  useGameSubmit,
} from "@/components/games/shared";
import {
  AnswerState,
  BugHunterInteraction,
  CssPainterInteraction,
  CyberEscapeInteraction,
  HtmlBuilderInteraction,
  JsLogicInteraction,
  WebsiteBuilderInteraction,
} from "@/components/games/players";

// Deterministic shuffle: seeded from the level key so the initial scrambled
// order is identical between server render and client hydration.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(keys: string[], seed: number): string[] {
  const a = [...keys];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = (s >>> 8) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialAnswer(kind: string, config: Record<string, unknown>, levelKey: string): AnswerState {
  const seed = hashSeed(levelKey);
  switch (kind) {
    case GAME_KINDS.HTML_BUILDER:
      return { order: seededShuffle((config.tokens as { key: string }[])?.map((t) => t.key) ?? [], seed) };
    case GAME_KINDS.CSS_PAINTER:
      return { selected: [] };
    case GAME_KINDS.JS_LOGIC:
      return { order: seededShuffle((config.statements as { key: string }[])?.map((s) => s.key) ?? [], seed) };
    case GAME_KINDS.BUG_HUNTER:
      return { code: (config.starterCode as string) ?? "" };
    case GAME_KINDS.CYBER_ESCAPE:
      return { answers: {} };
    case GAME_KINDS.WEBSITE_BUILDER:
      return { code: (config.starterCode as string) ?? "" };
    default:
      return {};
  }
}

function canSubmit(kind: string, config: Record<string, unknown>, answer: AnswerState): boolean {
  switch (kind) {
    case GAME_KINDS.HTML_BUILDER:
      return (answer.order?.length ?? 0) === ((config.tokens as unknown[] | undefined)?.length ?? 0);
    case GAME_KINDS.CSS_PAINTER:
      return (answer.selected?.length ?? 0) > 0;
    case GAME_KINDS.JS_LOGIC:
      return (answer.order?.length ?? 0) === ((config.statements as unknown[] | undefined)?.length ?? 0);
    case GAME_KINDS.BUG_HUNTER:
    case GAME_KINDS.WEBSITE_BUILDER:
      return (answer.code ?? "").trim().length > 0;
    case GAME_KINDS.CYBER_ESCAPE:
      return ((config.questions as { id: string }[] | undefined) ?? []).every((q) => answer.answers?.[q.id] !== undefined);
    default:
      return false;
  }
}

export function GamePlayer({
  game,
  level,
  onResult,
}: {
  game: GameView;
  level: GameLevelView;
  onResult: (result: GameSubmitResult) => void;
}) {
  const [answer, setAnswer] = useState<AnswerState>(() => initialAnswer(game.kind, level.config, level.key));
  const [hintIndex, setHintIndex] = useState(-1);
  const { checking, result, submit } = useGameSubmit(game.slug, level.key);

  const beaten = isLevelBeaten(level.status);
  const ready = canSubmit(game.kind, level.config, answer);
  const shownHint = hintIndex >= 0 && level.hints.length > hintIndex;

  const interactionProps = useMemo(
    () => ({
      config: level.config,
      value: answer,
      onChange: setAnswer,
    }),
    [level.config, answer]
  );

  async function handleSubmit() {
    if (!ready || checking) return;
    const payload: Record<string, unknown> = { kind: game.kind, ...answer };
    const data = await submit(payload);
    if (data) onResult(data);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{level.title}</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                beaten ? "bg-success/10 text-success" : "bg-accent text-accent-foreground"
              )}
            >
              {beaten && <CheckCircle2 className="h-3 w-3" />}
              {beaten ? "Completed" : `${level.xpReward} XP`}
            </span>
            {level.attempts > 0 && <span className="text-xs text-muted-foreground">{level.attempts} attempt{level.attempts === 1 ? "" : "s"}</span>}
          </div>
          {level.description && <p className="mt-1 text-sm text-muted-foreground">{level.description}</p>}
        </div>
      </div>

      {level.objectives.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objectives</p>
          <ul className="space-y-1">
            {level.objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/85">
                <span className="text-success">•</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {game.kind === GAME_KINDS.HTML_BUILDER && <HtmlBuilderInteraction {...interactionProps} />}
        {game.kind === GAME_KINDS.CSS_PAINTER && <CssPainterInteraction {...interactionProps} />}
        {game.kind === GAME_KINDS.JS_LOGIC && <JsLogicInteraction {...interactionProps} />}
        {game.kind === GAME_KINDS.BUG_HUNTER && <BugHunterInteraction {...interactionProps} />}
        {game.kind === GAME_KINDS.CYBER_ESCAPE && <CyberEscapeInteraction {...interactionProps} />}
        {game.kind === GAME_KINDS.WEBSITE_BUILDER && <WebsiteBuilderInteraction {...interactionProps} />}
      </div>

      {level.hints.length > 0 && (
        <div className="space-y-2">
          {shownHint && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-foreground/90">{level.hints[hintIndex]}</p>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setHintIndex((h) => (h + 1) % level.hints.length)}>
            <Lightbulb className="h-3.5 w-3.5" /> {shownHint ? "Next hint" : "Show hint"}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={checking || !ready}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {checking ? "Checking…" : "Submit level"}
        </Button>
        {!ready && <p className="text-xs text-muted-foreground">Finish the task above to submit.</p>}
      </div>

      {result && <GameResultPanel result={result} levelExplanation={level.explanation} />}
    </div>
  );
}
