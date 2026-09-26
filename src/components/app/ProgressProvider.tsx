"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PieceProgress, ProgressUpdate } from "@/lib/progress/types";

/**
 * Favorites, recent pieces and saved speeds. Signed in, they live in the account (Postgres);
 * with sign-in switched off (local work) they live in this browser.
 */
interface ProgressValue {
  loaded: boolean;
  /** Anonymous, but an account could keep this in sync across devices. */
  couldSync: boolean;
  progress: Record<string, PieceProgress>;
  toggleFavorite: (slug: string) => void;
  saveSpeed: (slug: string, speed: number) => void;
  markOpened: (slug: string) => void;
}

const ProgressContext = createContext<ProgressValue | null>(null);
const LOCAL_KEY = "guitarrero-progress";

function readLocal(): Record<string, PieceProgress> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeLocal(progress: Record<string, PieceProgress>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
  } catch {
    // Private mode: progress lasts until the tab closes.
  }
}

function apply(current: PieceProgress | undefined, update: ProgressUpdate): PieceProgress {
  return {
    slug: update.slug,
    favorite: update.favorite ?? current?.favorite ?? false,
    speed: update.speed ?? current?.speed ?? null,
    lastOpenedAt: update.opened ? new Date().toISOString() : (current?.lastOpenedAt ?? null),
  };
}

export function ProgressProvider({
  signedIn,
  accounts,
  children,
}: {
  signedIn: boolean;
  accounts: boolean;
  children: React.ReactNode;
}) {
  const [progress, setProgress] = useState<Record<string, PieceProgress>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const rows: Promise<PieceProgress[]> = signedIn
      ? fetch("/api/progress")
          .then((response) => (response.ok ? response.json() : { progress: [] }))
          .then((data: { progress: PieceProgress[] }) => data.progress)
          .catch(() => [])
      : Promise.resolve(Object.values(readLocal()));
    void rows.then((list) => {
      if (cancelled) return;
      setProgress(Object.fromEntries(list.map((row) => [row.slug, row])));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // Optimistic: the screen changes at once, the server catches up.
  const update = useCallback(
    (change: ProgressUpdate) => {
      setProgress((current) => {
        const next = { ...current, [change.slug]: apply(current[change.slug], change) };
        if (!signedIn) writeLocal(next);
        return next;
      });
      if (signedIn) {
        void fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        });
      }
    },
    [signedIn],
  );

  const value = useMemo<ProgressValue>(
    () => ({
      loaded,
      couldSync: accounts && !signedIn,
      progress,
      toggleFavorite: (slug) => update({ slug, favorite: !progress[slug]?.favorite }),
      saveSpeed: (slug, speed) => update({ slug, speed }),
      markOpened: (slug) => update({ slug, opened: true }),
    }),
    [loaded, accounts, signedIn, progress, update],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

const noSubscription = () => () => {};
const EMPTY: Record<string, PieceProgress> = {};

export function useProgress(): ProgressValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress needs a <ProgressProvider> above it");
  // The server never knows the saved state, and a component can hydrate after it has already
  // arrived; until this one has hydrated, show it what the server rendered.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  return hydrated ? value : { ...value, loaded: false, progress: EMPTY };
}
