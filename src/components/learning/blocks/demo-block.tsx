"use client";

import { useState } from "react";
import { Play, RotateCcw, ExternalLink } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { MONACO_LANGUAGE } from "@/lib/constants";

type Demo = Extract<ContentBlock, { type: "demo" }>;

const PANELS = [
  { key: "html", label: "HTML", monaco: MONACO_LANGUAGE.html, get: (d: Demo) => d.html ?? "" },
  { key: "css", label: "CSS", monaco: MONACO_LANGUAGE.css, get: (d: Demo) => d.css ?? "" },
  { key: "js", label: "JavaScript", monaco: MONACO_LANGUAGE.javascript, get: (d: Demo) => d.js ?? "" },
] as const;

export function DemoBlock({ block }: { block: Demo }) {
  const active = PANELS.filter((p) => p.get(block).trim().length > 0);
  const [code, setCode] = useState<Record<string, string>>(() =>
    Object.fromEntries(PANELS.map((p) => [p.key, p.get(block)])),
  );
  const [previewKey, setPreviewKey] = useState(1);
  const [activeTab, setActiveTab] = useState<string>(active[0]?.key ?? "html");

  const hasJs = code.js.trim().length > 0;
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<style>${code.css}</style>
</head>
<body>
${code.html}
${hasJs ? `<script>\n${code.js}\n</script>` : ""}
</body>
</html>`;

  function run() {
    setPreviewKey((k) => k + 1);
  }

  function reset() {
    setCode(Object.fromEntries(PANELS.map((p) => [p.key, p.get(block)])));
    setPreviewKey((k) => k + 1);
  }

  if (active.length === 0) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{block.title || "Interactive demonstration"}</p>
          {block.description && <p className="truncate text-xs text-muted-foreground">{block.description}</p>}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={run}>
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="min-w-0 border-r border-border">
          {active.length > 1 && (
            <Tabs
              tabs={active.map((p) => ({ value: p.key, label: p.label }))}
              value={activeTab}
              onValueChange={setActiveTab}
              className="m-2"
            />
          )}
          {active.map((p) =>
            p.key === activeTab ? (
              <CodeEditor
                key={p.key}
                language={p.monaco}
                value={code[p.key]}
                onChange={(v) => setCode((c) => ({ ...c, [p.key]: v ?? "" }))}
                height={Math.max(240, block.height ?? 300)}
                options={{ fontSize: 13, scrollBeyondLastLine: false, minimap: { enabled: false } }}
              />
            ) : null,
          )}
        </div>
        <div className="relative min-h-[320px] bg-white">
          <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            <ExternalLink className="h-3 w-3" /> Preview
          </span>
          <iframe key={previewKey} title={block.title ?? "Demo preview"} srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="h-full min-h-[320px] w-full" />
        </div>
      </div>
    </div>
  );
}
