"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  subscribeProgress,
  getProgressSnapshot,
  getDefaultProgress,
  displayStreak,
} from "@/lib/learn/progress";

export default function TopBar() {
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getDefaultProgress
  );
  const streak = displayStreak(progress);

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-100">
          Guitar<span className="text-amber-400">rero</span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1 text-sm font-semibold ${
              streak > 0 ? "text-amber-400" : "text-zinc-500"
            }`}
            title="Daily streak"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 2c.5 4-1.5 5.5-3 7.5C7.3 11.7 6 13.6 6 16a6 6 0 0 0 12 0c0-2-1-3.5-2-5-.4 1.2-1 2-2 2.5.5-3-.5-7-2-11.5z" />
            </svg>
            {streak}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-400" title="Total XP">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
            </svg>
            {progress.xp} XP
          </span>
          <Link
            href="/tools"
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-500 hover:text-amber-400"
          >
            Tab Tools
          </Link>
        </div>
      </div>
    </header>
  );
}
