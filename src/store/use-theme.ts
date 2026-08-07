"use client";

import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

type ThemeState = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
  setResolved: (resolved: "light" | "dark") => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  resolved: "light",
  setPreference: (preference) => set({ preference }),
  setResolved: (resolved) => set({ resolved }),
}));
