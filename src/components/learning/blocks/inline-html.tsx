import { memo } from "react";
import { renderInline } from "@/lib/content/inline";

/** Renders sanitized inline markdown. Memoized — inputs are static content. */
export const InlineHtml = memo(function InlineHtml({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
});
