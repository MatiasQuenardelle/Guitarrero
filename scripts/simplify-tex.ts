/**
 * Makes an easier version of a published score, keeping its fingerings:
 *   - the grid becomes straight eighths: runs and tuplets keep one note per eighth
 *   - melody notes (top of a chord, or a single note on the 1st string) stay on every eighth
 *   - the accompaniment only sounds on the beat (quarter notes), not on every eighth
 *   - chords shrink to bass + melody (three notes when the original had four or more)
 *   - grace notes are dropped
 * Every kept note comes from the same beat of the original, so no new stretches appear.
 *
 *   node scripts/simplify-tex.ts <in.alphatex> <out.alphatex> [--title "..."] [--tempo 80]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const alphaTab = require("@coderline/alphatab");

type Note = { string: number; fret: number; realValue: number };
type Beat = { isRest: boolean; graceType: number; playbackStart: number; notes: Note[] };
type Bar = { voices: { beats: Beat[] }[]; masterBar: { timeSignatureNumerator: number; timeSignatureDenominator: number; calculateDuration(): number } };

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/simplify-tex.ts <in.alphatex> <out.alphatex> [--title "..."] [--tempo N]');
  process.exit(1);
}
const flag = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const importer = new alphaTab.importer.AlphaTexImporter();
importer.initFromString(fs.readFileSync(input, "utf8"), new alphaTab.Settings());
const score = importer.readScore();
const staff = score.tracks[0].staves[0];
const tuning: number[] = staff.stringTuning.tunings; // high string first
const EIGHTH = 480;

/** alphaTex string number: 1 = high e. The model counts from the low string. */
const texString = (note: Note) => staff.tuning.length + 1 - note.string;
const texNote = (note: Note) => `${note.fret}.${texString(note)}`;

/** Eighths → alphaTex durations, longest first; a remainder is written as rests. */
const CHUNKS: [number, string][] = [
  [12, "1{d}"],
  [8, "1"],
  [6, "2{d}"],
  [4, "2"],
  [3, "4{d}"],
  [2, "4"],
  [1, "8"],
];
function durations(eighths: number): string[] {
  const out: string[] = [];
  for (const [size, value] of CHUNKS) {
    while (eighths >= size) {
      out.push(value);
      eighths -= size;
    }
  }
  return out;
}

/** The melody note of a beat, or null when the beat is only accompaniment. */
function melodyOf(notes: Note[], previous: number | null): Note | null {
  const top = notes.reduce((a, b) => (b.realValue > a.realValue ? b : a));
  if (notes.length > 1 || texString(top) === 1) return top;
  // A lone note on the 2nd string continues the melody when it steps down (at most a major
  // third) straight from a melody note; after accompaniment it is part of the broken chord.
  if (texString(top) === 2 && previous !== null && top.realValue >= previous - 4) return top;
  return null;
}

/** Bass + melody, with a third voice kept only where the original stacked four or more. */
function reduceChord(notes: Note[]): Note[] {
  const sorted = [...notes].sort((a, b) => a.realValue - b.realValue);
  if (sorted.length === 1) return sorted;
  const kept = [sorted[0], sorted[sorted.length - 1]];
  if (sorted.length >= 4) kept.splice(1, 0, sorted[sorted.length - 2]);
  return kept;
}

const lines: string[] = [];
let lastTs = "";
/** Melody pitch of the last eighth that sounded, or null when it was accompaniment. */
let previousMelody: number | null = null;
staff.bars.forEach((bar: Bar, barIndex: number) => {
  const master = bar.masterBar;
  const slots = Math.round(master.calculateDuration() / EIGHTH);
  const perHalf = slots % 2 === 0 ? slots / 2 : slots;
  const events: (Note[] | null)[] = Array(slots).fill(null);

  const beats = bar.voices[0].beats.filter((beat) => beat.graceType === 0 && !beat.isRest);
  // The first real beat starting inside each eighth stands for that eighth.
  const bySlot: (Note[] | null)[] = Array(slots).fill(null);
  const perSlot = Array(slots).fill(0);
  for (const beat of beats) {
    const slot = Math.min(slots - 1, Math.floor(beat.playbackStart / EIGHTH));
    perSlot[slot]++;
    bySlot[slot] ??= beat.notes;
  }

  const melody: (Note | null)[] = bySlot.map(() => null);
  for (let slot = 0; slot < slots; slot++) {
    const notes = bySlot[slot];
    if (!notes) continue;
    // A slot holding several beats is part of a run: the run is the melody, keep it whole.
    melody[slot] = perSlot[slot] > 1 ? notes[notes.length - 1] : melodyOf(notes, previousMelody);
    previousMelody = melody[slot]?.realValue ?? null;
  }

  const accompaniment = new Set<number>(); // pitches already sounding in this half bar
  for (let slot = 0; slot < slots; slot++) {
    const notes = bySlot[slot];
    if (slot % perHalf === 0) accompaniment.clear();
    if (!notes) continue;
    const halfStart = slot % perHalf === 0;
    const onPulse = (slot % perHalf) % 2 === 0;
    if (perSlot[slot] > 1 || halfStart) {
      events[slot] = reduceChord(notes);
    } else if (onPulse && !melody[slot]) {
      // Accompaniment on the beat: choose from this eighth and the next one, preferring a
      // pitch not heard yet in this half bar, then the higher, so a broken chord keeps its
      // shape (C G C E C G → C E C; C G C G C G → C C' G) instead of repeating one note.
      const next = slot + 1 < slots && !melody[slot + 1] && bySlot[slot + 1]?.length === 1 ? bySlot[slot + 1]! : [];
      const candidates = [...notes, ...next];
      const fresh = candidates.filter((note) => !accompaniment.has(note.realValue));
      const pool = fresh.length ? fresh : candidates;
      events[slot] = [pool.reduce((a, b) => (b.realValue > a.realValue ? b : a))];
    } else if (onPulse) {
      events[slot] = reduceChord(notes);
    } else if (melody[slot]) {
      // Between beats only the melody moves, but a bass note there (5th/6th string) is a
      // harmony change the ear misses, so it stays.
      const bottom = notes.reduce((a, b) => (b.realValue < a.realValue ? b : a));
      events[slot] = bottom !== melody[slot] && texString(bottom) >= 5 ? [bottom, melody[slot]!] : [melody[slot]!];
    }
    for (const note of events[slot] ?? []) accompaniment.add(note.realValue);
  }

  const tokens: string[] = [];
  const ts = `${master.timeSignatureNumerator} ${master.timeSignatureDenominator}`;
  if (ts !== lastTs) {
    tokens.push(`\\ts ${ts}`);
    lastTs = ts;
  }
  let slot = 0;
  while (slot < slots) {
    let next = slot + 1;
    while (next < slots && !events[next]) next++;
    const notes = events[slot];
    const parts = durations(next - slot);
    parts.forEach((duration, i) => {
      if (i === 0 && notes) {
        const body = notes.length === 1 ? texNote(notes[0]) : `(${notes.map(texNote).join(" ")})`;
        tokens.push(`${body}.${duration}`);
      } else {
        tokens.push(`r.${duration}`);
      }
    });
    slot = next;
  }
  lines.push(`${tokens.join(" ")} |`);
  void barIndex;
});

const title = flag("--title") ?? `${score.title} (easy)`;
const tempo = flag("--tempo") ?? String(score.tempo);
const tuningTex = tuning.map((value) => alphaTab.model.Tuning.getTextForTuning(value, true).toLowerCase());

const tex = [
  `\\title "${title}"`,
  `\\tempo ${tempo}`,
  ".",
  "",
  '\\track "Guitar"',
  `\\staff{score tabs} \\tuning ${tuningTex.join(" ")} \\instrument ${score.tracks[0].playbackInfo.program}`,
  "",
  ...lines,
  "",
].join("\n");
fs.writeFileSync(output, tex);
console.log(`✓ ${output}  ${lines.length} bars`);
