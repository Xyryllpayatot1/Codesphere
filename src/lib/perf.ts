import "server-only";

// Request timing instrumentation (always on — no env flag needed).
// Each mark logs cumulative ms from page start; the "+since" delta reveals
// sequential DB round trips, the dominant latency cost on this pooler stack.
// Remove the makePerf calls once the latency work is done to stop the logs.
export function makePerf(label: string) {
  const startedAt = performance.now();
  let last = startedAt;
  return (mark: string, note?: string) => {
    const now = performance.now();
    console.log(
      `[PERF] ${label} :: ${mark} :: +${Math.round(now - last)}ms (total ${Math.round(now - startedAt)}ms)${
        note ? ` :: ${note}` : ""
      }`,
    );
    last = now;
  };
}
