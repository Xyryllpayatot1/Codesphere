import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Throw inside a `handle()` route to produce a specific HTTP status. */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wrap a route handler; maps thrown errors to HTTP responses. */
export function handle<T>(
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<T>
): (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req, ctx) => {
    try {
      const result = await fn(req, ctx);
      return ok(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return fail(err.message, err.status);
      }
      if (err instanceof ApiError) {
        return fail(err.message, err.status, err.details);
      }
      if (err instanceof Error) {
        return fail(err.message, 500);
      }
      return fail("Unexpected error", 500);
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}
