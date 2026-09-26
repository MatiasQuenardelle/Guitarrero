"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/studio/server";

const ACTIVE_STAGES = new Set(["queued", "download", "crop", "frames", "transcribe", "alphatex"]);

export function StatusPill({ project }: { project: ProjectSummary }) {
  const { stage, message, progress } = project.status;

  if (stage === "done") {
    return <span className="text-xs text-sand-500">{project.bars} bars</span>;
  }
  if (stage === "error") {
    return <span className="text-xs text-red-400">Failed</span>;
  }
  return (
    <span className="text-xs text-brass-400">
      {message} {Math.round(progress * 100)}%
    </span>
  );
}

export default function ProjectList({
  initialProjects,
  published,
}: {
  initialProjects: ProjectSummary[];
  /** Project id → the Estudio slug it is published as. */
  published: Record<string, string>;
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
      <p className="rounded-xl border border-dashed border-walnut-700 p-8 text-center text-sm text-sand-500">
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
            className="flex items-center gap-4 rounded-xl border border-walnut-700 bg-walnut-950/60 p-3 transition-colors hover:border-walnut-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${project.id.slice(0, 11)}/default.jpg`}
              alt=""
              className="h-12 w-20 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-cream-100">{project.title}</span>
              <StatusPill project={project} />
            </span>
            {published[project.id] && (
              <span className="shrink-0 rounded-full bg-brass-400/15 px-2.5 py-1 text-[11px] font-medium text-brass-300 ring-1 ring-inset ring-brass-400/40">
                En Estudio · /{published[project.id]}
              </span>
            )}
            <span className="shrink-0 text-xs text-sand-600">{project.frames} frames</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
