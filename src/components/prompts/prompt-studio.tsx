"use client";

import { useState } from "react";
import { Sparkles, ScanSearch, ArrowLeftRight } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { PromptBuilder } from "@/components/prompts/prompt-builder";
import { PromptAnalyzer } from "@/components/prompts/prompt-analyzer";

export function PromptStudio() {
  const [tab, setTab] = useState("builder");
  const [pending, setPending] = useState("");
  const [analyzerKey, setAnalyzerKey] = useState(0);

  function sendToAnalyzer(text: string) {
    setPending(text);
    setAnalyzerKey((k) => k + 1);
    setTab("analyzer");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Prompt Studio
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            For Coding with AI
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Prompt Studio</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Build a prompt out of components, then get an honest rule-based score. No AI is used to grade you — the
          analyzer checks the same seven ingredients every great prompt shares.
        </p>
      </header>

      <Tabs
        tabs={[
          { value: "builder", label: <span className="inline-flex items-center gap-1.5"><ArrowLeftRight className="h-4 w-4" /> Builder</span> },
          { value: "analyzer", label: <span className="inline-flex items-center gap-1.5"><ScanSearch className="h-4 w-4" /> Analyzer</span> },
        ]}
        value={tab}
        onValueChange={setTab}
        className="mb-6"
      />

      {tab === "builder" ? (
        <PromptBuilder onCompose={sendToAnalyzer} />
      ) : (
        <PromptAnalyzer prefill={pending} prefillKey={analyzerKey} />
      )}

      <div className="mt-8 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">How to use this</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Start with a <span className="font-medium text-foreground">Task</span> — every good prompt has exactly one clear action.</li>
          <li>Add a <span className="font-medium text-foreground">Role</span> and <span className="font-medium text-foreground">Context</span> so the assistant knows who it is and who it is helping.</li>
          <li>Set <span className="font-medium text-foreground">Constraints</span> and an <span className="font-medium text-foreground">Output format</span> to shape the answer.</li>
          <li>Finish with <span className="font-medium text-foreground">Examples</span> and <span className="font-medium text-foreground">Success criteria</span> so you can tell when it is done.</li>
          <li>Build a prompt here, send it to the Analyzer, and iterate until your score is 85+.</li>
        </ul>
      </div>
    </div>
  );
}
