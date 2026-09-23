"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/studio/server";

const ACTIVE_STAGES = new Set(["queued", "download", "crop", "frames", "transcribe", "alphatex"]);

export function StatusPill({ project }: { project: ProjectSummary }) {
  const { stage, message, progress } = project.status;

  if (stage === "done") {
    return <span className="text-xs text-zinc-500">{project.bars} bars</span>;
  }
  if (stage === "error") {
    return <span className="text-xs text-red-400">Failed</span>;
  }
  return (
    <span className="text-xs text-amber-400">
      {message} {Math.round(progress * 100)}%
    </span>
  );
}

export default function ProjectList({
  initialProjects,
}: {
  initialProjects: ProjectSummary[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const anyActive = projects.some((p) => ACTIVE_STAGES.has(p.status.stage));

  // Poll only while something is still being ingested.
  useEffect(() => {
    if (!anyActive) return;
    const timer = setInterval(async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) return;
      const data = (await response.json()) as { projects: ProjectSummary[] };
      setProjects(data.projects);
    }, 2000);
    return () => clearInterval(timer);
  }, [anyActive]);

  if (projects.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
        No pieces yet. Paste a YouTube tab video above to make one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/studio/${project.slug}`}
            className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 transition-colors hover:border-zinc-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${project.id}/default.jpg`}
              alt=""
              className="h-12 w-20 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-zinc-200">{project.title}</span>
              <StatusPill project={project} />
            </span>
            <span className="shrink-0 text-xs text-zinc-600">{project.frames} frames</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
