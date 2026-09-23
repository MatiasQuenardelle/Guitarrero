"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectSummary } from "@/lib/studio/server";
import { StatusPill } from "./ProjectList";

/** Below this many pieces the list is short enough to scan without a filter. */
const FILTER_THRESHOLD = 6;

/** The piece title as a button that opens a menu of every loaded piece. */
export default function TabSwitcher({
  currentId,
  title,
  projects,
}: {
  currentId: string;
  title: string;
  projects: ProjectSummary[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? projects.filter((p) => p.title.toLowerCase().includes(needle)) : projects;
  }, [projects, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const toggle = () => {
    if (!open) {
      setQuery("");
      setActive(Math.max(0, projects.findIndex((p) => p.id === currentId)));
    }
    setOpen(!open);
  };

  const select = (project: ProjectSummary) => {
    setOpen(false);
    if (project.id !== currentId) router.push(`/studio/${project.slug}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + matches.length) % Math.max(1, matches.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (matches[active]) select(matches[active]);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0" onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group -mx-2 flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
      >
        <h1 className="truncate text-xl font-semibold text-zinc-100">{title}</h1>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:text-amber-400 ${open ? "rotate-180" : ""}`}
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
          {projects.length >= FILTER_THRESHOLD && (
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              placeholder="Find a piece…"
              className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          )}

          <ul ref={listRef} role="listbox" className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5">
            {matches.map((project, index) => {
              const current = project.id === currentId;
              return (
                <li
                  key={project.id}
                  role="option"
                  aria-selected={current}
                  onClick={() => select(project)}
                  onPointerMove={() => setActive(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 ${index === active ? "bg-zinc-900" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${project.id}/default.jpg`}
                    alt=""
                    className={`h-10 w-16 shrink-0 rounded object-cover ${current ? "ring-2 ring-amber-500" : ""}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${current ? "text-amber-400" : "text-zinc-200"}`}
                    >
                      {project.title}
                    </span>
                    <StatusPill project={project} />
                  </span>
                  {current && <span className="shrink-0 pr-1 text-xs text-amber-400">✓</span>}
                </li>
              );
            })}
            {matches.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-zinc-600">No piece matches.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
