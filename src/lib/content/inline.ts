// Inline Markdown -> safe HTML. Used by content blocks to render bold/italic/
// links/code spans inside prose. Output is sanitized before use.

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Tags that may appear as intentional inline markup. Everything else that looks
// like an HTML tag is treated as literal text (e.g. the <body> option in an
// HTML quiz) so it renders on screen instead of being stripped into a blank.
const ALLOWED_INLINE_TAGS = new Set([
  "a", "b", "strong", "i", "em", "u", "s", "code", "br", "span", "sub", "sup",
  "kbd", "mark",
]);

function escapeDisallowedInlineHtml(html: string): string {
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s[^<>]*?)?>/g, (match, tag: string) =>
    ALLOWED_INLINE_TAGS.has(tag.toLowerCase())
      ? match
      : match.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
  );
}

export function renderInline(markdown: string): string {
  const raw = marked.parseInline(markdown, { async: false }) as string;
  const safe = escapeDisallowedInlineHtml(raw);
  return sanitizeHtml(safe, {
    allowedTags: [...ALLOWED_INLINE_TAGS],
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
