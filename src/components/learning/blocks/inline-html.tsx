import { renderInline } from "@/lib/content/inline";

export function InlineHtml({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}
