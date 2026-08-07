// ---------------------------------------------------------------------------
// Markdown -> ContentBlock converter. Lets authors write lessons in Markdown
// and import them (used by the seed importer and the admin importer). Supports
// GitHub-style callouts via `> [!TIP]` / `[!WARNING]` / `[!NOTE]` / `[!DANGER]`.
// ---------------------------------------------------------------------------

import { marked } from "marked";
import type { Tokens } from "marked";
import type { ContentBlock } from "@/lib/content/types";

function mapCallout(token: Tokens.Blockquote): ContentBlock {
  const text = token.text.trim();
  const match = /^\[\!(TIP|WARNING|NOTE|DANGER)\]\s*\n?/i.exec(text);
  if (!match) {
    return { type: "quote", text };
  }
  const variant = match[1].toLowerCase() as "tip" | "warning" | "info" | "danger";
  const body = text.slice(match[0].length).trim();
  const variantToType = { note: "info", tip: "tip", warning: "warning", danger: "danger" } as const;
  return {
    type: "callout",
    variant: variantToType[variant as keyof typeof variantToType] ?? "info",
    text: body,
    title: match[1].charAt(0) + match[1].slice(1).toLowerCase(),
  };
}

export function markdownToBlocks(markdown: string): ContentBlock[] {
  const tokens = marked.lexer(markdown);
  const blocks: ContentBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        blocks.push({ type: "heading", level: token.depth, text: token.text });
        break;
      case "paragraph": {
        const inline = token.tokens ?? [];
        const image = inline.find((t): t is Tokens.Image => t.type === "image");
        if (inline.length === 1 && image) {
          blocks.push({ type: "image", src: image.href, alt: image.text, caption: image.title ?? undefined });
        } else {
          blocks.push({ type: "paragraph", text: token.text });
        }
        break;
      }
      case "list":
        blocks.push({
          type: "list",
          ordered: token.ordered,
          items: (token as Tokens.List).items.map((item) => item.text),
        });
        break;
      case "code":
        blocks.push({ type: "code", language: token.lang ?? "text", code: token.text });
        break;
      case "blockquote":
        blocks.push(mapCallout(token as Tokens.Blockquote));
        break;
      case "table":
        blocks.push({
          type: "table",
          headers: (token as Tokens.Table).header.map((h) => h.text),
          rows: (token as Tokens.Table).rows.map((row) => row.map((c) => c.text)),
        });
        break;
      case "hr":
        blocks.push({ type: "divider" });
        break;
      case "space":
        break;
      default:
        break;
    }
  }
  return blocks;
}
