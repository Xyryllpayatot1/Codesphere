"use client";

import { useRef, useState, useCallback } from "react";
import { Play, RotateCcw, TerminalSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { cn } from "@/lib/utils";

const INITIAL_HTML = `<h1>Hello, CodeSphere!</h1>
<p>Edit this code and hit Run.</p>`;

const INITIAL_CSS = `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  color: #334155;
}
h1 { color: #6366f1; }`;

const INITIAL_JS = `console.log("Hello from the playground!");
document.querySelector("h1").textContent += " Edited by JS.";`;

type LogEntry = { type: "log" | "info" | "warn" | "error"; text: string };

function buildDocFrom(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
${css}
</style>
</head>
<body>
${html}
<script>
(function () {
  window.__logs = [];
  ["log", "info", "warn", "error"].forEach(function (method) {
    var original = console[method].bind(console);
    console[method] = function () {
      var text = Array.from(arguments).map(function (x) {
        try {
          if (typeof x === "string") return x;
          return JSON.stringify(x);
        } catch (e) {
          return String(x);
        }
      }).join(" ");
      window.__logs.push({ type: method, text: text });
      original.apply(null, arguments);
    };
  });
  window.addEventListener("error", function (e) {
    window.__logs.push({ type: "error", text: e.message });
  });
})();
${js}
<\/script>
</body>
</html>`;
}

export function Playground() {
  const [html, setHtml] = useState(INITIAL_HTML);
  const [css, setCss] = useState(INITIAL_CSS);
  const [js, setJs] = useState(INITIAL_JS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [doc, setDoc] = useState(() => buildDocFrom(INITIAL_HTML, INITIAL_CSS, INITIAL_JS));
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const buildDoc = useCallback(() => buildDocFrom(html, css, js), [html, css, js]);

  function run() {
    const source = buildDoc();
    setDoc(source);
    setLogs([]);
    setTimeout(() => {
      const frame = iframeRef.current;
      const win = frame?.contentWindow as (Window & { __logs?: LogEntry[] }) | null;
      setLogs(win?.__logs ?? []);
    }, 500);
  }

  function reset() {
    setHtml(INITIAL_HTML);
    setCss(INITIAL_CSS);
    setJs(INITIAL_JS);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prototype HTML, CSS and JavaScript instantly. No saves needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={run}>
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTML</p>
          <CodeEditor language="html" value={html} onChange={setHtml} height={180} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CSS</p>
          <CodeEditor language="css" value={css} onChange={setCss} height={180} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">JavaScript</p>
          <CodeEditor language="javascript" value={js} onChange={setJs} height={180} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <iframe
            ref={iframeRef}
            title="Playground preview"
            srcDoc={doc}
            className="h-80 w-full rounded-lg border border-border bg-white"
          />
        </div>
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TerminalSquare className="h-3.5 w-3.5" /> Console
          </p>
          <div className="h-80 w-full overflow-y-auto rounded-lg border border-border bg-black/90 p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground/70">Run your code to see console output here.</p>
            ) : (
              logs.map((entry, i) => (
                <p
                  key={i}
                  className={cn(
                    "mb-1 whitespace-pre-wrap break-words",
                    entry.type === "error" && "text-red-400",
                    entry.type === "warn" && "text-amber-400",
                    entry.type === "log" || entry.type === "info" ? "text-green-400" : ""
                  )}
                >
                  {entry.text}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
