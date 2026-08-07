// Inline Markdown -> safe HTML. Used by content blocks to render bold/italic/
// links/code spans inside prose. Output is sanitized before use.

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function renderInline(markdown: string): string {
  const raw = marked.parseInline(markdown, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "a", "b", "strong", "i", "em", "u", "s", "code", "br", "span", "sub", "sup",
      "kbd", "mark",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      span: ["class"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}
