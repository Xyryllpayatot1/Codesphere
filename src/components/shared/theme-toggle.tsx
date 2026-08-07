"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useThemeStore, type ThemePreference } from "@/store/use-theme";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <Sun className="h-4 w-4" />, label: "Light" },
  { value: "dark", icon: <Moon className="h-4 w-4" />, label: "Dark" },
  { value: "system", icon: <Monitor className="h-4 w-4" />, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  // Hydration-safe mount detection without setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-card p-0.5", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={mounted && preference === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setPreference(o.value)}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            mounted && preference === o.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
