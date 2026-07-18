"use client";

import Link from "next/link";
import type { Lesson } from "@/lib/learn/types";
import type { LessonState } from "@/lib/learn/progress";

const KIND_ICONS: Record<Lesson["kind"], React.ReactNode> = {
  video: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  ),
  reading: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zm16 0h-7a3 3 0 0 0-1 .17V20a2 2 0 0 1 1-.17h7V4z" />
    </svg>
  ),
  piece: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M9 18a3 3 0 1 1-2-2.83V5l12-2v11a3 3 0 1 1-2-2.83V6.4L9 8v10z" />
    </svg>
  ),
  practice: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 3 4 20h16L12 3zm0 4.5L16.5 18h-9L12 7.5zM11 13h2v3h-2v-3z" />
    </svg>
  ),
};

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
    <path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" />
  </svg>
);

const TROPHY_ICON = (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
    <path d="M6 3h12v2h3v3a5 5 0 0 1-4.3 4.95A6 6 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1a6 6 0 0 1-3.7-3.95A5 5 0 0 1 3 8V5h3V3zm0 4H5v1a3 3 0 0 0 1.3 2.47A9.6 9.6 0 0 1 6 8V7zm12 1c0 .86-.1 1.7-.3 2.47A3 3 0 0 0 19 8V7h-1v1z" />
  </svg>
);

interface PathNodeProps {
  lesson: Lesson;
  state: LessonState;
  offset: number;
  isCurrent: boolean;
}

export default function PathNode({ lesson, state, offset, isCurrent }: PathNodeProps) {
  const size = lesson.milestone ? "h-20 w-20" : "h-16 w-16";

  const circle =
    state === "completed"
      ? `${size} bg-amber-400 text-zinc-950 hover:bg-amber-300`
      : state === "unlocked"
        ? `${size} bg-zinc-900 text-amber-400 ring-2 ring-amber-400 node-pulse hover:bg-zinc-800`
        : `${size} bg-zinc-800 text-zinc-600`;

  const icon =
    state === "completed"
      ? CHECK_ICON
      : state === "locked"
        ? LOCK_ICON
        : lesson.milestone
          ? TROPHY_ICON
          : KIND_ICONS[lesson.kind];

  const content = (
    <div
      className="relative flex flex-col items-center gap-1.5"
      style={{ transform: `translateX(${offset}px)` }}
    >
      {isCurrent && (
        <span className="absolute -top-8 rounded-full border border-amber-400 bg-zinc-950 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-400">
          Start
        </span>
      )}
      <span
        className={`flex items-center justify-center rounded-full transition-colors ${circle}`}
      >
        {icon}
      </span>
      <span
        className={`max-w-[9rem] text-center text-xs leading-tight ${
          state === "locked" ? "text-zinc-600" : "text-zinc-300"
        }`}
      >
        {lesson.title}
      </span>
    </div>
  );

  if (state === "locked") {
    return <div aria-disabled className="cursor-not-allowed py-3">{content}</div>;
  }

  return (
    <Link
      href={`/learn/${lesson.id}`}
      className="py-3"
      data-current={isCurrent || undefined}
    >
      {content}
    </Link>
  );
}
