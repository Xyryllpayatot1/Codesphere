"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, FileText, Plus, Save, Trash2 } from "lucide-react";

import { RELEASE_CHANGE_TYPES, RELEASE_CHANGE_META } from "@/lib/constants";
import type { ReleaseDetail } from "@/lib/services/releases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ReleaseCover } from "@/components/releases/release-cover";
import { ReleaseDetail as ReleaseDetailView } from "@/components/releases/release-detail";
import { formatDate } from "@/lib/utils";

type ChangeDraft = {
  key: string;
  type: string;
  title: string;
  description: string;
};

type Draft = {
  version: string;
  title: string;
  summary: string;
  description: string;
  releaseDate: string;
  changes: ChangeDraft[];
};

const CHANGE_OPTIONS = Object.values(RELEASE_CHANGE_TYPES);

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function toDraft(release: ReleaseDetail | null): Draft {
  if (!release) {
    return { version: "", title: "", summary: "", description: "", releaseDate: "", changes: [] };
  }
  const date = release.releaseDate instanceof Date ? release.releaseDate : new Date(release.releaseDate);
  const iso = Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  return {
    version: release.version,
    title: release.title,
    summary: release.summary,
    description: release.description,
    releaseDate: iso,
    changes: release.changes.map((c) => ({ key: c.id, type: c.type, title: c.title, description: c.description })),
  };
}

function ReleaseEditor({ release, onClose }: { release: ReleaseDetail | null; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(release));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function patchChange(key: string, field: keyof ChangeDraft, value: string) {
    setDraft((d) => ({ ...d, changes: d.changes.map((c) => (c.key === key ? { ...c, [field]: value } : c)) }));
  }

  function addChange() {
    setDraft((d) => ({
      ...d,
      changes: [...d.changes, { key: newKey(), type: RELEASE_CHANGE_TYPES.IMPROVEMENT, title: "", description: "" }],
    }));
  }

  function removeChange(key: string) {
    setDraft((d) => ({ ...d, changes: d.changes.filter((c) => c.key !== key) }));
  }

  async function save() {
    setError(null);
    if (!draft.version.trim() || !draft.title.trim()) {
      setError("Version and title are required.");
      return;
    }
    const changes = draft.changes
      .filter((c) => c.title.trim())
      .map((c) => ({ type: c.type, title: c.title.trim(), description: c.description.trim() }));
    const payload = {
      version: draft.version.trim(),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      releaseDate: draft.releaseDate || undefined,
      changes,
    };

    setBusy(true);
    try {
      let id = release?.id ?? null;
      const res = await fetch(id ? `/api/admin/releases/${id}` : "/api/admin/releases", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save release");
      }
      if (!id) {
        const body = await res.json();
        id = body?.data?.id ?? null;
      }
      if (id && coverFile) {
        const form = new FormData();
        form.append("file", coverFile);
        const coverRes = await fetch(`/api/admin/releases/${id}/cover`, { method: "POST", body: form });
        if (!coverRes.ok) {
          const body = await coverRes.json().catch(() => null);
          throw new Error(body?.error ?? "Release saved, but cover upload failed.");
        }
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save release");
    } finally {
      setBusy(false);
    }
  }

  const hasCover = Boolean(release?.coverImage);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="rel-version">Version</Label>
          <Input
            id="rel-version"
            value={draft.version}
            onChange={(e) => patch("version", e.target.value)}
            placeholder="1.4.0"
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="rel-date">Release date</Label>
          <Input id="rel-date" type="date" value={draft.releaseDate} onChange={(e) => patch("releaseDate", e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="rel-title">Title</Label>
        <Input id="rel-title" value={draft.title} onChange={(e) => patch("title", e.target.value)} placeholder="Networking labs, offline mode, and more" />
      </div>

      <div>
        <Label htmlFor="rel-summary">Summary</Label>
        <textarea
          id="rel-summary"
          value={draft.summary}
          onChange={(e) => patch("summary", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Short overview shown on cards."
        />
      </div>

      <div>
        <Label htmlFor="rel-description">Full description</Label>
        <textarea
          id="rel-description"
          value={draft.description}
          onChange={(e) => patch("description", e.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Detailed release notes — shown on the release page."
        />
      </div>

      <div>
        <Label>Cover image</Label>
        {release?.coverImage && (
          <div className="mb-2 flex items-center gap-3">
            <ReleaseCover cover={release.coverImage} alt="Current cover" className="h-20 w-32" rounded={false} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!release) return;
                setBusy(true);
                try {
                  const res = await fetch(`/api/admin/releases/${release.id}/cover`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Failed to remove cover");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to remove cover");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        )}
        <Input
          id="rel-cover"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPEG, WebP or GIF up to 10 MB. {hasCover ? "Uploading replaces the current cover." : ""}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Changes</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChange}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
        </div>
        {draft.changes.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No changes yet — add feature, improvement or bug-fix items.
          </p>
        ) : (
          <ul className="space-y-2">
            {draft.changes.map((c) => (
              <li key={c.key} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex gap-2">
                  <select
                    value={c.type}
                    onChange={(e) => patchChange(c.key, "type", e.target.value)}
                    className="h-8 w-36 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CHANGE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {RELEASE_CHANGE_META[t].label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={c.title}
                    onChange={(e) => patchChange(c.key, "title", e.target.value)}
                    placeholder="Change title"
                    className="h-8 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeChange(c.key)} aria-label="Remove change">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={c.description}
                  onChange={(e) => patchChange(c.key, "description", e.target.value)}
                  placeholder="Optional description"
                  className="h-8 text-sm"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          <Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : release ? "Save changes" : "Create release"}
        </Button>
      </div>
    </div>
  );
}

function ReleaseRow({
  release,
  onEdit,
  onPreview,
}: {
  release: ReleaseDetail;
  onEdit: () => void;
  onPreview: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function togglePublish() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/releases/${release.id}/${release.isPublished ? "unpublish" : "publish"}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update status");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/releases/${release.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete release");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete release");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
      <ReleaseCover cover={release.coverImage} alt={`${release.version} cover`} className="h-12 w-20 shrink-0" rounded={false} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-primary">{release.version}</span>
          <Badge variant={release.isPublished ? "accent" : "outline"}>{release.isPublished ? "Published" : "Draft"}</Badge>
        </p>
        <p className="truncate text-sm font-medium">{release.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(release.releaseDate)} · {release.changes.length} change{release.changes.length === 1 ? "" : "s"}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={togglePublish} disabled={busy}>
          {release.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {release.isPublished ? "Unpublish" : "Publish"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPreview}>
          Preview
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          type="button"
          variant={confirmDelete ? "destructive" : "ghost"}
          size="sm"
          disabled={busy}
          onClick={() => {
            if (confirmDelete) {
              void remove();
            } else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Confirm" : ""}
        </Button>
      </div>
    </li>
  );
}

export function ReleaseManager({ releases }: { releases: ReleaseDetail[] }) {
  const [editing, setEditing] = useState<ReleaseDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<ReleaseDetail | null>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{releases.length} release{releases.length === 1 ? "" : "s"} · drafts and published</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New release
        </Button>
      </div>

      {releases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No update notes yet</p>
          <p className="text-xs text-muted-foreground">Create your first release to announce changes.</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {releases.map((r) => (
            <ReleaseRow
              key={r.id}
              release={r}
              onEdit={() => setEditing(r)}
              onPreview={() => setPreviewing(r)}
            />
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating} title="New release" description="Draft update notes. Publish later when ready." className="max-w-2xl">
        {creating && <ReleaseEditor release={null} onClose={() => setCreating(false)} />}
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title="Edit release" className="max-w-2xl">
        {editing && <ReleaseEditor release={editing} onClose={() => setEditing(null)} />}
      </Dialog>

      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)} title="Preview" description="Exactly what users will see on the release page.">
        {previewing && (
          <div className="max-h-[70vh] overflow-y-auto rounded-lg bg-muted/40 p-4">
            <ReleaseDetailView release={previewing} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
