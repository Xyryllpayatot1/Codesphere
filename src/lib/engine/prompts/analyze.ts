// ---------------------------------------------------------------------------
// Prompt Analyzer — a deterministic, rule-based prompt grader. No AI calls.
//
// It checks a prompt for the seven components of the CreyvaPH prompt model
// (ROLE / TASK / CONTEXT / CONSTRAINTS / EXAMPLES / OUTPUT FORMAT /
// SUCCESS CRITERIA) and returns a 0–100 score plus per-component feedback.
//
// Pure and testable: `analyzePrompt` has no I/O and no dependencies.
// ---------------------------------------------------------------------------

export type PromptComponentKey =
  | "role"
  | "task"
  | "context"
  | "constraints"
  | "examples"
  | "outputFormat"
  | "successCriteria";

export type ComponentFeedback = {
  key: PromptComponentKey;
  label: string;
  weight: number;
  found: boolean;
  strength: number; // 0..1 partial credit for weak signals
  hits: string[];
  tip: string;
};

export type PromptAnalysis = {
  score: number;
  grade: "great" | "good" | "needs-work" | "weak";
  wordCount: number;
  components: ComponentFeedback[];
  strengths: string[];
  improvements: string[];
  summary: string;
};

const COMPONENT_WEIGHTS: Record<PromptComponentKey, number> = {
  role: 10,
  task: 30,
  context: 15,
  constraints: 15,
  examples: 5,
  outputFormat: 15,
  successCriteria: 10,
};

type Rule = { pattern: RegExp; label: string; tip: string };

const RULES: Record<PromptComponentKey, Rule> = {
  role: {
    pattern:
      /(you are|you're|you are to|act as|acting as|your role|role is to|pretend you|imagine you are|you will act|you will be|be an? (expert|senior|junior|beginner|mentor|tutor)|as an? (expert|senior|developer|engineer|tutor))/i,
    label: "Role",
    tip: 'Add a ROLE so the assistant knows who to be — "You are a senior JavaScript developer who teaches beginners."',
  },
  task: {
    pattern:
      /\b(write|create|build|make|generate|fix|debug|refactor|explain|describe|convert|translate|add|remove|change|update|implement|design|rewrite|improve|compare|summarize|summarise|list|show|tell|help me|give me|i need|i want|can you|could you|i '?d like|check|review|optimize|extend|complete|sort|filter|count)\b/i,
    label: "Task",
    tip: 'Give a TASK — one clear action verb telling the assistant exactly what to do ("Write", "Fix", "Explain", "Convert").',
  },
  context: {
    pattern:
      /\b(i am|i'm|i have|i use|i work|i '?m learning|for my|my (project|app|code|website|homework|assignment|school|team|company)|we use|we're|we are|using (react|next|vue|python|javascript|typescript|java|sql|node|express|django|rails)|in my|this is for|project (is|about)|beginner|student|stack|version|codebase|repo|repository|database|already has|existing code)\b/i,
    label: "Context",
    tip: 'Add CONTEXT — who you are, what you are building, your skill level, and what the assistant should assume.',
  },
  constraints: {
    pattern:
      /\b(do not|don'?t|avoid|must not|should not|only use|without|no (external|frameworks|libraries|dependencies|api|comments)|unless|limit|max|maximum|under|within|at most|at least|keep (it|the|this)|using only|stay under|not (use|allowed)|except|excluding|no css|no js|plain|vanilla)\b/i,
    label: "Constraints",
    tip: 'Add CONSTRAINTS — what to ban, limit or keep out ("No frameworks, ES6 only, under 40 lines").',
  },
  examples: {
    pattern:
      /(for example|e\.g\.|like this|here is|here's|example:|such as|sample|expected (input|output)|input:|output:|similar to|reference|see (below|attached)|```|->|=>|\ballowed)\b/i,
    label: "Examples",
    tip: 'Add an EXAMPLE — a sample input/output or reference output so the assistant can match the expected shape.',
  },
  outputFormat: {
    pattern:
      /\b(format|json|csv|yaml|markdown|as a list|bullet|numbered|step[- ]by[- ]step|plain (english|language)|table|code block|respond with|reply with|return|output|give me a|write (it|the) (as|in)|explain in|one[- ]line|concise|short answer|first|then a|structure|section|heading|summary|at the end)\b/i,
    label: "Output format",
    tip: 'Specify the OUTPUT FORMAT — JSON, a list, code then explanation, one line per idea — so the answer is usable.',
  },
  successCriteria: {
    pattern:
      /\b(make sure|ensure|verify|test|check|works when|i (will|'ll) know|it should|should (work|be|handle|return)|needs to (work|be|handle)|criteria|acceptance|i expect|when i (click|run|submit|type|paste)|the result should|pass|passes|good enough|done when)\b/i,
    label: "Success criteria",
    tip: 'Add SUCCESS CRITERIA — how you will know it worked ("It should pass these three test cases").',
  },
};

function countHits(text: string, pattern: RegExp): { hits: string[]; strength: number } {
  const matches = text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g")) ?? [];
  const unique = Array.from(new Set(matches));
  const strength = Math.min(1, unique.length * 0.45 + (text.length > 80 ? 0.15 : 0));
  return { hits: unique, strength };
}

export function analyzePrompt(text: string): PromptAnalysis {
  const trimmed = text.trim();

  if (trimmed.length < 2) {
    return {
      score: 0,
      grade: "weak",
      wordCount: 0,
      components: (Object.keys(RULES) as PromptComponentKey[]).map((key) => ({
        key,
        label: RULES[key].label,
        weight: COMPONENT_WEIGHTS[key],
        found: false,
        strength: 0,
        hits: [],
        tip: RULES[key].tip,
      })),
      strengths: [],
      improvements: (Object.keys(RULES) as PromptComponentKey[]).map((key) => RULES[key].tip),
      summary: "Your prompt is empty. Paste a draft and run the analyzer to see how it can improve.",
    };
  }

  const components = (Object.keys(RULES) as PromptComponentKey[]).map<ComponentFeedback>((key) => {
    const rule = RULES[key];
    const { hits, strength } = countHits(trimmed, rule.pattern);
    return {
      key,
      label: rule.label,
      weight: COMPONENT_WEIGHTS[key],
      found: hits.length > 0,
      strength,
      hits,
      tip: rule.tip,
    };
  });

  const foundMap = new Map(components.map((c) => [c.key, c]));

  let score = 0;
  for (const c of components) {
    score += c.weight * c.strength;
  }

  // Length / specificity bonuses (capped).
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  score += Math.min(4, Math.floor(words / 60));
  // Distinct task verbs suggest a sharper task.
  const taskVerbs = new Set(trimmed.toLowerCase().match(/\b(write|create|build|make|generate|fix|debug|refactor|explain|describe|convert|translate|add|remove|change|update|implement|rewrite|improve|compare|summarize|list)\b/g) ?? []);
  if (taskVerbs.size >= 2) score += 2;
  // Very short prompts without a task are weak regardless of matches.
  if (!foundMap.get("task")?.found && words < 10) score = Math.min(score, 20);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade = score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "needs-work" : "weak";

  const strengths: string[] = [];
  const improvements: string[] = [];

  for (const c of components) {
    if (c.found) {
      strengths.push(
        `${c.label} present${c.strength >= 0.6 ? "" : " (could be stronger)"} — matched ${c.hits.slice(0, 3).join(", ")}.`,
      );
    } else {
      improvements.push(c.tip);
    }
  }

  if (!foundMap.get("task")?.found) {
    improvements.unshift("Your prompt has no clear TASK. Start with an action verb: what exactly should the assistant do?");
  }
  if (words < 25) {
    improvements.push("Your prompt is very short. A good prompt usually gives enough detail for a confident answer.");
  }
  if (score >= 70 && improvements.length === 0) {
    strengths.push("Every component is covered — this prompt should get a focused, useful answer.");
  }

  let summary: string;
  if (grade === "great") summary = "This is a well-structured prompt. Every important component is covered.";
  else if (grade === "good") summary = "Solid prompt. A couple of small additions would make it excellent.";
  else if (grade === "needs-work") summary = "This prompt is missing several components. Start with a clear task, then add context, constraints and an output format.";
  else summary = "This prompt is too vague to get a useful answer. Rebuild it block by block — task first.";

  return { score, grade, wordCount: words, components, strengths, improvements, summary };
}

/** Shortcut for quick checks. */
export function scorePrompt(text: string): number {
  return analyzePrompt(text).score;
}
