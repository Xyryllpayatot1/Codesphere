// CSS validation using jsdom's CSSOM. Checks selectors, property/value pairs
// and media queries — deterministic, AI-free.

import type { CssCheck } from "@/lib/engine/validation/types";

type CssRule = {
  selectorText: string;
  declarations: Record<string, string>;
};

function parseCss(css: string): { rules: CssRule[]; mediaRules: { query: string; rules: CssRule[] }[] } {
  const rules: CssRule[] = [];
  const mediaRules: { query: string; rules: CssRule[] }[] = [];

  // Scan top-level blocks with brace balancing (handles nested rules).
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const header = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!header) {
      i = open + 1;
      continue;
    }
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const block = css.slice(open + 1, j - 1);
    if (header.startsWith("@media")) {
      const query = header.replace(/^@media\s*/, "").trim();
      mediaRules.push({ query, rules: parseRuleBlock(block) });
    } else {
      rules.push(...parseRuleBlock(`${header}{${block}}`));
    }
    i = j;
  }

  function parseRuleBlock(block: string): CssRule[] {
    const out: CssRule[] = [];
    const ruleMatches = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    for (const r of ruleMatches) {
      const selectorText = r[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!selectorText || selectorText.startsWith("@")) continue;
      const declarations: Record<string, string> = {};
      const decls = r[2].matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+);?/g);
      for (const d of decls) {
        declarations[d[1].trim().toLowerCase()] = d[2].trim().toLowerCase();
      }
      out.push({ selectorText, declarations });
    }
    return out;
  }

  return { rules, mediaRules };
}

export type CssReport = { passedCount: number; total: number; feedback: string[]; passed: boolean };

export function checkCss(css: string, checks: CssCheck[]): CssReport {
  const { rules, mediaRules } = parseCss(css);
  const feedback: string[] = [];
  let passedCount = 0;

  for (const check of checks) {
    let ok = false;
    switch (check.type) {
      case "selector": {
        ok = rules.some((r) => r.selectorText.includes(check.selector));
        feedback.push(ok ? `Found selector \`${check.selector}\`.` : `Selector \`${check.selector}\` was not found.`);
        break;
      }
      case "property": {
        const matches = rules.filter((r) => r.selectorText.includes(check.selector));
        const prop = check.property.toLowerCase();
        ok = matches.some((r) => {
          const val = r.declarations[prop];
          if (val === undefined) return false;
          if (check.value === undefined) return true;
          return val.includes(check.value.toLowerCase());
        });
        feedback.push(
          ok
            ? `\`${check.selector}\` sets \`${check.property}\`.`
            : `Expected \`${check.selector}\` to set \`${check.property}${
                check.value ? `: ${check.value}` : ""
              }\`.`
        );
        break;
      }
      case "media": {
        ok = mediaRules.some((m) => m.query.includes(check.query.toLowerCase()));
        feedback.push(ok ? `Found @media query "${check.query}".` : `@media query "${check.query}" was not found.`);
        break;
      }
      case "animation": {
        const matches = rules.filter((r) => r.selectorText.includes(check.selector));
        ok = matches.some((r) => {
          const anim = r.declarations["animation"];
          const name = r.declarations["animation-name"];
          return (anim ?? "").includes(check.name) || (name ?? "").includes(check.name);
        });
        feedback.push(
          ok
            ? `\`${check.selector}\` uses the \`${check.name}\` animation.`
            : `Expected \`${check.selector}\` to use the \`${check.name}\` animation.`
        );
        break;
      }
      default:
        break;
    }
    if (ok) passedCount++;
  }

  return { passedCount, total: checks.length, feedback, passed: passedCount === checks.length };
}
