"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CollapseIcon,
  CountInIcon,
  ExpandIcon,
  LoopIcon,
  MetronomeIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SlidersIcon,
  StopIcon,
} from "@/components/ui/Icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useAlphaTab } from "./useAlphaTab";

// alphaTab's own synth limits — the only bounds on the tempo.
const MIN_SPEED = 0.125;
const MAX_SPEED = 8;
/** The − / + buttons move like a metronome dial. */
const BPM_STEP = 5;
const SPEED_STORAGE_KEY = "guitarrero-studio-speeds";

function clampSpeed(value: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

/**
 * Playback speed is remembered per score on this device, keyed by id. It is stored as a
 * ratio of the written tempo (what alphaTab takes); the BPM shown is derived from it.
 */
function loadSpeeds(): Record<string, number> {
  try {
    const data = localStorage.getItem(SPEED_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveSpeed(id: string, speed: number): void {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, JSON.stringify({ ...loadSpeeds(), [id]: speed }));
  } catch {
    // Storage can be unavailable (private mode); the speed just won't stick.
  }
}

/** General MIDI nylon string guitar — the only sound a classical guitar tab should have. */
const NYLON_GUITAR = 24;

/**
 * Plays every tab on the nylon guitar, whatever instrument the saved source names; the
 * saved tab itself is left alone.
 */
function withNylonGuitar(tex: string): string {
  return /\\instrument\s+\d+/.test(tex)
    ? tex.replace(/\\instrument\s+\d+/, `\\instrument ${NYLON_GUITAR}`)
    : tex.replace(/(\\staff\{[^}]*\}[^\n]*)/, `$1 \\instrument ${NYLON_GUITAR}`);
}

interface ScorePlayerProps {
  /** Keys the remembered speed on this device. */
  id: string;
  tex: string;
  /** Speed saved for the signed-in user; wins over this device's memory. */
  initialSpeed?: number | null;
  /** Called (debounced) whenever the user settles on a new speed. */
  onSpeedChange?: (speed: number) => void;
  /** Stretch to fill the parent's height, with the transport pinned below the score. */
  fill?: boolean;
}

/**
 * alphaTab creates the cursor elements but ships no styles for them, so without these rules
 * there is no visible playhead. They live here rather than in globals.css so they travel
 * with the component (and reload with it) instead of depending on the CSS pipeline.
 */
const CURSOR_STYLES = `
.at-cursor-bar { background: rgba(211, 170, 99, 0.2); }
.at-cursor-beat { width: 2px; background: #9a6a2c; }
.at-selection div { background: rgba(211, 170, 99, 0.16); }
.at-highlight * { fill: #9a4f14; stroke: #9a4f14; }
`;

function ToolButton({
  label,
  active,
  onClick,
  children,
  className = "",
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors ${
        active
          ? "bg-brass-400/15 text-brass-300 ring-1 ring-inset ring-brass-400/45"
          : "text-sand-300 hover:bg-walnut-700/70 hover:text-cream-50"
      } ${className}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 hidden h-6 w-px shrink-0 bg-walnut-600 md:block" aria-hidden />;

export default function ScorePlayer({ id, tex, initialSpeed, onSpeedChange, fill = false }: ScorePlayerProps) {
  const { t } = useI18n();
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loopOpen, setLoopOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLDivElement>(null);
  const playableTex = useMemo(() => withNylonGuitar(tex), [tex]);
  const player = useAlphaTab(playableTex);
  const {
    containerRef,
    scrollRef,
    state,
    error,
    soundFontProgress,
    guitarSounds,
    guitarSound,
    setGuitarSound,
    natural,
    toggleNatural,
    barCount,
    currentBar,
    tempo,
    speed,
    metronome,
    countIn,
    loop,
    zoom,
    playPause,
    stop,
    setSpeed,
    toggleMetronome,
    toggleCountIn,
    setLoop,
    setZoom,
    relayout,
  } = player;

  // Restore the speed this score was last played at: the account's, else this device's.
  useEffect(() => {
    const stored = initialSpeed ?? Number(loadSpeeds()[id]);
    if (Number.isFinite(stored) && stored > 0) setSpeed(clampSpeed(stored));
  }, [id, initialSpeed, setSpeed]);

  const reportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (reportTimer.current) clearTimeout(reportTimer.current);
  }, []);

  const changeSpeed = useCallback(
    (value: number) => {
      const next = clampSpeed(value);
      setSpeed(next);
      saveSpeed(id, next);
      if (onSpeedChange) {
        if (reportTimer.current) clearTimeout(reportTimer.current);
        reportTimer.current = setTimeout(() => onSpeedChange(next), 800);
      }
    },
    [id, setSpeed, onSpeedChange],
  );

  const bpm = Math.round(tempo * speed);

  const setBpm = useCallback(
    (value: number) => {
      if (tempo > 0) changeSpeed(value / tempo);
    },
    [tempo, changeSpeed],
  );

  // Step to the next multiple of BPM_STEP so an odd written tempo lands on round numbers.
  const stepBpm = useCallback(
    (direction: 1 | -1) => {
      const next =
        direction > 0
          ? Math.floor(bpm / BPM_STEP) * BPM_STEP + BPM_STEP
          : Math.ceil(bpm / BPM_STEP) * BPM_STEP - BPM_STEP;
      setBpm(Math.max(BPM_STEP, next));
    },
    [bpm, setBpm],
  );

  // What is being typed; null while the field just mirrors the playing tempo.
  const [bpmDraft, setBpmDraft] = useState<string | null>(null);

  const commitBpmDraft = useCallback(() => {
    const value = Number(bpmDraft);
    if (bpmDraft !== null && Number.isFinite(value) && value > 0) setBpm(value);
    setBpmDraft(null);
  }, [bpmDraft, setBpm]);

  // iPhone Safari has no element fullscreen, so there the player just covers the page.
  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (fullscreen || !shell?.requestFullscreen) {
      setFullscreen(!fullscreen);
      setControlsVisible(true);
      setTimeout(relayout, 120);
    } else {
      void shell.requestFullscreen();
    }
  }, [fullscreen, relayout]);

  // Escape and the browser's own controls can exit too, so track the real state.
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      setControlsVisible(true);
      // The score has a different width now; alphaTab needs to re-flow the bars.
      setTimeout(relayout, 120);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [relayout]);

  // In fullscreen the transport fades away while playing and comes back on any movement.
  useEffect(() => {
    if (!fullscreen) return;
    let timer: ReturnType<typeof setTimeout>;

    const show = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsVisible(false), 2500);
    };

    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    window.addEventListener("keydown", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("keydown", show);
    };
  }, [fullscreen]);

  // Close the loop popover on an outside click.
  useEffect(() => {
    if (!loopOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!loopRef.current?.contains(event.target as Node)) setLoopOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [loopOpen]);

  // Shortcuts worth having while a guitar is in your hands.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.code === "Space") {
        event.preventDefault();
        playPause();
      } else if (event.key === "Escape" && fullscreen && !document.fullscreenElement) {
        toggleFullscreen();
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key === "[") {
        stepBpm(-1);
      } else if (event.key === "]") {
        stepBpm(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playPause, toggleFullscreen, stepBpm, fullscreen]);

  const loading = state === "loading";
  const playing = state === "playing";
  const progress = barCount > 0 ? (currentBar + 1) / barCount : 0;
  const soundsLoading = soundFontProgress > 0 && soundFontProgress < 1;

  const secondaryControls = (
    <>
      <ToolButton label={t.player.metronome} active={metronome} onClick={toggleMetronome}>
        <MetronomeIcon />
        <span className="xl:hidden 2xl:inline">{t.player.metronome}</span>
      </ToolButton>
      <ToolButton label={t.player.countIn} active={countIn} onClick={toggleCountIn}>
        <CountInIcon />
        <span className="xl:hidden 2xl:inline">{t.player.countIn}</span>
      </ToolButton>
      <ToolButton
        label={natural ? t.player.naturalHint : t.player.strictHint}
        active={natural}
        onClick={toggleNatural}
      >
        <span className="font-display text-base italic leading-none">{natural ? "~" : "="}</span>
        {natural ? t.player.natural : t.player.strict}
      </ToolButton>
      {guitarSounds.length > 1 && (
        <label className="flex h-10 shrink-0 items-center gap-2 rounded-full pl-3 text-[13px] text-sand-400">
          <span className="xl:hidden 2xl:inline">{t.player.guitar}</span>
          <select
            value={guitarSound ?? ""}
            onChange={(event) => setGuitarSound(event.target.value)}
            className="h-9 max-w-[10rem] rounded-full border border-walnut-600 bg-walnut-900 px-3 text-[13px] text-cream-100 outline-none focus:border-brass-400/60"
          >
            {guitarSounds.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="flex shrink-0 items-center">
        <ToolButton label={t.player.zoomOut} onClick={() => setZoom(Math.max(0.5, +(zoom - 0.1).toFixed(2)))}>
          <MinusIcon />
        </ToolButton>
        <span className="w-11 text-center font-mono text-[12px] text-sand-400">{Math.round(zoom * 100)}%</span>
        <ToolButton label={t.player.zoomIn} onClick={() => setZoom(Math.min(2, +(zoom + 0.1).toFixed(2)))}>
          <PlusIcon />
        </ToolButton>
      </span>
    </>
  );

  return (
    <div
      ref={shellRef}
      className={
        // `isolate` keeps alphaTab's z-indexed cursors from painting over page-level menus.
        fullscreen
          ? "paper fixed inset-0 z-50 flex h-dvh w-screen flex-col"
          : `isolate flex flex-col gap-3 ${fill ? "h-full min-h-0" : ""}`
      }
    >
      <style>{CURSOR_STYLES}</style>

      {error && (
        <p className="rounded-xl border border-rosewood-500/50 bg-rosewood-900/50 px-4 py-2.5 text-sm text-rosewood-400">
          {error}
        </p>
      )}

      {/* The score, on paper. */}
      <div
        ref={scrollRef}
        className={
          fullscreen
            ? "relative flex-1 overflow-y-auto px-4 pb-28 pt-6"
            : `paper relative overflow-y-auto rounded-2xl shadow-[0_30px_60px_-35px_rgba(0,0,0,0.9)] ring-1 ring-paper-edge ${
                fill ? "min-h-0 flex-1" : "max-h-[68vh] min-h-[320px]"
              } px-1 py-2 sm:px-3`
        }
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-ink/60">
            <span className="h-1 w-40 overflow-hidden rounded-full bg-ink/10">
              <span
                className="block h-full rounded-full bg-brass-500 transition-[width] duration-300"
                style={{ width: `${Math.max(8, Math.round(soundFontProgress * 100))}%` }}
              />
            </span>
            {soundsLoading ? t.player.loadingSounds : t.player.loadingPlayer}
          </div>
        )}
        <div ref={containerRef} />
      </div>

      {/* Transport */}
      <div
        className={
          fullscreen
            ? `absolute inset-x-3 bottom-3 z-10 transition-opacity duration-300 ${
                controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
              }`
            : "relative z-10 shrink-0"
        }
      >
        <div className="wood relative rounded-2xl shadow-[0_20px_50px_-25px_rgba(0,0,0,0.9)] ring-1 ring-brass-400/20">
          {/* Where we are in the piece. */}
          <div className="absolute inset-x-5 top-0 h-[2px] overflow-hidden rounded-full bg-walnut-600/60">
            <div
              className="h-full bg-gradient-to-r from-brass-500 to-brass-300 transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-2.5 sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={playPause}
              disabled={loading}
              aria-label={playing ? t.player.pause : t.player.play}
              title={`${playing ? t.player.pause : t.player.play} (Space)`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brass-300 to-brass-500 text-walnut-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_-8px_rgba(211,170,99,0.8)] transition-transform hover:from-brass-200 hover:to-brass-400 active:scale-95 disabled:opacity-50"
            >
              {playing ? <PauseIcon /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
            </button>
            <ToolButton label={t.player.stop} onClick={stop} className="hidden w-10 px-0 sm:flex">
              <StopIcon className="h-4 w-4" />
            </ToolButton>

            <Divider />

            {/* Tempo */}
            <div className="flex shrink-0 items-center rounded-full border border-walnut-600 bg-walnut-950/60">
              <button
                type="button"
                onClick={() => stepBpm(-1)}
                aria-label={`${t.player.slower} ([)`}
                title={`${t.player.slower} ([)`}
                className="flex h-10 w-9 items-center justify-center rounded-l-full text-sand-300 hover:text-cream-50"
              >
                <MinusIcon />
              </button>
              <label className="flex items-baseline gap-1 font-mono text-cream-50" title={t.player.tempoLabel}>
                <span className="font-display text-lg leading-none text-brass-300">♩</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={bpmDraft ?? (tempo > 0 ? bpm : "")}
                  disabled={tempo === 0}
                  aria-label={t.player.tempoLabel}
                  onChange={(event) => setBpmDraft(event.target.value)}
                  onBlur={commitBpmDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="w-10 bg-transparent text-center text-[15px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
              <button
                type="button"
                onClick={() => stepBpm(1)}
                aria-label={`${t.player.faster} (])`}
                title={`${t.player.faster} (])`}
                className="flex h-10 w-9 items-center justify-center rounded-r-full text-sand-300 hover:text-cream-50"
              >
                <PlusIcon />
              </button>
            </div>
            {tempo > 0 && bpm !== tempo && (
              <button
                type="button"
                onClick={() => setBpm(tempo)}
                title={`${t.player.resetTempo} (♩ = ${tempo})`}
                className="hidden h-8 shrink-0 items-center rounded-full px-2.5 font-mono text-[12px] text-sand-400 hover:bg-walnut-700/70 hover:text-cream-50 sm:flex"
              >
                {Math.round(speed * 100)}%
              </button>
            )}

            {/* Loop */}
            <div ref={loopRef} className="relative shrink-0">
              <ToolButton
                label={t.player.loop}
                active={Boolean(loop) || loopOpen}
                onClick={() => setLoopOpen((open) => !open)}
              >
                <LoopIcon />
                <span className="hidden sm:inline">
                  {loop ? `${loop.from + 1}–${loop.to + 1}` : t.player.loop}
                </span>
              </ToolButton>
              {loopOpen && (
                <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-2xl border border-brass-400/25 bg-walnut-900 p-4 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)]">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brass-400">
                    {t.player.loop}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-sand-400">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, barCount)}
                      value={loop ? loop.from + 1 : ""}
                      placeholder={t.player.from}
                      aria-label={t.player.from}
                      onChange={(event) =>
                        setLoop({
                          from: Math.max(0, Number(event.target.value) - 1),
                          to: loop?.to ?? Math.max(0, Number(event.target.value) - 1),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-walnut-600 bg-walnut-950 px-3 text-center text-cream-50 outline-none focus:border-brass-400/60"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, barCount)}
                      value={loop ? loop.to + 1 : ""}
                      placeholder={t.player.to}
                      aria-label={t.player.to}
                      onChange={(event) =>
                        setLoop({
                          from: loop?.from ?? 0,
                          to: Math.max(0, Number(event.target.value) - 1),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-walnut-600 bg-walnut-950 px-3 text-center text-cream-50 outline-none focus:border-brass-400/60"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLoop({ from: currentBar, to: currentBar })}
                      className="h-9 flex-1 rounded-full bg-brass-400/15 text-[13px] font-medium text-brass-300 ring-1 ring-inset ring-brass-400/40 hover:bg-brass-400/25"
                    >
                      {t.player.thisBar}
                    </button>
                    {loop && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoop(null);
                          setLoopOpen(false);
                        }}
                        className="h-9 rounded-full px-3 text-[13px] text-sand-300 hover:bg-walnut-700/70 hover:text-cream-50"
                      >
                        {t.player.clearLoop}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* The rest sits in the bar on wide screens and behind "More" on narrow ones. */}
            <div className="hidden min-w-0 items-center gap-1 xl:flex">
              <Divider />
              {secondaryControls}
            </div>

            <span className="ml-auto hidden shrink-0 px-2 font-mono text-[12px] text-sand-400 md:block">
              {barCount > 0 ? `${t.player.bar} ${currentBar + 1} / ${barCount}` : ""}
            </span>

            <ToolButton
              label={t.player.more}
              active={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className="ml-auto w-10 px-0 md:ml-0 xl:hidden"
            >
              <SlidersIcon />
            </ToolButton>
            <ToolButton
              label={fullscreen ? `${t.player.exitFullscreen} (Esc)` : `${t.player.fullscreen} (F)`}
              active={fullscreen}
              onClick={toggleFullscreen}
              className="w-10 px-0"
            >
              {fullscreen ? <CollapseIcon /> : <ExpandIcon />}
            </ToolButton>
          </div>

          {moreOpen && (
            <div className="flex flex-wrap items-center gap-1 border-t border-brass-400/10 px-2.5 py-2 xl:hidden">
              {secondaryControls}
            </div>
          )}
        </div>
        {!fullscreen && (
          <p className="mt-2 hidden text-center text-[11px] text-sand-500 md:block">{t.player.shortcuts}</p>
        )}
      </div>
    </div>
  );
}
