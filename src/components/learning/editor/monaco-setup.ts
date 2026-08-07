"use client";

// Bundles Monaco fully offline and configures the @monaco-editor/react loader to
// use the local copy (no CDN). Workers are created via `new Worker(new URL(...))`
// which Turbopack statically bundles.
//
// NOTE: the specifier inside `new URL` must stay a literal — Turbopack needs it
// to be analyzable. The paths below resolve through node_modules.

import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

loader.config({ monaco });

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case "json":
        return new Worker(new URL("../../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url), { type: "module" });
      case "css":
      case "scss":
      case "less":
        return new Worker(new URL("../../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url), { type: "module" });
      case "html":
      case "handlebars":
      case "razor":
        return new Worker(new URL("../../../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js", import.meta.url), { type: "module" });
      case "typescript":
      case "javascript":
        return new Worker(new URL("../../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js", import.meta.url), { type: "module" });
      default:
        return new Worker(new URL("../../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" });
    }
  },
};
