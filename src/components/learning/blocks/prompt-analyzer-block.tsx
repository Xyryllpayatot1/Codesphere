import type { ContentBlock } from "@/lib/content/types";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

type PromptAnalyzerBlock = Extract<ContentBlock, { type: "promptAnalyzer" }>;

export function PromptAnalyzerBlock({ block }: { block: PromptAnalyzerBlock }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {block.title ?? "This interactive exercise is no longer available."}
        </p>
      </CardContent>
    </Card>
  );
}
