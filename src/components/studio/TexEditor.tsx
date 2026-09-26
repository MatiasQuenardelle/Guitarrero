"use client";

import { useEffect, useState } from "react";

interface TexEditorProps {
  projectId: string;
  tex: string;
  onChange: (tex: string) => void;
}

/**
 * The transcription will get things wrong. This is where you fix them: edits re-render the
 * score live, and saving writes the alphaTex back to the project folder.
 */
export default function TexEditor({ projectId, tex, onChange }: TexEditorProps) {
  const [draft, setDraft] = useState(tex);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setDraft(tex);
    setSaved(true);
  }, [tex]);

  // Re-render the score shortly after typing stops, not on every keystroke.
  useEffect(() => {
    if (draft === tex) return;
    const timer = setTimeout(() => onChange(draft), 600);
    return () => clearTimeout(timer);
  }, [draft, tex, onChange]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tex: draft }),
      });
      if (response.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-walnut-700 bg-walnut-950/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-sand-300"
      >
        <span>
          Tab source{" "}
          <span className="text-sand-500">— edit to fix anything the transcription got wrong</span>
        </span>
        <span className="text-sand-500">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-walnut-700 p-4">
          <textarea
            value={draft}
            spellCheck={false}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
            className="h-72 w-full resize-y rounded-lg border border-walnut-700 bg-walnut-900 p-3 font-mono text-xs leading-relaxed text-cream-100 outline-none focus:border-brass-400/60"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || saved}
              className="h-9 rounded-lg bg-brass-400 px-4 text-sm font-medium text-walnut-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
            <p className="text-xs text-sand-500">
              Notes are <code className="text-sand-400">fret.string.duration</code>, string 1 is
              the high E. Chords go in brackets: <code className="text-sand-400">(0.1 2.2).4</code>.
              Bars end with <code className="text-sand-400">|</code>.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
