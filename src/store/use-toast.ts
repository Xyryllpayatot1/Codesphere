"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info" | "level" | "streak";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${counter++}`;
    const toast: Toast = { ...t, id, duration: t.duration ?? 4000 };
    set((s) => ({ toasts: [...s.toasts.slice(-4), toast] }));
    window.setTimeout(() => get().dismiss(id), toast.duration);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(t: Omit<Toast, "id" | "duration"> & { duration?: number }) {
  return useToastStore.getState().push(t);
}
