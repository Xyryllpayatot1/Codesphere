"use client";

import { useEffect } from "react";
import { useThemeStore, type ThemePreference } from "@/store/use-theme";

const THEME_COOKIE = "creyvaph_theme";

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;
  root.classList.toggle("dark", resolved === "dark");
  useThemeStore.getState().setResolved(resolved);
}

export function ThemeProvider({ initial }: { initial: ThemePreference }) {
  useEffect(() => {
    useThemeStore.getState().setPreference(initial);
    applyTheme(initial);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = useThemeStore.getState().preference;
      if (pref === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);

    const unsubscribe = useThemeStore.subscribe((state, prev) => {
      if (state.preference === prev.preference) return;
      applyTheme(state.preference);
      document.cookie = `${THEME_COOKIE}=${state.preference}; path=/; max-age=31536000; samesite=lax`;
    });

    return () => {
      mq.removeEventListener("change", onChange);
      unsubscribe();
    };
  }, [initial]);

  return null;
}
