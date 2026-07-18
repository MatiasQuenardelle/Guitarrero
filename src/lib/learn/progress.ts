import { ALL_LESSONS, getLesson } from "./content";

export interface Progress {
  completedLessonIds: string[];
  xp: number;
  streak: number;
  lastActiveDate: string; // local "YYYY-MM-DD"
  bestStreak: number;
}

export type LessonState = "locked" | "unlocked" | "completed";

const STORAGE_KEY = "guitarrero-progress";

const DEFAULT_PROGRESS: Progress = {
  completedLessonIds: [],
  xp: 0,
  streak: 0,
  lastActiveDate: "",
  bestStreak: 0,
};

function isClient(): boolean {
  return typeof window !== "undefined";
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

export function getProgress(): Progress {
  if (!isClient()) return DEFAULT_PROGRESS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...DEFAULT_PROGRESS, ...JSON.parse(data) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  emit();
}

// --- store plumbing for useSyncExternalStore ---

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

let cachedRaw: string | null = null;
let cachedProgress: Progress = DEFAULT_PROGRESS;

/** Stable-reference snapshot of progress for useSyncExternalStore. */
export function getProgressSnapshot(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedProgress = raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
    } catch {
      cachedProgress = DEFAULT_PROGRESS;
    }
  }
  return cachedProgress;
}

export function getDefaultProgress(): Progress {
  return DEFAULT_PROGRESS;
}

/** Streak to display: 0 if the streak is broken (last activity before yesterday). */
export function displayStreak(progress: Progress): number {
  if (!progress.lastActiveDate) return 0;
  const today = localDateString(new Date());
  if (progress.lastActiveDate === today || progress.lastActiveDate === yesterdayString()) {
    return progress.streak;
  }
  return 0;
}

export function completeLesson(lessonId: string): Progress {
  const progress = getProgress();
  if (progress.completedLessonIds.includes(lessonId)) return progress;

  const lesson = getLesson(lessonId);
  if (!lesson) return progress;

  const today = localDateString(new Date());
  let streak = progress.streak;
  if (progress.lastActiveDate !== today) {
    streak = progress.lastActiveDate === yesterdayString() ? progress.streak + 1 : 1;
  }

  const updated: Progress = {
    completedLessonIds: [...progress.completedLessonIds, lessonId],
    xp: progress.xp + lesson.xp,
    streak,
    lastActiveDate: today,
    bestStreak: Math.max(progress.bestStreak, streak),
  };
  saveProgress(updated);
  return updated;
}

export function resetProgress(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

/** Linear unlock: a lesson is unlocked iff it is first or the previous lesson is completed. */
export function getLessonState(lessonId: string, progress: Progress): LessonState {
  if (progress.completedLessonIds.includes(lessonId)) return "completed";
  const index = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  if (index === -1) return "locked";
  if (index === 0) return "unlocked";
  const prev = ALL_LESSONS[index - 1];
  return progress.completedLessonIds.includes(prev.id) ? "unlocked" : "locked";
}
