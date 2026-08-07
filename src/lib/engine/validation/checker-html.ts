// HTML structure validation using jsdom. Checks tags, classes, ids,
// attributes and text — deterministic, AI-free.

import { JSDOM } from "jsdom";
import type { HtmlCheck } from "@/lib/engine/validation/types";

export type CheckReport = { passedCount: number; total: number; feedback: string[]; passed: boolean };

export function checkHtml(html: string, checks: HtmlCheck[]): CheckReport {
  const feedback: string[] = [];
  let dom: JSDOM;
  try {
    dom = new JSDOM(html);
  } catch {
    return { passedCount: 0, total: checks.length, feedback: ["Your HTML could not be parsed. Check for unclosed tags."], passed: false };
  }

  const doc = dom.window.document;
  let passedCount = 0;

  for (const check of checks) {
    let ok = false;
    switch (check.type) {
      case "tag": {
        const els = doc.querySelectorAll(check.selector);
        const min = check.min ?? 1;
        ok = els.length >= min;
        feedback.push(
          ok
            ? `Found ${els.length} element(s) matching \`${check.selector}\`.`
            : `Expected at least ${min} element(s) matching \`${check.selector}\`, found ${els.length}.`
        );
        break;
      }
      case "class": {
        const els = doc.querySelectorAll(check.selector);
        ok = els.length > 0 && [...els].some((el) => el.classList.contains(check.className));
        feedback.push(
          ok
            ? `\`${check.selector}\` has the class \`${check.className}\`.`
            : `No \`${check.selector}\` element has the class \`${check.className}\`.`
        );
        break;
      }
      case "id": {
        const els = doc.querySelectorAll(check.selector);
        ok = els.length > 0 && [...els].some((el) => el.id === check.id);
        feedback.push(
          ok
            ? `\`${check.selector}\` has the id \`${check.id}\`.`
            : `No \`${check.selector}\` element has the id \`${check.id}\`.`
        );
        break;
      }
      case "attribute": {
        const els = doc.querySelectorAll(check.selector);
        ok = [...els].some((el) => {
          const val = el.getAttribute(check.attr);
          if (val === null) return false;
          if (check.value === undefined) return true;
          return val === check.value;
        });
        feedback.push(
          ok
            ? `\`${check.selector}\` has attribute \`${check.attr}\`.`
            : `Expected an element \`${check.selector}\` with attribute \`${check.attr}${
                check.value ? `="${check.value}"` : ""
              }\`.`
        );
        break;
      }
      case "text": {
        const els = doc.querySelectorAll(check.selector);
        const needle = check.ignoreCase ? check.contains.toLowerCase() : check.contains;
        ok = [...els].some((el) => {
          const text = check.ignoreCase ? el.textContent?.toLowerCase() : el.textContent;
          return text?.includes(needle) ?? false;
        });
        feedback.push(
          ok
            ? `\`${check.selector}\` contains the expected text.`
            : `Expected \`${check.selector}\` to contain text "${check.contains}".`
        );
        break;
      }
      case "noTag": {
        const els = doc.querySelectorAll(check.selector);
        ok = els.length === 0;
        feedback.push(
          ok ? `No \`${check.selector}\` element — correct.` : `The element \`${check.selector}\` should not exist.`
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
