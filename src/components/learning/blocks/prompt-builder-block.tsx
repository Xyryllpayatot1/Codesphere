import type { ContentBlock } from "@/lib/content/types";
import { PromptBuilder } from "@/components/prompts/prompt-builder";

type PromptBuilderBlock = Extract<ContentBlock, { type: "promptBuilder" }>;

export function PromptBuilderBlock({ block }: { block: PromptBuilderBlock }) {
  return <PromptBuilder embed title={block.title} />;
}
