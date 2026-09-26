import Link from "next/link";
import ScoreMock from "@/components/landing/ScoreMock";
import SiteHeader from "@/components/landing/SiteHeader";
import DifficultyMeter from "@/components/ui/DifficultyMeter";
import {
  ExpandIcon,
  LoopIcon,
  MetronomeIcon,
  MinusIcon,
  PauseIcon,
  PlusIcon,
  ReaderIcon,
  TuningIcon,
} from "@/components/ui/Icons";
import LanguageSwitch from "@/components/ui/LanguageSwitch";
import { Rosette } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/button";
import { getDictionary } from "@/i18n/server";
import { isAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/auth/server";
import { listPieces } from "@/lib/catalog/server";

const FEATURE_ICONS = [
  <span key="t" className="font-display text-xl font-semibold leading-none">♩</span>,
  <LoopIcon key="l" />,
  <MetronomeIcon key="m" />,
  <TuningIcon key="g" className="h-5 w-5" />,
  <ExpandIcon key="f" />,
  <ReaderIcon key="r" />,
];

const READER_SAMPLE = `[Estribillo]
Am            Dm
  La luna se esconde
G              C     E7
  detrás de la loma
e|-----0-------0-----|
B|---1---1---1---1---|
G|-2-------2---------|`;

// Reads the session and the language cookie.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ t, locale }, user] = await Promise.all([getDictionary(), currentUser()]);
  const pieces = listPieces();
  const startHref = "/library";

  return (
    <div className="wood-quiet min-h-dvh overflow-x-clip">
      <SiteHeader t={t} signedIn={Boolean(user)} admin={isAdmin} />

      {/* Hero */}
      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-14">
        <div className="rise">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brass-400 sm:tracking-[0.28em]">
            {t.landing.eyebrow}
          </p>
          <h1 className="text-balance font-display text-[3.1rem] font-medium leading-[0.98] text-cream-50 sm:text-[4.2rem]">
            {t.landing.title}{" "}
            <em className="font-display italic text-brass-300">{t.landing.titleAccent}</em>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-sand-300">{t.landing.lead}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href={startHref} className={buttonClass("primary", "lg")}>
              {t.landing.ctaPrimary}
            </Link>
            <a href="#repertorio" className={buttonClass("secondary", "lg")}>
              {t.landing.ctaSecondary}
            </a>
          </div>
        </div>

        {/* The player, drawn: score on paper resting on a walnut stand. */}
        <figure className="rise relative [animation-delay:120ms]">
          <div className="wood relative rounded-[22px] p-3 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] ring-1 ring-brass-400/20 sm:p-4">
            <div className="paper overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1px_rgba(43,30,21,0.08)]">
              <div className="flex items-baseline justify-between px-5 pt-4">
                <span className="font-display text-lg font-semibold text-ink">Estudio en Mi menor</span>
                <span className="text-[11px] italic text-ink/60">Arpegios · 6/8</span>
              </div>
              <ScoreMock className="block h-auto w-full" />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-walnut-950/80 px-3 py-2.5 ring-1 ring-brass-400/15">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-brass-300 to-brass-500 text-walnut-950">
                <PauseIcon className="h-4 w-4" />
              </span>
              <span className="ml-1 flex items-center gap-1 rounded-full border border-walnut-600 px-1.5 py-1 text-sand-300">
                <MinusIcon className="h-3.5 w-3.5" />
                <span className="px-1 font-mono text-[13px] text-cream-50">♩ 60</span>
                <PlusIcon className="h-3.5 w-3.5" />
              </span>
              <span className="hidden items-center gap-1.5 rounded-full bg-brass-400/15 px-2.5 py-1.5 text-[12px] text-brass-300 sm:flex">
                <LoopIcon className="h-3.5 w-3.5" /> 6 – 6
              </span>
              <span className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] text-brass-300">
                <MetronomeIcon className="h-4 w-4" />
              </span>
              <span className="ml-auto font-mono text-[11px] text-sand-400">6 / 32</span>
            </div>
          </div>
          <figcaption className="mt-4 text-center font-display text-[15px] italic text-sand-400">
            {t.landing.playerCaption}
          </figcaption>
        </figure>
      </section>

      <div className="purfling mx-auto max-w-6xl" />

      {/* Features */}
      <section id="funciones" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6 lg:py-28">
        <h2 className="max-w-2xl text-balance font-display text-4xl font-medium leading-tight text-cream-50 sm:text-5xl">
          {t.landing.featuresTitle}
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-brass-400/15 bg-brass-400/10 sm:grid-cols-2 lg:grid-cols-3">
          {t.landing.features.map((feature, i) => (
            <article key={feature.title} className="bg-walnut-900/95 p-7 transition-colors hover:bg-walnut-850">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-brass-400/30 text-brass-300">
                {FEATURE_ICONS[i]}
              </span>
              <h3 className="font-display text-2xl font-semibold text-cream-50">{feature.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-sand-300">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Repertoire */}
      <section id="repertorio" className="wood scroll-mt-8 border-y border-brass-400/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-4xl font-medium text-cream-50 sm:text-5xl">
                {t.landing.repertoireTitle}
              </h2>
              <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-sand-300">
                {t.landing.repertoireLead}
              </p>
            </div>
            <Link href="/library" className={buttonClass("secondary", "md")}>
              {t.nav.openApp}
            </Link>
          </div>

          <ol className="mt-12 divide-y divide-brass-400/10 border-y border-brass-400/10">
            {pieces.map((piece, i) => (
              <li key={piece.slug}>
                <Link
                  href={`/piece/${piece.slug}`}
                  className="group grid grid-cols-[2.2rem_1fr] items-baseline gap-x-4 gap-y-1 py-5 transition-colors sm:grid-cols-[3rem_1.4fr_1fr_9.5rem] sm:items-center"
                >
                  <span className="font-display text-xl italic text-brass-500/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[1.6rem] leading-tight text-cream-50 transition-colors group-hover:text-brass-300">
                    {piece.title[locale]}
                  </span>
                  <span className="col-start-2 text-sm text-sand-400 sm:col-start-auto">
                    {piece.composer}
                    {piece.composerDates ? (
                      <span className="text-sand-500"> · {piece.composerDates}</span>
                    ) : null}
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    <DifficultyMeter level={piece.difficulty} label={t.library.difficulty[piece.difficulty]} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tab reader */}
      <section id="lector" className="mx-auto grid w-full max-w-6xl scroll-mt-8 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <div>
          <h2 className="font-display text-4xl font-medium text-cream-50 sm:text-5xl">{t.landing.readerTitle}</h2>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-sand-300">{t.landing.readerLead}</p>
          <Link href="/reader" className={`${buttonClass("secondary", "md")} mt-8`}>
            {t.landing.readerCta}
          </Link>
        </div>
        <div className="panel overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-brass-400/10 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-walnut-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-walnut-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-walnut-600" />
          </div>
          <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-[1.55] text-sand-300">
            {READER_SAMPLE.split("\n").map((line, i) => (
              <span
                key={i}
                className={`block ${
                  line.startsWith("[")
                    ? "mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-400"
                    : /^[A-G][m7 ]/.test(line)
                      ? "text-brass-300"
                      : /\|/.test(line)
                        ? "text-sand-500"
                        : "text-cream-100"
                }`}
              >
                {line.startsWith("[") ? line.slice(1, -1) : line}
              </span>
            ))}
          </pre>
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="wood relative overflow-hidden rounded-[28px] px-6 py-16 text-center ring-1 ring-brass-400/20 sm:px-12">
          <Rosette className="mx-auto mb-6 h-14 w-14" />
          <h2 className="font-display text-4xl font-medium text-cream-50 sm:text-5xl">{t.landing.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] text-sand-300">{t.landing.finalLead}</p>
          <Link href={startHref} className={`${buttonClass("primary", "lg")} mt-8`}>
            {t.landing.ctaPrimary}
          </Link>
        </div>
      </section>

      <footer className="border-t border-brass-400/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-sand-500 sm:px-6">
          <span className="flex items-center gap-2">
            <Rosette className="h-5 w-5" /> Guitarrero · {t.landing.footer}
          </span>
          <LanguageSwitch />
        </div>
      </footer>
    </div>
  );
}
