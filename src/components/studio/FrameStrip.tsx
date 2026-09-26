"use client";

import { useState } from "react";
import type { FrameInfo } from "@/lib/studio/types";

interface FrameStripProps {
  projectId: string;
  frames: FrameInfo[];
  /** Absent for a PDF score: its frames are page systems, labelled by bar, not by time. */
  youtubeId?: string;
}

function timestamp(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** The screenshots the transcription was read from — the reference when a bar looks wrong. */
export default function FrameStrip({ projectId, frames, youtubeId }: FrameStripProps) {
  const [active, setActive] = useState<FrameInfo | null>(null);
  const label = (frame: FrameInfo) =>
    youtubeId ? timestamp(frame.time) : frame.bar ? `bar ${frame.bar}` : `system ${frame.time + 1}`;

  if (frames.length === 0) return null;

  return (
    <section className="rounded-xl border border-walnut-700 bg-walnut-950/60 p-4">
      <h2 className="mb-3 text-sm text-sand-300">
        Source screenshots <span className="text-sand-500">({frames.length})</span>
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {frames.map((frame) => (
          <button
            key={frame.file}
            type="button"
            onClick={() => setActive(active?.file === frame.file ? null : frame)}
            className={`shrink-0 rounded-lg border p-1 transition-colors ${
              active?.file === frame.file
                ? "border-brass-400/70"
                : "border-walnut-700 hover:border-walnut-500"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/projects/${projectId}/frames/${frame.file}`}
              alt={`Tab at ${label(frame)}`}
              className="h-16 w-auto max-w-none rounded bg-white"
            />
            <span className="mt-1 block text-center text-[11px] text-sand-500">
              {label(frame)}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/projects/${projectId}/frames/${active.file}`}
            alt={`Tab at ${label(active)}`}
            className="w-full rounded-lg bg-white"
          />
          {youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(active.time)}s`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-brass-400 hover:text-brass-300"
            >
              Open this moment on YouTube ({timestamp(active.time)}) ↗
            </a>
          )}
        </div>
      )}
    </section>
  );
}
