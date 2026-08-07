"use client";

import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import "@/styles/monaco-editor.css";
import "@/components/learning/editor/monaco-setup";

export type CodeEditorProps = {
  language?: string;
  value: string;
  onChange?: (value: string) => void;
  onMount?: OnMount;
  height?: number | string;
  readOnly?: boolean;
  options?: Record<string, unknown>;
};

export function MonacoEditorCore({
  language = "javascript",
  value,
  onChange,
  onMount,
  height = 320,
  readOnly,
  options,
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={onChange as OnChange | undefined}
      onMount={onMount}
      theme="vs-dark"
      loading={<div className="h-full w-full animate-pulse bg-secondary" />}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        readOnly,
        padding: { top: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        ...options,
      }}
    />
  );
}
