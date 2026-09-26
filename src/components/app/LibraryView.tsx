"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import DifficultyMeter from "@/components/ui/DifficultyMeter";
import { ArrowRightIcon, SearchIcon, StarIcon } from "@/components/ui/Icons";
import { useI18n } from "@/i18n/I18nProvider";
import type { Difficulty, Piece } from "@/lib/catalog/types";
import { useProgress } from "./ProgressProvider";

/** Accent- and case-insensitive, so "tarrega" finds Tárrega. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function FavoriteButton({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { progress, toggleFavorite } = useProgress();
  const on = Boolean(progress[slug]?.favorite);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        toggleFavorite(slug);
      }}
      aria-pressed={on}
      aria-label={on ? t.library.removeFavorite : t.library.addFavorite}
      title={on ? t.library.removeFavorite : t.library.addFavorite}
      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        on ? "text-brass-300" : "text-sand-500 hover:bg-walnut-700/70 hover:text-cream-100"
      }`}
    >
      <StarIcon filled={on} />
    </button>
  );
}

function PieceCard({ piece }: { piece: Piece }) {
  const { t, locale } = useI18n();
  return (
    <article className="panel group relative flex flex-col rounded-2xl p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-brass-400/40">
      <div className="flex items-start justify-between gap-3">
        <DifficultyMeter level={piece.difficulty} label={t.library.difficulty[piece.difficulty]} />
        <FavoriteButton slug={piece.slug} />
      </div>
      <h3 className="mt-5 font-display text-[1.75rem] font-medium leading-[1.1] text-cream-50">
        <Link href={`/piece/${piece.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">
          {piece.title[locale]}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-sand-400">
        {piece.composer}
        {piece.composerDates && <span className="text-sand-600"> · {piece.composerDates}</span>}
      </p>
      {piece.about && (
        <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-sand-400">{piece.about[locale]}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-brass-400/10 pt-4 font-mono text-[11.5px] text-sand-500">
        <span>
          {piece.timeSignature[0]}/{piece.timeSignature[1]}
        </span>
        <span>
          {piece.bars} {t.library.bars}
        </span>
        <span>♩ = {piece.tempo}</span>
        {piece.tuning && <span className="text-brass-400">{piece.tuning}</span>}
        <ArrowRightIcon className="ml-auto h-4 w-4 text-sand-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brass-300" />
      </div>
    </article>
  );
}

function ContinueCard({ piece, speed }: { piece: Piece; speed: number | null }) {
  const { t, locale } = useI18n();
  return (
    <Link
      href={`/piece/${piece.slug}`}
      className="wood group flex min-w-[260px] flex-1 items-center gap-4 rounded-2xl p-4 ring-1 ring-brass-400/20 transition-shadow hover:ring-brass-400/50 sm:min-w-0"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brass-300 to-brass-500 font-display text-lg text-walnut-950">
        ▶
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-xl text-cream-50">{piece.title[locale]}</span>
        <span className="block truncate text-xs text-sand-400">
          {piece.composer}
          {speed ? ` · ♩ = ${Math.round(piece.tempo * speed)}` : ""}
        </span>
      </span>
      <span className="sr-only">{t.library.continue}</span>
    </Link>
  );
}

const FILTERS: (Difficulty | 0)[] = [0, 1, 2, 3];

export default function LibraryView({ pieces }: { pieces: Piece[] }) {
  const { t } = useI18n();
  const { progress, loaded, couldSync } = useProgress();
  const favoritesOnly = useSearchParams().get("view") === "favorites";
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Difficulty | 0>(0);

  const recent = useMemo(
    () =>
      Object.values(progress)
        .filter((row) => row.lastOpenedAt)
        .sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""))
        .map((row) => ({ piece: pieces.find((piece) => piece.slug === row.slug), speed: row.speed }))
        .filter((entry): entry is { piece: Piece; speed: number | null } => Boolean(entry.piece))
        .slice(0, 3),
    [progress, pieces],
  );

  const shown = useMemo(() => {
    const needle = fold(query.trim());
    return pieces.filter(
      (piece) =>
        (!favoritesOnly || progress[piece.slug]?.favorite) &&
        (level === 0 || piece.difficulty === level) &&
        (!needle || fold(`${piece.title.es} ${piece.title.en} ${piece.composer}`).includes(needle)),
    );
  }, [pieces, query, level, favoritesOnly, progress]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
      <header className="rise flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-5xl font-medium text-cream-50">
            {favoritesOnly ? t.library.favorites : t.library.title}
          </h1>
          <p className="mt-2 text-[15px] text-sand-400">{favoritesOnly ? t.library.favoritesLead : t.library.lead}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.library.search}
            className="h-11 w-full rounded-full border border-walnut-600 bg-walnut-950/70 pl-11 pr-4 text-sm text-cream-50 placeholder:text-sand-600 outline-none transition-colors focus:border-brass-400/60"
          />
        </label>
      </header>

      {!favoritesOnly && recent.length > 0 && !query && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass-400">
            {t.library.continue}
          </h2>
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
            {recent.map(({ piece, speed }) => (
              <ContinueCard key={piece.slug} piece={piece} speed={speed} />
            ))}
          </div>
        </section>
      )}

      <div className="scrollbar-none -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLevel(value)}
            aria-pressed={level === value}
            className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors ${
              level === value
                ? "bg-cream-100 text-walnut-950"
                : "border border-walnut-600 text-sand-300 hover:border-walnut-500 hover:text-cream-50"
            }`}
          >
            {value === 0 ? t.library.all : t.library.difficulty[value]}
          </button>
        ))}
      </div>

      {couldSync && Object.keys(progress).length > 0 && (
        <p className="mt-6 text-[13px] text-sand-500">
          {t.library.syncHint}{" "}
          <Link href="/signup?next=/library" className="text-brass-300 underline-offset-4 hover:underline">
            {t.library.syncCta}
          </Link>
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-16 max-w-md text-[15px] text-sand-400">
          {favoritesOnly && loaded && !query ? t.library.emptyFavorites : t.library.empty}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((piece) => (
            <PieceCard key={piece.slug} piece={piece} />
          ))}
        </div>
      )}
    </main>
  );
}
