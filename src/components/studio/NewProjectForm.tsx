"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProjectForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        setError(data.error ?? "Could not start");
        return;
      }
      router.push(`/studio/${data.id}`);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="h-11 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/60"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="h-11 rounded-lg bg-amber-500 px-5 text-sm font-medium text-zinc-950 transition-opacity disabled:opacity-40"
        >
          {busy ? "Starting…" : "Transcribe"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-zinc-500">
        Downloading, screenshotting and reading a 3-minute video takes a few minutes. You can
        leave the page — progress is saved.
      </p>
    </form>
  );
}
