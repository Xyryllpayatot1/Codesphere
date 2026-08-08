"use client";

import { useSyncExternalStore } from "react";

/**
 * Mobile detection used ONLY where the interaction model genuinely differs
 * (bottom nav, sheets, touch gestures). Use CSS breakpoints for layout.
 *
 * The desktop cutoff is `lg` (1024px): everything below it gets the
 * app-like mobile experience (320px phones through 768px tablets portrait).
 */
export const DESKTOP_BREAKPOINT = 1024;

export function isMobileMedia(breakpoint = DESKTOP_BREAKPOINT): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
}

function mqlFor(breakpoint: number): MediaQueryList {
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
}

export function useIsMobile(breakpoint = DESKTOP_BREAKPOINT): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = mqlFor(breakpoint);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => mqlFor(breakpoint).matches,
    () => false, // SSR snapshot
  );
}

/**
 * Tracks the visible viewport height (dvh) live, including on-screen keyboard
 * and browser chrome changes via the Visual Viewport API. Returns `null` when
 * unavailable (SSR / older browsers).
 */
export function useVisualViewportHeight(): number | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      const vv = window.visualViewport;
      if (!vv) {
        window.addEventListener("resize", onStoreChange);
        return () => window.removeEventListener("resize", onStoreChange);
      }
      vv.addEventListener("resize", onStoreChange);
      vv.addEventListener("scroll", onStoreChange);
      return () => {
        vv.removeEventListener("resize", onStoreChange);
        vv.removeEventListener("scroll", onStoreChange);
      };
    },
    () => {
      const vv = window.visualViewport;
      if (!vv) return window.innerHeight;
      return vv.height;
    },
    () => null, // SSR snapshot
  );
}

/** True while any on-screen keyboard is likely visible (visual viewport shrinks). */
export function useKeyboardVisible(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const vv = window.visualViewport;
      if (!vv) return () => {};
      vv.addEventListener("resize", onStoreChange);
      return () => vv.removeEventListener("resize", onStoreChange);
    },
    () => {
      const vv = window.visualViewport;
      if (!vv) return false;
      return window.innerHeight - vv.height > 120;
    },
    () => false, // SSR snapshot
  );
}
