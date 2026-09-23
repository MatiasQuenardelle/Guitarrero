"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LiteYouTube from "@/components/learn/LiteYouTube";
import { findBarIssues } from "@/lib/studio/lint";
import type { ProjectSummary } from "@/lib/studio/server";
import type { ProjectPayload } from "@/lib/studio/types";
import FrameStrip from "./FrameStrip";
import ScorePlayer from "./ScorePlayer";
import TabSwitcher from "./TabSwitcher";
import TexEditor from "./TexEditor";

const STAGES: { key: string; label: string }[] = [
  { key: "download", label: "Downloading video" },
  { key: "crop", label: "Finding the tab" },
  { key: "frames", label: "Taking screenshots" },
  { key: "transcribe", label: "Reading the tab" },
  { key: "alphatex", label: "Building the score" },
];

function Progress({ project }: { project: ProjectPayload }) {
  const { stage, message, progress, error } = project.status;
  const activeIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <p className="mb-4 text-sm text-zinc-300">{message}</p>

      <ol className="flex flex-col gap-1 text-sm">
        {STAGES.map((item, index) => {
          const done = activeIndex > index || stage === "done";
          const active = activeIndex === index;
          return (
            <li
              key={item.key}
              className={done ? "text-zinc-500" : active ? "text-amber-400" : "text-zinc-600"}
            >
              {done ? "✓" : active ? "▸" : "·"} {item.label}
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

/** Shown above an existing score while a re-run is in flight, instead of hiding it. */
function RunningBanner({ project }: { project: ProjectPayload }) {
  const { message, progress } = project.status;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3">
      <span className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-zinc-800">
        <span
          className="block h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </span>
      <span className="text-sm text-amber-200/90">{message}</span>
      <span className="text-xs text-zinc-500">
        Showing the previous version until it finishes.
      </span>
    </div>
  );
}

export default function StudioProject({
  initial,
  projects,
}: {
  initial: ProjectPayload;
  projects: ProjectSummary[];
}) {
  const [project, setProject] = useState(initial);
  const [tex, setTex] = useState(initial.alphaTex ?? "");
  const [rerunning, setRerunning] = useState(false);

  // Recorded from the client, not the page render, so a prefetch never counts as an open.
  useEffect(() => {
    void fetch(`/api/projects/${initial.meta.id}/opened`, { method: "POST" });
  }, [initial.meta.id]);

  // The list was read before this open was recorded, so put the current piece first here.
  const recentFirst = useMemo(
    () => [
      ...projects.filter((p) => p.id === initial.meta.id),
      ...projects.filter((p) => p.id !== initial.meta.id),
    ],
    [projects, initial.meta.id],
  );

  const running = project.status.stage !== "done" && project.status.stage !== "error";

  // Follow the pipeline while it works, then pick up the finished score.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/projects/${project.meta.id}`);
      if (!response.ok) return;
      const data = (await response.json()) as ProjectPayload;
      setProject(data);
      if (data.alphaTex) setTex(data.alphaTex);
    }, 2000);
    return () => clearInterval(timer);
  }, [running, project.meta.id]);

  const issues = useMemo(
    () => (project.score ? findBarIssues(project.score) : []),
    [project.score],
  );

  const rerun = useCallback(async () => {
    setRerunning(true);
    await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: project.meta.url, from: "transcribe" }),
    });
    const response = await fetch(`/api/projects/${project.meta.id}`);
    if (response.ok) setProject((await response.json()) as ProjectPayload);
    setRerunning(false);
  }, [project.meta.id, project.meta.url]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {projects.length > 1 ? (
            <TabSwitcher
              currentId={project.meta.id}
              title={project.meta.title}
              projects={recentFirst}
            />
          ) : (
            <h1 className="truncate text-xl font-semibold text-zinc-100">{project.meta.title}</h1>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {project.meta.video.uploader} · {project.meta.frames.length} screenshots
            {project.score ? ` · ${project.score.bars.length} bars` : ""}
          </p>
        </div>
        <Link href="/studio" className="shrink-0 text-sm text-amber-400 hover:text-amber-300">
          ← Studio
        </Link>
      </header>

      {!tex ? (
        <Progress project={project} />
      ) : (
        <div className="flex flex-col gap-5">
          {running && <RunningBanner project={project} />}
          <ScorePlayer projectId={project.meta.id} tex={tex} />

          {issues.length > 0 && (
            <p className="rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90">
              {issues.length === 1 ? "Bar" : "Bars"}{" "}
              {issues.map((issue) => issue.bar).join(", ")}{" "}
              {issues.length === 1 ? "doesn't" : "don't"} add up to the time signature — the
              rhythm there is probably misread. They are squeezed to fit so playback stays in
              time and no note is skipped, but they will sound rushed. Compare them with the
              screenshots below and fix the durations in the tab source.
            </p>
          )}

          <TexEditor projectId={project.meta.id} tex={tex} onChange={setTex} />

          <FrameStrip
            projectId={project.meta.id}
            frames={project.meta.frames}
            youtubeId={project.meta.id}
          />

          <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <LiteYouTube youtubeId={project.meta.id} title={project.meta.title} />
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="text-sm text-zinc-300">Source video</h2>
              <p className="text-xs text-zinc-500">
                Playback above comes from the transcription, not the video — the two are not
                synced yet.
              </p>
              <button
                type="button"
                onClick={rerun}
                disabled={rerunning}
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:border-zinc-600 disabled:opacity-40"
              >
                {rerunning ? "Re-reading…" : "Read the tab again"}
              </button>
              <p className="text-xs text-zinc-600">
                Re-runs the transcription on the existing screenshots. Your edits to the tab
                source will be overwritten.
              </p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
