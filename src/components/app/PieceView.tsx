"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LiteYouTube from "@/components/learn/LiteYouTube";
import ScorePlayer from "@/components/studio/ScorePlayer";
import DifficultyMeter from "@/components/ui/DifficultyMeter";
import { ArrowLeftIcon, CloseIcon, StarIcon } from "@/components/ui/Icons";
import { useI18n } from "@/i18n/I18nProvider";
import type { Piece } from "@/lib/catalog/types";
import { useProgress } from "./ProgressProvider";

function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.4" strokeLinecap="round" />
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sand-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-cream-100">{value}</dd>
    </div>
  );
}

export default function PieceView({ piece, alphaTex }: { piece: Piece; alphaTex: string }) {
  const { t, locale } = useI18n();
  const { progress, loaded, toggleFavorite, saveSpeed, markOpened } = useProgress();
  const [infoOpen, setInfoOpen] = useState(false);
  const saved = progress[piece.slug];
  const favorite = Boolean(saved?.favorite);

  useEffect(() => {
    if (loaded) markOpened(piece.slug);
    // Once per visit, after the saved state has arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, piece.slug]);

  const onSpeedChange = useCallback((speed: number) => saveSpeed(piece.slug, speed), [saveSpeed, piece.slug]);

  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setInfoOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);

  return (
    <main className="flex h-dvh flex-col gap-3 px-3 pb-3 pt-3 sm:gap-4 sm:px-5 sm:pb-4 sm:pt-5 lg:px-7">
      <header className="flex shrink-0 items-center gap-3">
        <Link
          href="/library"
          aria-label={t.piece.back}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-walnut-600 text-sand-300 transition-colors hover:border-brass-400/50 hover:text-cream-50"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[1.7rem] font-medium leading-tight text-cream-50 sm:text-[2rem]">
            {piece.title[locale]}
          </h1>
          <p className="truncate text-[13px] text-sand-400">
            {piece.composer}
            <span className="hidden sm:inline">
              {" · "}
              {piece.timeSignature[0]}/{piece.timeSignature[1]} · ♩ = {piece.tempo} · {piece.bars} {t.library.bars}
              {piece.tuning ? ` · ${piece.tuning}` : ""}
            </span>
          </p>
        </div>
        <span className="hidden md:block">
          <DifficultyMeter level={piece.difficulty} label={t.library.difficulty[piece.difficulty]} />
        </span>
        <button
          type="button"
          onClick={() => toggleFavorite(piece.slug)}
          aria-pressed={favorite}
          aria-label={favorite ? t.library.removeFavorite : t.library.addFavorite}
          title={favorite ? t.library.removeFavorite : t.library.addFavorite}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
            favorite
              ? "border-brass-400/50 bg-brass-400/10 text-brass-300"
              : "border-walnut-600 text-sand-300 hover:border-brass-400/50 hover:text-cream-50"
          }`}
        >
          <StarIcon filled={favorite} />
        </button>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={t.piece.about}
          title={t.piece.about}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-walnut-600 text-sand-300 transition-colors hover:border-brass-400/50 hover:text-cream-50"
        >
          <InfoIcon />
        </button>
      </header>

      <div className="min-h-0 flex-1">
        <ScorePlayer
          id={`piece:${piece.slug}`}
          tex={alphaTex}
          fill
          initialSpeed={loaded ? (saved?.speed ?? null) : null}
          onSpeedChange={onSpeedChange}
        />
      </div>

      {/* About the piece, and the video it was read from. */}
      {infoOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-night/60" onClick={() => setInfoOpen(false)}>
          <aside
            onClick={(event) => event.stopPropagation()}
            className="rise flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-brass-400/15 bg-walnut-950 p-6"
            aria-label={t.piece.about}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-400">{t.piece.about}</p>
                <h2 className="mt-2 font-display text-3xl font-medium leading-tight text-cream-50">
                  {piece.title[locale]}
                </h2>
                <p className="mt-1 text-sm text-sand-400">
                  {piece.composer}
                  {piece.composerDates ? ` · ${piece.composerDates}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label={t.reader.back}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sand-400 hover:bg-walnut-800 hover:text-cream-50"
              >
                <CloseIcon />
              </button>
            </div>

            {piece.about && (
              <p className="mt-5 font-display text-xl italic leading-snug text-cream-100">{piece.about[locale]}</p>
            )}

            <div className="purfling my-6" />

            <dl className="grid grid-cols-2 gap-5">
              <Fact label={t.piece.time} value={`${piece.timeSignature[0]}/${piece.timeSignature[1]}`} />
              <Fact label={t.piece.written} value={`♩ = ${piece.tempo}`} />
              <Fact label={t.library.bars} value={String(piece.bars)} />
              <Fact label={t.piece.tuning} value={piece.tuning ?? t.piece.standardTuning} />
            </dl>
            <div className="mt-5">
              <DifficultyMeter level={piece.difficulty} label={t.library.difficulty[piece.difficulty]} />
            </div>

            <div className="purfling my-6" />

            <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-400">{t.piece.reference}</h3>
            <div className="mt-3">
              <LiteYouTube youtubeId={piece.youtubeId} title={piece.title[locale]} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sand-500">{t.piece.referenceNote}</p>
          </aside>
        </div>
      )}
    </main>
  );
}
