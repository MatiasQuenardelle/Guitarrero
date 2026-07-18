"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Lesson } from "@/lib/learn/types";
import {
  completeLesson,
  getLessonState,
  subscribeProgress,
  getProgressSnapshot,
  getDefaultProgress,
} from "@/lib/learn/progress";
import { parseTab } from "@/lib/parser";
import TabViewer from "@/components/TabViewer";
import LiteYouTube from "./LiteYouTube";

const KIND_LABELS: Record<Lesson["kind"], string> = {
  video: "Video lesson",
  reading: "Reading",
  piece: "Piece",
  practice: "Practice",
};

export default function LessonView({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [justCompleted, setJustCompleted] = useState(false);
  const [showTab, setShowTab] = useState(false);

  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getDefaultProgress
  );
  const state = getLessonState(lesson.id, progress);

  const parsedSong = useMemo(
    () => (lesson.tabText ? parseTab(lesson.tabText) : null),
    [lesson.tabText]
  );

  const handleComplete = () => {
    completeLesson(lesson.id);
    setJustCompleted(true);
    setTimeout(() => router.push("/"), 1200);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
      <Link
        href="/"
        className="text-sm text-zinc-400 transition-colors hover:text-amber-400"
      >
        &larr; Back to path
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-full border border-amber-500/40 bg-amber-400/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
          {KIND_LABELS[lesson.kind]}
        </span>
        <span className="text-xs font-semibold text-zinc-500">+{lesson.xp} XP</span>
      </div>

      <h1 className="mt-3 text-3xl font-bold text-zinc-100">{lesson.title}</h1>
      {lesson.subtitle && (
        <p className="mt-1 text-lg text-zinc-400">{lesson.subtitle}</p>
      )}

      {lesson.youtubeId && (
        <div className="mt-6">
          <LiteYouTube youtubeId={lesson.youtubeId} title={lesson.title} />
        </div>
      )}

      {lesson.body && (
        <div className="mt-6 space-y-4">
          {lesson.body.map((paragraph, i) => (
            <p key={i} className="leading-relaxed text-zinc-300">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {lesson.tips && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Practice tips
          </h2>
          <ul className="mt-3 space-y-2">
            {lesson.tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-300">
                <span className="text-amber-400">&bull;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsedSong && (
        <div className="mt-6">
          <button
            onClick={() => setShowTab((v) => !v)}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-amber-500 hover:text-amber-400"
          >
            {showTab ? "Hide tab" : "Open tab"}
          </button>
          {showTab && (
            <div className="mt-4">
              <TabViewer song={parsedSong} rawText={lesson.tabText ?? ""} />
            </div>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          {justCompleted ? (
            <p className="w-full text-center text-lg font-bold text-amber-400">
              +{lesson.xp} XP — Lesson complete!
            </p>
          ) : state === "completed" ? (
            <p className="w-full text-center text-sm font-semibold text-zinc-400">
              Completed &#10003;
            </p>
          ) : state === "locked" ? (
            <p className="w-full text-center text-sm text-zinc-500">
              Complete the previous lessons to unlock this one.
            </p>
          ) : (
            <button
              onClick={handleComplete}
              className="w-full rounded-xl bg-amber-400 py-3 text-base font-bold text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Mark complete &nbsp;+{lesson.xp} XP
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
