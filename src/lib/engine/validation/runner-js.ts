// Sandboxed JavaScript runner using node:vm. Runs offline, enforces a time
// limit, captures console output, and never touches the host process.

import vm from "node:vm";
import { inspect } from "node:util";

const DEFAULT_TIMEOUT_MS = 2000;
const MAX_OUTPUT_LENGTH = 20000;

export type RunResult = {
  output: string;
  error: string | null;
  timedOut: boolean;
  completed: boolean;
};

export type SandboxOptions = {
  timeoutMs?: number;
  /** Additional globals exposed to the sandbox. */
  globals?: Record<string, unknown>;
  /** Called after execution with the sandbox object (e.g. to read results). */
  onDone?: (sandbox: Record<string, unknown>) => void;
  // reserved for future sandbox hardening
};

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  try {
    return inspect(value, { depth: 4, maxArrayLength: 100, breakLength: 120 });
  } catch {
    return String(value);
  }
}

export function runJavaScript(code: string, options: SandboxOptions = {}): RunResult {
  const logs: string[] = [];
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(safeStringify).join(" ")),
      info: (...args: unknown[]) => logs.push(args.map(safeStringify).join(" ")),
      warn: (...args: unknown[]) => logs.push(`warn: ${args.map(safeStringify).join(" ")}`),
      error: (...args: unknown[]) => logs.push(`error: ${args.map(safeStringify).join(" ")}`),
      debug: (...args: unknown[]) => logs.push(args.map(safeStringify).join(" ")),
    },
    setTimeout: () => 0, // blocked
    setInterval: () => 0, // blocked
    clearTimeout: () => {},
    clearInterval: () => {},
    fetch: undefined,
    XMLHttpRequest: undefined,
    WebSocket: undefined,
    ...(options.globals ?? {}),
  };

  let completed = false;
  let timedOut = false;
  let error: string | null = null;

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { filename: "student-code.js" });
    script.runInContext(context, { timeout: timeoutMs });
    completed = true;
    options.onDone?.(sandbox as Record<string, unknown>);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e && "code" in e && (e as { code?: string }).code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      timedOut = true;
      error = `Execution timed out after ${timeoutMs}ms`;
    } else {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  let output = logs.join("\n");
  if (output.length > MAX_OUTPUT_LENGTH) {
    output = output.slice(0, MAX_OUTPUT_LENGTH) + "\n… output truncated";
  }

  return { output, error, timedOut, completed };
}

/** Deep equality used for test-case comparison. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}
