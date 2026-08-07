"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LEARNING_MODES, LEARNING_MODE_META, LEARNING_MODE_VALUES } from "@/lib/content/modes";

type ProfileData = {
  name: string;
  bio: string | null;
  dailyGoalMinutes: number;
  preferredTime: string;
  learningMode: string;
  instructorMode: boolean;
};

export function SettingsForm({ initial }: { initial: ProfileData }) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(String(initial.dailyGoalMinutes));
  const [preferredTime, setPreferredTime] = useState(initial.preferredTime || "any");
  const [learningMode, setLearningMode] = useState(initial.learningMode || LEARNING_MODES.READING);
  const [instructorMode, setInstructorMode] = useState(initial.instructorMode ?? false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, dailyGoalMinutes: Number(dailyGoalMinutes), preferredTime, learningMode, instructorMode }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="A sentence about what you're learning."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="daily-goal">Daily goal (minutes)</Label>
          <Input
            id="daily-goal"
            type="number"
            min={5}
            max={600}
            value={dailyGoalMinutes}
            onChange={(e) => setDailyGoalMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred-time">Preferred study time</Label>
          <Select
            id="preferred-time"
            value={preferredTime}
            onValueChange={setPreferredTime}
            options={[
              { value: "any", label: "Any time" },
              { value: "morning", label: "Morning" },
              { value: "afternoon", label: "Afternoon" },
              { value: "evening", label: "Evening" },
            ]}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="learning-mode">Default learning mode</Label>
        <Select
          id="learning-mode"
          value={learningMode}
          onValueChange={setLearningMode}
          options={LEARNING_MODE_VALUES.map((m) => ({
            value: m,
            label: `${LEARNING_MODE_META[m].icon} ${LEARNING_MODE_META[m].label} — ${LEARNING_MODE_META[m].description}`,
          }))}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
        <input
          type="checkbox"
          checked={instructorMode}
          onChange={(e) => setInstructorMode(e.target.checked)}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">Instructor mode (teach first, practice second)</span>
          <span className="block text-xs text-muted-foreground">
            Exercises and quizzes stay locked until you have reviewed the teaching section of each lesson.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          <Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save changes"}
        </Button>
        <p
          className={cn(
            "text-sm",
            status === "saved" && "text-success",
            status === "error" && "text-destructive"
          )}
        >
          {status === "saved" && "Saved."}
          {status === "error" && "Could not save — try again."}
        </p>
      </div>
    </form>
  );
}
