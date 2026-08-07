"use client";

import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { Skeleton } from "@/components/ui/skeleton";

const MonacoEditorCore = dynamic(() => import("./editor-core").then((m) => m.MonacoEditorCore), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full rounded-md" />,
});

export type CodeEditorProps = {
  language?: string;
  value: string;
  onChange?: (value: string) => void;
  onMount?: OnMount;
  height?: number | string;
  readOnly?: boolean;
  options?: Record<string, unknown>;
};

export function CodeEditor(props: CodeEditorProps) {
  return <MonacoEditorCore {...props} />;
}
