import type { ContentBlock } from "@/lib/content/types";
import { PromptAnalyzer } from "@/components/prompts/prompt-analyzer";

type PromptAnalyzerBlock = Extract<ContentBlock, { type: "promptAnalyzer" }>;

export function PromptAnalyzerBlock({ block }: { block: PromptAnalyzerBlock }) {
  return <PromptAnalyzer embed title={block.title} initialText={block.example} />;
}
