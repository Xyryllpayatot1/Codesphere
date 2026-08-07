"use client";

import { useEffect, useRef } from "react";

// Flushes accumulated study time to /api/learn/study via sendBeacon when the
// lesson is closed. This powers streak advancement and study-session analytics.

export function StudyTracker({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const startedAt = useRef<number | null>(null);
  const flushed = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();

    function flush() {
      if (flushed.current) return;
      flushed.current = true;
      if (startedAt.current == null) return;
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (seconds < 3) return;
      const payload = JSON.stringify({ seconds, courseId, lessonId });
      try {
        navigator.sendBeacon("/api/learn/study", new Blob([payload], { type: "application/json" }));
      } catch {
        void fetch("/api/learn/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = () => flush();

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [courseId, lessonId]);

  return null;
}
