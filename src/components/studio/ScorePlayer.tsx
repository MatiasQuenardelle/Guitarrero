"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * Playback speed is remembered per tab, keyed by project id. It is stored as a ratio of the
 * written tempo (what alphaTab takes); the BPM shown is derived from it.
 */
function loadSpeeds(): Record<string, number> {
  try {
    const data = localStorage.getItem(SPEED_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveSpeed(projectId: string, speed: number): void {
  try {
    localStorage.setItem(
      SPEED_STORAGE_KEY,
      JSON.stringify({ ...loadSpeeds(), [projectId]: speed }),
    );
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
  projectId: string;
  tex: string;
}

/**
 * alphaTab creates the cursor elements but ships no styles for them, so without these rules
 * there is no visible playhead. They live here rather than in globals.css so they travel
 * with the component (and reload with it) instead of depending on the CSS pipeline.
 */
const CURSOR_STYLES = `
.at-cursor-bar { background: rgba(245, 158, 11, 0.18); }
.at-cursor-beat { width: 2px; background: #b45309; }
.at-selection div { background: rgba(245, 158, 11, 0.12); }
.at-highlight * { fill: #b45309; stroke: #b45309; }
`;

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
        active
          ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function ScorePlayer({ projectId, tex }: ScorePlayerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const shellRef = useRef<HTMLDivElement>(null);
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

  // Restore the speed this tab was last played at.
  useEffect(() => {
    const stored = Number(loadSpeeds()[projectId]);
    if (Number.isFinite(stored) && stored > 0) setSpeed(clampSpeed(stored));
  }, [projectId, setSpeed]);

  const changeSpeed = useCallback(
    (value: number) => {
      const next = clampSpeed(value);
      setSpeed(next);
      saveSpeed(projectId, next);
    },
    [projectId, setSpeed],
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
      setBpm(next);
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

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void shellRef.current?.requestFullscreen?.();
    }
  }, []);

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

  // In fullscreen the toolbar fades away while playing and comes back on any movement.
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
    window.addEventListener("keydown", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("keydown", show);
    };
  }, [fullscreen]);

  // Shortcuts worth having while a guitar is in your hands.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.code === "Space") {
        event.preventDefault();
        playPause();
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
  }, [playPause, toggleFullscreen, stepBpm]);

  const loading = state === "loading";

  return (
    <div
      ref={shellRef}
      className={
        // `isolate` keeps alphaTab's z-indexed cursors from painting over page-level menus.
        fullscreen
          ? "relative flex h-screen w-screen flex-col bg-white"
          : "isolate flex flex-col gap-3"
      }
    >
      <style>{CURSOR_STYLES}</style>
      <div
        className={
          fullscreen
            ? `absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-zinc-800 bg-zinc-950/90 p-3 backdrop-blur transition-opacity duration-300 ${
                controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
              }`
            : "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
        }
      >
        <IconButton label={state === "playing" ? "Pause" : "Play"} onClick={playPause}>
          {state === "playing" ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5z" />
            </svg>
          )}
          <span>{state === "playing" ? "Pause" : "Play"}</span>
        </IconButton>

        <IconButton label="Stop" onClick={stop}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6 6h12v12H6z" />
          </svg>
        </IconButton>

        <div className="ml-2 flex items-center gap-1 text-sm text-zinc-400">
          <span className="mr-1">Tempo</span>
          <IconButton label="Slower ([)" onClick={() => stepBpm(-1)}>
            −
          </IconButton>
          <label className="flex h-9 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-zinc-200">
            ♩ =
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={bpmDraft ?? (tempo > 0 ? bpm : "")}
              disabled={tempo === 0}
              aria-label="Tempo in beats per minute"
              onChange={(event) => setBpmDraft(event.target.value)}
              onBlur={commitBpmDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-12 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </label>
          <IconButton label="Faster (])" onClick={() => stepBpm(1)}>
            +
          </IconButton>
          {tempo > 0 && bpm !== tempo && (
            <IconButton
              label={`Back to the written tempo (♩ = ${tempo})`}
              onClick={() => setBpm(tempo)}
            >
              ♩ = {tempo}
            </IconButton>
          )}
        </div>

        <IconButton
          label={
            natural
              ? "Natural: strings ring and the playing breathes (click for strict)"
              : "Strict: every note exactly as written (click for natural)"
          }
          active={natural}
          onClick={toggleNatural}
        >
          {natural ? "Natural" : "Strict"}
        </IconButton>

        {guitarSounds.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Guitar
            <select
              value={guitarSound ?? ""}
              onChange={(event) => setGuitarSound(event.target.value)}
              className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-200"
            >
              {guitarSounds.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <IconButton label="Metronome" active={metronome} onClick={toggleMetronome}>
          Metronome
        </IconButton>
        <IconButton label="Count-in" active={countIn} onClick={toggleCountIn}>
          Count-in
        </IconButton>

        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <span className="ml-2">Loop</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, barCount)}
            value={loop ? loop.from + 1 : ""}
            placeholder="from"
            onChange={(event) =>
              setLoop({
                from: Math.max(0, Number(event.target.value) - 1),
                to: loop?.to ?? Math.max(0, Number(event.target.value) - 1),
              })
            }
            className="h-9 w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-zinc-200"
          />
          <span>–</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, barCount)}
            value={loop ? loop.to + 1 : ""}
            placeholder="to"
            onChange={(event) =>
              setLoop({
                from: loop?.from ?? 0,
                to: Math.max(0, Number(event.target.value) - 1),
              })
            }
            className="h-9 w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-zinc-200"
          />
          <IconButton
            label="Loop the bar being played"
            onClick={() => setLoop({ from: currentBar, to: currentBar })}
          >
            This bar
          </IconButton>
          {loop && (
            <IconButton label="Clear loop" onClick={() => setLoop(null)}>
              Clear
            </IconButton>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <IconButton label="Zoom out" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            −
          </IconButton>
          <span className="w-12 text-center text-sm text-zinc-400">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton label="Zoom in" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            +
          </IconButton>
          <IconButton
            label={fullscreen ? "Leave full screen (Esc)" : "Full screen (F)"}
            active={fullscreen}
            onClick={toggleFullscreen}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              {fullscreen ? (
                <path d="M9 3v4a2 2 0 0 1-2 2H3V7h4V3h2zm6 0h2v4h4v2h-4a2 2 0 0 1-2-2V3zM3 15h4a2 2 0 0 1 2 2v4H7v-4H3v-2zm14 0h4v2h-4v4h-2v-4a2 2 0 0 1 2-2z" />
              ) : (
                <path d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 0h2v6h-6v-2h4v-4z" />
              )}
            </svg>
            <span>{fullscreen ? "Exit" : "Full screen"}</span>
          </IconButton>
        </div>
      </div>

      <div
        className={`flex items-center justify-between px-1 text-xs text-zinc-500 ${
          fullscreen ? "hidden" : ""
        }`}
      >
        <span>
          {barCount > 0 ? `Bar ${currentBar + 1} of ${barCount}` : "No bars"}
          {loop ? ` · looping ${loop.from + 1}–${loop.to + 1}` : ""}
        </span>
        {soundFontProgress > 0 && soundFontProgress < 1 && (
          <span>Loading sounds… {Math.round(soundFontProgress * 100)}%</span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div
        ref={scrollRef}
        className={
          fullscreen
            ? "relative flex-1 overflow-y-auto bg-white px-4 pb-20 pt-4"
            : "relative max-h-[60vh] min-h-[280px] overflow-y-auto rounded-xl border border-zinc-800 bg-white p-2"
        }
      >
        {loading && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            Loading player…
          </p>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
