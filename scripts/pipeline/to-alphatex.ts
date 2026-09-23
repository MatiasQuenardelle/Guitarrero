import type { Harmonic, TabBeat, TabNote, TabScore, Tuning } from "../../src/lib/studio/types.ts";

/** Strings 1..6 of a guitar in standard tuning, as alphaTex pitches. */
export const STANDARD_TUNING: Tuning = ["e4", "b3", "g3", "d3", "a2", "e2"];

/** alphaTex has no escape for double quotes inside a metadata string. */
const quoted = (value: string) => `"${value.replace(/"/g, "'")}"`;

const HARMONIC_TOKEN: Record<Harmonic, string> = {
  natural: "nh",
  artificial: "ah",
  tap: "th",
  pinch: "ph",
  semi: "sh",
};

/**
 * Note effects belong to the note and go before the duration (`3.3{h}.8`); beat effects go
 * after it (`3.3.8{gr}`). Every token here is verified against alphaTab's own importer.
 */
function noteEffects(note: TabNote): string[] {
  const effects: string[] = [];

  if (note.hammer) effects.push("h");
  if (note.slide === "legato") effects.push("sl");
  if (note.slide === "shift") effects.push("ss");
  if (note.harmonic) {
    const token = HARMONIC_TOKEN[note.harmonic];
    // Every harmonic but the natural one takes the sounding fret as its argument.
    effects.push(token === "nh" ? token : `${token} ${note.fret + 12}`);
  }
  if (note.vibrato) effects.push("v");
  if (note.ghost) effects.push("g");
  if (note.letRing) effects.push("lr");
  if (note.palmMute) effects.push("pm");
  if (note.staccato) effects.push("st");
  if (note.accent === "normal") effects.push("ac");
  if (note.accent === "heavy") effects.push("hac");
  if (typeof note.trill === "number") effects.push(`tr ${note.trill}`);
  if (note.tap) effects.push("t");
  if (note.bend && note.bend.length > 1) effects.push(`b (${note.bend.join(" ")})`);

  return effects;
}

function beatEffects(beat: TabBeat): string[] {
  const effects: string[] = [];
  if (beat.dotted) effects.push("d");
  if (beat.grace) effects.push("gr");
  if (beat.strum === "up") effects.push("su");
  if (beat.strum === "down") effects.push("sd");
  if (beat.tuplet) effects.push(`tu ${beat.tuplet[0]} ${beat.tuplet[1]}`);
  return effects;
}

const braced = (effects: string[]) => (effects.length > 0 ? `{${effects.join(" ")}}` : "");

/** 1/64th-note resolution keeps every duration, dot and tuplet an integer. */
const UNITS_PER_QUARTER = 16;
const REST_DURATIONS = [1, 2, 4, 8, 16, 32];

function beatUnits(beat: TabBeat): number {
  // A grace note is stolen from its neighbour: alphaTab gives it no time of its own, so
  // counting it made the Turkish March's ornamented bars overfull and squeezed into 17:16.
  if (beat.grace) return 0;
  const base = (4 / beat.duration) * UNITS_PER_QUARTER;
  const tuplet = beat.tuplet ? beat.tuplet[1] / beat.tuplet[0] : 1;
  return base * (beat.dotted ? 1.5 : 1) * tuplet;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * A bar holding more than its time signature allows doesn't stretch: alphaTab starts the
 * next bar at its fixed tick, so the overflowing notes collide with it and playback appears
 * to skip them. Rather than lose notes to a misread duration, squeeze the whole bar into
 * place as one tuplet (every note still sounds, slightly quicker) and pad a short bar with
 * rests. Bars that already carry tuplets are left alone — the ratio is the model's there.
 *
 * A short opening bar is a pickup, which leads straight into bar two, so its rests go in
 * front: padded at the end, La Paloma's eighth-note pickup was followed by a 1.5 s silence.
 */
function fitBarToSignature(beats: TabBeat[], capacityUnits: number, pickup = false): TabBeat[] {
  if (beats.length === 0) return beats;

  const actual = beats.reduce((total, beat) => total + beatUnits(beat), 0);
  if (Math.abs(actual - capacityUnits) < 1) return beats;

  if (actual > capacityUnits) {
    if (beats.some((beat) => beat.tuplet)) return beats;
    const divisor = gcd(Math.round(actual), capacityUnits);
    const count = Math.round(actual) / divisor;
    const space = capacityUnits / divisor;
    // alphaTab stores these as small integers; an extreme ratio means something else is wrong.
    if (count > 999 || space > 999) return beats;
    return beats.map((beat) => (beat.grace ? beat : { ...beat, tuplet: [count, space] as [number, number] }));
  }

  const rests: TabBeat[] = [];
  let gap = capacityUnits - actual;
  for (const duration of REST_DURATIONS) {
    const units = (4 / duration) * UNITS_PER_QUARTER;
    while (gap >= units - 0.001) {
      rests.push({ duration, rest: true, notes: [] });
      gap -= units;
    }
  }
  return pickup ? [...rests, ...beats] : [...beats, ...rests];
}

function renderNote(note: TabNote): string {
  const fret = note.tie ? "-" : note.dead ? "x" : String(note.fret);
  return `${fret}.${note.string}${braced(noteEffects(note))}`;
}

function renderBeat(beat: TabBeat): string {
  const tail = `.${beat.duration}${braced(beatEffects(beat))}`;

  if (beat.rest || beat.notes.length === 0) return `r${tail}`;
  if (beat.notes.length === 1) return `${renderNote(beat.notes[0])}${tail}`;
  return `(${beat.notes.map(renderNote).join(" ")})${tail}`;
}

/**
 * Deterministic JSON -> alphaTex. Generating the notation ourselves (rather than asking
 * the model for alphaTex) keeps syntax errors out of the file entirely.
 */
export function toAlphaTex(score: TabScore): string {
  const lines: string[] = [];

  lines.push(`\\title ${quoted(score.title || "Untitled")}`);
  if (score.composer) lines.push(`\\subtitle ${quoted(score.composer)}`);
  lines.push(`\\tempo ${Math.round(score.tempo) || 90}`);
  lines.push(".");
  lines.push("");
  lines.push('\\track "Guitar"');
  const tuning = score.tuning ?? STANDARD_TUNING;
  lines.push(`\\staff{score tabs} \\tuning ${tuning.join(" ")} \\instrument 24`);
  lines.push("");

  let currentTs = score.timeSignature;
  lines.push(`\\ts ${currentTs[0]} ${currentTs[1]}`);
  let currentTempo = Math.round(score.tempo) || 90;

  for (const bar of score.bars) {
    const directives: string[] = [];
    if (
      bar.timeSignature &&
      (bar.timeSignature[0] !== currentTs[0] || bar.timeSignature[1] !== currentTs[1])
    ) {
      currentTs = bar.timeSignature;
      directives.push(`\\ts ${currentTs[0]} ${currentTs[1]}`);
    }
    if (bar.tempo && Math.round(bar.tempo) !== currentTempo) {
      currentTempo = Math.round(bar.tempo);
      directives.push(`\\tempo ${currentTempo}`);
    }

    const capacityUnits = (currentTs[0] / currentTs[1]) * 4 * UNITS_PER_QUARTER;
    const beats = fitBarToSignature(bar.beats, capacityUnits, bar === score.bars[0]).map(renderBeat).join(" ");
    lines.push(`${directives.length ? `${directives.join(" ")} ` : ""}${beats} |`);
  }

  return `${lines.join("\n")}\n`;
}
