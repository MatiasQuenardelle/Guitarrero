"use client";

import type * as AlphaTabTypes from "@coderline/alphatab";
import { useCallback, useEffect, useRef, useState } from "react";
import { makePlaybackNatural } from "./naturalPlayback";

declare global {
  interface Window {
    alphaTab?: typeof AlphaTabTypes;
  }
}

/**
 * alphaTab ships its own web worker and audio worklet inside one script file. Loading that
 * file from public/ at runtime (instead of bundling it) keeps Turbopack out of the way.
 */
const SCRIPT_SRC = "/alphatab/alphaTab.min.js";

function loadAlphaTab(): Promise<typeof AlphaTabTypes> {
  if (window.alphaTab) return Promise.resolve(window.alphaTab);

  return new Promise((resolve, reject) => {
    const done = () =>
      window.alphaTab
        ? resolve(window.alphaTab)
        : reject(new Error("alphaTab loaded but exposed no global"));

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("Failed to load alphaTab")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", done);
    script.addEventListener("error", () => reject(new Error("Failed to load alphaTab")));
    document.head.appendChild(script);
  });
}

/**
 * The small General MIDI set bundled with alphaTab is always loaded first: it carries the
 * metronome and count-in clicks. A dedicated nylon guitar soundfont is layered on top and
 * wins, because alphaTab picks the last loaded preset for a program.
 */
const BASE_SOUNDFONT = "/alphatab/soundfont/sonivox.sf3";

export interface GuitarSound {
  id: string;
  label: string;
  url: string;
}

/**
 * Written by `npm run soundfont`: the dedicated nylon guitars, best first, compressed to SF3
 * (Pianoteq is 5MB) and committed, so production plays the same guitar as local.
 */
const NYLON_MANIFEST = "/sounds/manifest.json";

/** MuseScore General's nylon guitar (40MB, local only), for when no dedicated one is installed. */
const FALLBACK_GUITAR: GuitarSound = {
  id: "musescore",
  label: "MuseScore General",
  url: "/alphatab/soundfont/MuseScore_General.sf3",
};

async function availableGuitarSounds(): Promise<GuitarSound[]> {
  const [installed, fallbackPresent] = await Promise.all([
    fetch(NYLON_MANIFEST)
      .then((response) => (response.ok ? (response.json() as Promise<GuitarSound[]>) : []))
      .catch(() => [] as GuitarSound[]),
    fetch(FALLBACK_GUITAR.url, { method: "HEAD" })
      .then((response) => response.ok)
      .catch(() => false),
  ]);
  return fallbackPresent ? [...installed, FALLBACK_GUITAR] : installed;
}

/** Downloads a soundfont while reporting 0..1 progress. */
async function fetchBytes(url: string, onProgress: (value: number) => void): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Could not load ${url} (HTTP ${response.status})`);

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(Math.min(0.99, loaded / total));
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  onProgress(1);
  return bytes;
}

const GUITAR_SOUND_STORAGE_KEY = "guitarrero-studio-guitar-sound";

function storedGuitarSound(): string | null {
  try {
    return localStorage.getItem(GUITAR_SOUND_STORAGE_KEY);
  } catch {
    return null;
  }
}

export type PlayerState = "loading" | "ready" | "playing" | "paused" | "error";

export interface LoopRange {
  /** 0-based, inclusive. */
  from: number;
  to: number;
}

export interface AlphaTabController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  state: PlayerState;
  error: string | null;
  /** 0..1 while the guitar soundfont downloads. */
  soundFontProgress: number;
  /** Nylon guitar soundfonts present on disk; empty until checked. */
  guitarSounds: GuitarSound[];
  guitarSound: string | null;
  setGuitarSound: (id: string) => void;
  /** Strings ring, chords roll and dynamics breathe; off plays the tab exactly as written. */
  natural: boolean;
  toggleNatural: () => void;
  barCount: number;
  currentBar: number;
  /** The score's own opening tempo in quarter-note BPM; 0 until a score is loaded. */
  tempo: number;
  speed: number;
  metronome: boolean;
  countIn: boolean;
  loop: LoopRange | null;
  zoom: number;
  playPause: () => void;
  stop: () => void;
  setSpeed: (value: number) => void;
  toggleMetronome: () => void;
  toggleCountIn: () => void;
  setLoop: (range: LoopRange | null) => void;
  setZoom: (value: number) => void;
  /** Re-flow the score after the container changes size (entering full screen). */
  relayout: () => void;
}

export function useAlphaTab(tex: string): AlphaTabController {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<AlphaTabTypes.AlphaTabApi | null>(null);
  // A speed chosen before the player exists (restored from storage) is applied once it is ready.
  const speedRef = useRef(1);
  const naturalRef = useRef(true);
  // Playback waits for both alphaTab's own readiness and the nylon guitar being layered in.
  const playerReadyRef = useRef(false);
  const guitarLoadedRef = useRef(false);
  const guitarSoundRef = useRef<GuitarSound | null>(null);
  const loadGuitarRef = useRef<(sound: GuitarSound, reset: boolean) => void>(() => {});

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [soundFontProgress, setSoundFontProgress] = useState(0);
  const [barCount, setBarCount] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [tempo, setTempo] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [loop, setLoopState] = useState<LoopRange | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [guitarSounds, setGuitarSounds] = useState<GuitarSound[]>([]);
  const [guitarSound, setGuitarSoundState] = useState<string | null>(null);
  const [natural, setNatural] = useState(true);

  // Create the engine once; `tex` updates flow through the effect below.
  useEffect(() => {
    let disposed = false;
    let api: AlphaTabTypes.AlphaTabApi | null = null;

    Promise.all([loadAlphaTab(), availableGuitarSounds()])
      .then(([alphaTab, sounds]) => {
        if (disposed || !containerRef.current) return;

        const stored = storedGuitarSound();
        const initial = sounds.find((sound) => sound.id === stored) ?? sounds[0] ?? null;
        guitarSoundRef.current = initial;
        setGuitarSounds(sounds);
        setGuitarSoundState(initial?.id ?? null);
        // Without any guitar soundfont on disk the bundled one has to do.
        guitarLoadedRef.current = !initial;

        // Phones get a smaller engraving so a whole bar or two fit across the screen.
        const scale = window.innerWidth < 640 ? 0.7 : 1;
        setZoomState(scale);

        api = new alphaTab.AlphaTabApi(containerRef.current, {
          core: {
            fontDirectory: "/alphatab/font/",
            logLevel: alphaTab.LogLevel.Warning,
          },
          display: {
            scale,
            staveProfile: alphaTab.StaveProfile.ScoreTab,
            // Warm ink on the cream paper the player sits on.
            resources: {
              mainGlyphColor: "#2B1E15",
              secondaryGlyphColor: "#2B1E1580",
              staffLineColor: "#8C7862",
              barSeparatorColor: "#4A3425",
              barNumberColor: "#9A6A2C",
              scoreInfoColor: "#2B1E15",
            },
          },
          // SongBook mode hides the "(0)" a tie leaves at the start of the next bar in the
          // tab, the way engraved classical tabs do; GuitarPro mode prints it.
          notation: { notationMode: alphaTab.NotationMode.SongBook },
          player: {
            playerMode: alphaTab.PlayerMode.EnabledAutomatic,
            soundFont: BASE_SOUNDFONT,
            scrollElement: scrollRef.current ?? undefined,
            scrollMode: alphaTab.ScrollMode.Continuous,
            scrollOffsetY: -20,
            enableCursor: true,
            enableUserInteraction: true,
          },
        });
        // SongBook mode also draws grace notes full-size in the tab; keep them small.
        api.settings.notation.smallGraceTabNotes = true;
        api.updateSettings();
        apiRef.current = api;

        const markReady = () => {
          if (!playerReadyRef.current || !guitarLoadedRef.current) return;
          setSoundFontProgress(1);
          setState((current) => (current === "playing" ? current : "ready"));
        };

        // Bytes of the base soundfont, kept so switching guitars can reload it first.
        let baseBytes: Promise<Uint8Array> | null = null;
        let loadId = 0;
        loadGuitarRef.current = (sound, reset) => {
          const id = ++loadId;
          guitarLoadedRef.current = false;
          setState((current) => (current === "error" ? current : "loading"));
          setSoundFontProgress(0);
          baseBytes ??= fetchBytes(BASE_SOUNDFONT, () => {});
          Promise.all([reset ? baseBytes : null, fetchBytes(sound.url, setSoundFontProgress)])
            .then(([base, guitar]) => {
              if (disposed || id !== loadId || !api) return;
              if (base) {
                api.resetSoundFonts();
                api.loadSoundFont(base, true);
              }
              api.loadSoundFont(guitar, true);
              guitarLoadedRef.current = true;
              markReady();
            })
            .catch((loadError: Error) => {
              if (disposed || id !== loadId) return;
              setError(loadError.message);
              setState("error");
            });
        };

        // alphaTab loads the base soundfont itself once its player exists; the guitar goes on top.
        let baseLoaded = false;
        api.soundFontLoaded.on(() => {
          if (baseLoaded) return;
          baseLoaded = true;
          if (guitarSoundRef.current) loadGuitarRef.current(guitarSoundRef.current, false);
        });
        api.midiLoad.on((midi) => {
          if (naturalRef.current && api) makePlaybackNatural(alphaTab, midi, api.tickCache);
        });
        api.scoreLoaded.on((score) => {
          setBarCount(score.masterBars.length);
          setTempo(score.tempo);
          setError(null);
        });
        api.playerReady.on(() => {
          if (api) api.playbackSpeed = speedRef.current;
          playerReadyRef.current = true;
          markReady();
        });
        api.playerStateChanged.on((e) => {
          setState(e.state === alphaTab.synth.PlayerState.Playing ? "playing" : "paused");
        });
        api.activeBeatsChanged.on((e) => {
          const bar = e.activeBeats[0]?.voice.bar.index;
          if (typeof bar === "number") setCurrentBar(bar);
        });
        api.error.on((e) => {
          setError(e.message ?? String(e));
          setState("error");
        });

        setReady(true);
      })
      .catch((loadError: Error) => {
        if (disposed) return;
        setError(loadError.message);
        setState("error");
      });

    return () => {
      disposed = true;
      api?.destroy();
      apiRef.current = null;
    };
  }, []);

  // Load / reload the score whenever the alphaTex changes.
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api || !tex.trim()) return;
    // alphaTab catches parse errors internally and raises them on api.error, which the
    // handler above turns into state; a successful load clears it via scoreLoaded.
    api.tex(tex);
  }, [tex, ready]);

  const playPause = useCallback(() => {
    if (playerReadyRef.current && guitarLoadedRef.current) apiRef.current?.playPause();
  }, []);

  const setGuitarSound = useCallback(
    (id: string) => {
      const sound = guitarSounds.find((candidate) => candidate.id === id);
      if (!sound || sound.id === guitarSoundRef.current?.id) return;
      apiRef.current?.stop();
      guitarSoundRef.current = sound;
      setGuitarSoundState(sound.id);
      try {
        localStorage.setItem(GUITAR_SOUND_STORAGE_KEY, sound.id);
      } catch {
        // Storage can be unavailable (private mode); the choice just won't stick.
      }
      loadGuitarRef.current(sound, true);
    },
    [guitarSounds],
  );

  const toggleNatural = useCallback(() => {
    naturalRef.current = !naturalRef.current;
    setNatural(naturalRef.current);
    // The MIDI is reshaped as it is generated, so it has to be generated again.
    apiRef.current?.loadMidiForScore();
  }, []);

  const stop = useCallback(() => {
    apiRef.current?.stop();
    setState("paused");
  }, []);

  const setSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeedState(value);
    if (apiRef.current) apiRef.current.playbackSpeed = value;
  }, []);

  const toggleMetronome = useCallback(() => {
    setMetronome((on) => {
      if (apiRef.current) apiRef.current.metronomeVolume = on ? 0 : 1;
      return !on;
    });
  }, []);

  const toggleCountIn = useCallback(() => {
    setCountIn((on) => {
      if (apiRef.current) apiRef.current.countInVolume = on ? 0 : 1;
      return !on;
    });
  }, []);

  const setLoop = useCallback((range: LoopRange | null) => {
    const api = apiRef.current;
    setLoopState(range);
    if (!api?.score) return;

    if (!range) {
      api.playbackRange = null;
      api.isLooping = false;
      return;
    }

    const bars = api.score.masterBars;
    const from = bars[Math.max(0, Math.min(range.from, bars.length - 1))];
    const to = bars[Math.max(0, Math.min(range.to, bars.length - 1))];
    api.playbackRange = {
      startTick: from.start,
      endTick: to.start + to.calculateDuration(),
    };
    api.isLooping = true;
  }, []);

  const relayout = useCallback(() => {
    apiRef.current?.render();
  }, []);

  const setZoom = useCallback((value: number) => {
    setZoomState(value);
    const api = apiRef.current;
    if (!api) return;
    api.settings.display.scale = value;
    api.updateSettings();
    api.render();
  }, []);

  return {
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
  };
}
