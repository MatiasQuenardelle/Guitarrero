import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { barFits, barLength } from "../../src/lib/studio/lint.ts";
import { projectFile } from "../../src/lib/studio/paths.ts";
import type {
  FrameInfo,
  Harmonic,
  TabBar,
  TabBeat,
  TabNote,
  TabScore,
  Tuning,
} from "../../src/lib/studio/types.ts";
import { askClaudeJson } from "./claude-cli.ts";
import { readBarNumbers } from "./bar-numbers.ts";
import { readScoreHeader } from "./score-header.ts";
import { STANDARD_TUNING } from "./to-alphatex.ts";

const VALID_DURATIONS = new Set([1, 2, 4, 8, 16, 32, 64]);
const HARMONICS = new Set<string>(["natural", "artificial", "tap", "pinch", "semi"]);
/**
 * Frames per call. The model's deliberation is mostly a fixed cost per call, so spreading it
 * over more frames is what makes a batch cheap. Measured on the Chopin frames at medium
 * effort: 3 frames $0.45 (1.67 bars read per frame), 6 frames $0.55 (1.67), 12 frames $1.03
 * (1.25 — it starts skipping bars). Six is where it stops paying off.
 */
// 3 through Read: each page is a turn and re-sends the ones before it, and the good tabs were read 3 at a time.
const BATCH_SIZE = Number(process.env.GUITARRERO_BATCH ?? 3);
/** Batches are independent, so they run concurrently — one call takes minutes on Opus. */
const CONCURRENCY = Number(process.env.GUITARRERO_CONCURRENCY ?? 4);

/** Runs `fn` over `items` with at most `limit` in flight, preserving input order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let index = next++; index < items.length; index = next++) {
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

interface BatchReply {
  bars?: unknown[];
}

/** Semitones above C for each note name, so a retuned string can be placed in an octave. */
const PITCH_CLASS: Record<string, number> = {
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
};

/**
 * Turns {"6": "D"} into a full six-string tuning. The octave isn't given, so each retuned
 * string takes the octave that puts it closest to its standard pitch — "6th=D" means the low
 * E dropped a tone, never that it jumped an octave.
 */
function coerceTuning(raw: Record<string, string> | undefined): Tuning | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const tuning = [...STANDARD_TUNING] as Tuning;
  let changed = false;

  for (const [key, value] of Object.entries(raw)) {
    const string = Number(key);
    if (!Number.isInteger(string) || string < 1 || string > 6) continue;

    const match = String(value).trim().toLowerCase().match(/^([a-g])([#b]?)$/);
    if (!match) continue;
    const [, letter, accidental] = match;
    const semitone =
      PITCH_CLASS[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);

    const standard = STANDARD_TUNING[string - 1];
    const standardOctave = Number(standard.slice(-1));
    const standardSemitone =
      PITCH_CLASS[standard[0]] + (standard[1] === "#" ? 1 : 0) + standardOctave * 12;

    let best = standard;
    let bestDistance = Infinity;
    for (const octave of [standardOctave - 1, standardOctave, standardOctave + 1]) {
      const distance = Math.abs(semitone + octave * 12 - standardSemitone);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = `${letter}${accidental}${octave}`;
      }
    }

    if (best !== standard) changed = true;
    tuning[string - 1] = best;
  }

  return changed ? tuning : undefined;
}

/**
 * Everything that never varies between calls lives here, so it is byte-identical on every
 * batch and the per-call prompt stays tiny. Bump PROMPT_VERSION whenever this text changes:
 * it keys the on-disk cache.
 */
const PROMPT_VERSION = 5;
/** Readings made with these prompts are still used when the current version has none. */
const LEGACY_PROMPT_VERSIONS = [4];

const TRANSCRIBE_SYSTEM = `You transcribe guitar tablature from screenshots into JSON.

Transcribe every bar of tablature you can read, left to right, top to bottom. Accuracy and
detail matter more than speed: zoom in mentally on each bar and account for every marking.

Basics:
- String 1 is the TOP line of the tab staff (high E), string 6 is the BOTTOM line (low E).
- Numbers stacked vertically at the same horizontal position are one beat (a chord).
- Durations: 1 = whole, 2 = half, 4 = quarter, 8 = eighth, 16 = sixteenth, 32 = thirty-second.
- The standard notation staff above the tab is the authority on rhythm, ties, dots and
  rests — read it together with the tab, not instead of it.
- Two noteheads are ONE beat only when they sit at the SAME horizontal position on the page.
  Noteheads a visible distance apart are separate beats even when one beam runs across them —
  a beam groups notes that follow each other, it does not stack them. Check the horizontal
  position before combining anything.
- If two voices are notated (stems up and stems down), merge them into one beat only under
  that same rule: same horizontal position, same beat.
- Every bar must add up to its time signature. If it doesn't, you misread a duration.
- A bar has the same time signature as the one before it. Only report a different one where
  the score actually prints a new time signature on the staff.
- TUPLETS: a bracket over a group of notes with a number ("3", "5", "11:12", "22:24") means
  that many notes are played in the time of the printed value. Put "tuplet": [count, space]
  on EVERY beat of the group — [3, 2] for a plain triplet bracket marked "3", [11, 12] for
  one marked "11:12". These groups are the most common reason a bar doesn't add up.
- Mark rests as {"duration": 4, "rest": true, "notes": []}.
- "frame" is which attached screenshot (1-based, in the order they were attached) the bar came from.
- Work through the screenshots one at a time, in the order they are attached, and answer for
  every one of them. Any screenshot showing tablature must produce at least one bar; do not
  stop early or leave the later ones unread.
- Ignore intros, talking heads, chord charts, watermarks and any frame with no tablature.
- Never invent bars you cannot actually see. Fewer correct bars is better than guesses.

Playing techniques — include these whenever the notation shows them, on the note they
start from. Mark a technique only when you can actually see its marking:
- Slur (curved line) between two different frets on one string, or an "H"/"P" letter:
  "hammer": true on the FIRST of the two notes.
- "/" or "\\" or a straight line between two numbers: "slide": "legato" when a slur joins
  them, otherwise "shift".
- Diamond note heads, angle brackets like <12>, "harm.", "N.H.", "A.H.", "Arm.":
  "harmonic": "natural" (most common on classical guitar) | "artificial" | "tap" | "pinch" | "semi".
- Wavy line above a note: "vibrato": true.
- Number in parentheses: "ghost": true. An "x" instead of a number: "dead": true.
- "let ring", "lasciar vibrare", "L.V.", or a dashed line after a note: "letRing": true.
- "P.M." with a dashed line: "palmMute": true.
- A dot above or below a note head: "staccato": true.
- ">" above a note: "accent": "normal". "^" above a note: "accent": "heavy".
- "tr" with a wavy line: "trill": <the fret it alternates to>.
- Curved line joining two notes of the SAME pitch, or a repeated number in brackets:
  "tie": true on the second one.
- A small-size note before a beat (grace note / acciaccatura, often slurred into it): give the
  small note a beat of its OWN, placed right before the beat it leads into, e.g.
  {"duration": 16, "grace": true, "notes": [{"string": 1, "fret": 5}]}. The beat it leads
  into is an ordinary beat with its full duration — never mark that one "grace", or it loses
  its time and the small note is lost.
- An arrow or wavy vertical line through a chord: "strum": "up" | "down" on the beat.

Reply with ONLY a JSON object and nothing else, shaped like this:
{"bars": [
  {"frame": 1, "timeSignature": [3, 4], "beats": [
    {"duration": 8, "notes": [{"string": 3, "fret": 2, "hammer": true}]},
    {"duration": 8, "notes": [{"string": 1, "fret": 0}, {"string": 2, "fret": 1, "letRing": true}]},
    {"duration": 4, "notes": [{"string": 1, "fret": 12, "harmonic": "natural"}]}
  ]}
]}`;

/**
 * The per-call prompt: only what changes between batches. The attached images arrive in the
 * same order as this list, one per entry, so "frame" indexes into it.
 */
function buildPrompt(
  batch: FrameInfo[],
  timeSignature?: [number, number],
  hints: string[] = [],
  numbered = false,
): string {
  const list = batch
    .map((frame, i) => `${i + 1}. video time ${frame.time.toFixed(1)}s`)
    .join("\n");

  // Nothing here may look like an answer: an earlier version ended with "Batch 7." and the
  // model started numbering bars from it instead of reading the page.
  const known = timeSignature
    ? `\n\nThe piece is in ${timeSignature[0]}/${timeSignature[1]}. Every bar is in ${timeSignature[0]}/${timeSignature[1]} unless this page prints a different time signature on the staff.`
    : "";

  // Only on a re-read: what the first attempt got wrong, so the second one isn't a coin toss.
  const again = hints.length
    ? `\n\nThese screenshots were read once before and the reading had problems:\n${hints.join("\n")}\nRead those bars note by note and check each one against the time signature.`
    : "";

  // A scrolling score: every screenshot is a window onto one long staff, overlapping the
  // next. The number printed at each barline is the only thing that says which bar is which.
  const windows = numbered
    ? `\n\nThis score scrolls sideways, so each screenshot is a window onto one long staff and consecutive screenshots overlap. A small bar number is printed above the barline each bar starts at. Give every bar a "number": the one printed at its start — read it off the page, never count or infer it. Only the opening bar of the piece, right after the clef and time signature, prints none: it is 1. The window cuts through the bars at its left and right edges; skip a bar that is cut off, because a neighbouring screenshot shows it whole. Transcribe every complete bar of every screenshot, including bars an earlier screenshot also showed.`
    : "";

  // The screenshots have had the tab's string numbers drawn beside its six lines.
  const labelled = process.env.GUITARRERO_LABELLED === "1"
    ? `

The red numbers 1-6 at the left and right edge of every screenshot label the six tab lines with their string number. For each fret number, follow its line out to the edge and take the string from the red label — do not count lines.`
    : "";

  return `The ${batch.length} attached screenshots are pages of one piece, in this order:
${list}${known}${windows}${labelled}${again}

Transcribe all ${batch.length} of them.`;
}

function coerceNote(raw: unknown): TabNote | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const string = Number(value.string);
  const fret = Number(value.fret);
  if (!Number.isInteger(string) || string < 1 || string > 6) return null;
  if (!Number.isInteger(fret) || fret < 0 || fret > 24) return null;

  const note: TabNote = { string, fret };
  if (value.tie === true) note.tie = true;
  if (value.dead === true) note.dead = true;
  if (value.hammer === true) note.hammer = true;
  if (value.slide === "legato" || value.slide === "shift") note.slide = value.slide;
  if (HARMONICS.has(value.harmonic as string)) note.harmonic = value.harmonic as Harmonic;
  if (value.vibrato === true) note.vibrato = true;
  if (value.ghost === true) note.ghost = true;
  if (value.letRing === true) note.letRing = true;
  if (value.palmMute === true) note.palmMute = true;
  if (value.staccato === true) note.staccato = true;
  if (value.accent === "normal" || value.accent === "heavy") note.accent = value.accent;
  if (value.tap === true) note.tap = true;

  const trill = Number(value.trill);
  if (Number.isInteger(trill) && trill >= 0 && trill <= 24) note.trill = trill;

  if (Array.isArray(value.bend) && value.bend.length > 1) {
    const bend = value.bend.map(Number).filter((v) => Number.isFinite(v) && v >= 0 && v <= 16);
    if (bend.length > 1) note.bend = bend;
  }

  return note;
}

function coerceBeat(raw: unknown): TabBeat | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const duration = Number(value.duration);
  if (!VALID_DURATIONS.has(duration)) return null;

  const notes = Array.isArray(value.notes)
    ? value.notes.map(coerceNote).filter((n): n is TabNote => n !== null)
    : [];
  const rest = value.rest === true || notes.length === 0;

  const beat: TabBeat = { duration, notes: rest ? [] : notes };
  if (value.dotted === true) beat.dotted = true;
  if (value.grace === true) beat.grace = true;
  if (value.strum === "up" || value.strum === "down") beat.strum = value.strum;

  const tuplet = value.tuplet;
  if (Array.isArray(tuplet) && tuplet.length === 2) {
    const [count, space] = tuplet.map(Number);
    if (Number.isInteger(count) && count > 1 && Number.isInteger(space) && space > 0) {
      beat.tuplet = [count, space];
    }
  }
  if (rest) beat.rest = true;
  return beat;
}

function coerceBar(raw: unknown): TabBar | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const beats = Array.isArray(value.beats)
    ? value.beats.map(coerceBeat).filter((b): b is TabBeat => b !== null)
    : [];
  if (beats.length === 0) return null;

  const bar: TabBar = { beats };
  const ts = value.timeSignature;
  if (Array.isArray(ts) && ts.length === 2 && Number(ts[0]) > 0 && Number(ts[1]) > 0) {
    bar.timeSignature = [Number(ts[0]), Number(ts[1])];
  }
  if (Number(value.tempo) > 0) bar.tempo = Number(value.tempo);
  const number = Number(value.number);
  if (Number.isInteger(number) && number >= 1) bar.number = number;
  return bar;
}

/**
 * Readings are cached per screenshot, not per call, keyed on what the model actually sees:
 * the frame's content hash plus the model, effort and prompt it was read with. Batches are
 * made up from whatever is left unread, so dropping a frame, adding one or moving the start
 * of the video only pays for pixels that are new — keyed per batch, removing one frame
 * shifted every batch after it and re-billed the whole piece.
 */
type FrameCache = Record<string, unknown[]>;

function cacheKey(frame: FrameInfo, version = PROMPT_VERSION): string {
  const parts = [
    process.env.GUITARRERO_MODEL ?? "opus",
    process.env.GUITARRERO_EFFORT ?? "medium",
    // "mention" was the default when the earlier caches were written, so it stays unkeyed.
    ...((process.env.GUITARRERO_ATTACH ?? "read") !== "mention"
      ? [process.env.GUITARRERO_ATTACH ?? "read"]
      : []),
    `v${version}`,
    frame.hash ?? frame.file,
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function readCache(id: string): FrameCache {
  try {
    return JSON.parse(fs.readFileSync(projectFile.transcribeCache(id), "utf8"));
  } catch {
    return {};
  }
}

function writeCache(id: string, cache: FrameCache): void {
  fs.mkdirSync(path.dirname(projectFile.transcribeCache(id)), { recursive: true });
  fs.writeFileSync(projectFile.transcribeCache(id), JSON.stringify(cache, null, 2));
}

/**
 * Splits one reply into the bars of each screenshot of its batch. A bar whose "frame" is
 * missing or out of range stays with the screenshot of the bar before it.
 */
function barsPerFrame(reply: BatchReply, size: number): unknown[][] {
  const perFrame = Array.from({ length: size }, () => [] as unknown[]);
  let current = 0;
  for (const raw of Array.isArray(reply.bars) ? reply.bars : []) {
    const frame = Number((raw as { frame?: unknown } | null)?.frame);
    if (Number.isInteger(frame) && frame >= 1 && frame <= size) current = frame - 1;
    perFrame[current].push(raw);
  }
  return perFrame;
}

interface ReadOptions {
  timeSignature?: [number, number];
  /** Read these again even though a reading is cached, with a note on what was wrong. */
  reread?: Map<number, string>;
  /** A scrolling score with printed bar numbers: ask for each bar's number (see buildPrompt). */
  numbered?: boolean;
  onProgress?: (done: number, total: number) => void;
}

/** The bars read off each screenshot, by the screenshot's index in the project. */
type Readings = Map<number, TabBar[]>;

/**
 * Reads the screenshots at `indices`, from the cache where it can and from the model in
 * batches where it can't. The cache is saved after every call, so an interrupted run keeps
 * everything it has paid for.
 */
async function readFrames(
  id: string,
  cwd: string,
  frames: FrameInfo[],
  indices: number[],
  cache: FrameCache,
  options: ReadOptions = {},
): Promise<Readings> {
  const { timeSignature, reread, numbered, onProgress } = options;
  // A second reading is cached beside the first, not over it: transcribe() decides which one
  // is kept, and asking for the same repair twice must not be billed twice.
  const suffix = (i: number) => (numbered ? ":numbered" : "") + (reread?.has(i) ? ":again" : "");
  const keyOf = (i: number) => cacheKey(frames[i]) + suffix(i);
  // A prompt change bumps the version; a reading from the version before is still worth more
  // than a re-read of the whole piece, so it is carried over unless deleted on purpose.
  let inherited = 0;
  for (const i of indices) {
    if (cache[keyOf(i)]) continue;
    for (const version of LEGACY_PROMPT_VERSIONS) {
      const legacy = cache[cacheKey(frames[i], version) + suffix(i)];
      if (legacy) {
        cache[keyOf(i)] = legacy;
        inherited++;
        break;
      }
    }
  }
  if (inherited > 0) console.log(`  ${inherited} reading(s) inherited from prompt v${LEGACY_PROMPT_VERSIONS[0]}`);
  const unread = indices.filter((i) => !cache[keyOf(i)]);

  const batches: number[][] = [];
  for (let i = 0; i < unread.length; i += BATCH_SIZE) batches.push(unread.slice(i, i + BATCH_SIZE));

  if (unread.length < indices.length) {
    console.log(`  ${indices.length - unread.length}/${indices.length} screenshots served from cache`);
  }

  let done = 0;
  await mapPool(batches, CONCURRENCY, async (batch, index) => {
    const batchFrames = batch.map((i) => frames[i]);
    const hints = batch.flatMap((i, at) => {
      const hint = reread?.get(i);
      return hint ? [`- screenshot ${at + 1}: ${hint}`] : [];
    });

    try {
      const reply = await askClaudeJson<BatchReply>(buildPrompt(batchFrames, timeSignature, hints, numbered), {
        cwd,
        system: TRANSCRIBE_SYSTEM,
        images: batchFrames.map((frame) => projectFile.frame(id, frame.file)),
      });
      barsPerFrame(reply, batch.length).forEach((raw, at) => {
        cache[keyOf(batch[at])] = raw;
      });
      writeCache(id, cache);
    } catch (error) {
      console.log(`  batch ${index + 1} failed: ${(error as Error).message}`);
    } finally {
      done++;
      console.log(`  ${done}/${batches.length} batches read`);
      onProgress?.(done, batches.length);
    }
  });
  if (batches.length === 0) onProgress?.(1, 1);

  const readings: Readings = new Map();
  for (const i of indices) {
    const raw = cache[keyOf(i)];
    if (raw) readings.set(i, raw.map(coerceBar).filter((bar): bar is TabBar => bar !== null));
  }
  return readings;
}

/** Every bar read, in screenshot order, tagged with the screenshot it came from. */
function flatten(readings: Readings): TabBar[] {
  return [...readings.keys()]
    .sort((a, b) => a - b)
    .flatMap((index) => (readings.get(index) ?? []).map((bar) => ({ ...bar, frame: index })));
}

const signatureOf = (bar: TabBar, fallback: [number, number]) => bar.timeSignature ?? fallback;

/** How many of a screenshot's bars add up: the one measure of a reading that needs no model. */
function soundBars(bars: TabBar[], fallback: [number, number]): number {
  return bars.filter((bar) => barFits(bar, signatureOf(bar, fallback))).length;
}

/**
 * What to tell the model about each screenshot holding a bar that doesn't add up. Naming the
 * bar and the size of the miss is what makes a second read better than a second guess.
 */
function framesWithBadBars(readings: Readings, fallback: [number, number]): Map<number, string> {
  const hints = new Map<number, string>();
  for (const [index, bars] of readings) {
    const notes = bars.flatMap((bar, at) => {
      const [numerator, denominator] = signatureOf(bar, fallback);
      if (barFits(bar, [numerator, denominator])) return [];
      const unit = 4 / denominator;
      return [
        `bar ${at + 1} of ${bars.length} from the left added up to ` +
          `${Number((barLength(bar) / unit).toFixed(2))}/${denominator} instead of ${numerator}/${denominator}`,
      ];
    });
    if (notes.length > 0) hints.set(index, `${notes.join("; ")}.`);
  }
  return hints;
}

/**
 * The screenshots to go back to for the bars the score is missing.
 *
 * A batch can quietly under-read: on the Clair de Lune lesson one six-frame call answered for
 * only its last two screenshots, losing bars 36-44 without any error, and other pages gave up
 * two of their three bars. That is invisible until the printed bar numbers give something to
 * check against. A missing bar belongs to the screenshot with the highest printed number at
 * or below it — the page that bar was engraved on — so that is the one worth reading again.
 */
function framesForMissingBars(
  numbers: (number | null)[],
  bars: TabBar[],
): number[] {
  const have = new Set<number>();
  for (const bar of bars) if (bar.number !== undefined) have.add(bar.number);
  if (have.size === 0) return [];

  const printed = numbers
    .map((number, index) => ({ number, index }))
    .filter((entry): entry is { number: number; index: number } => entry.number !== null)
    .sort((a, b) => a.number - b.number);
  if (printed.length === 0) return [];

  const first = printed[0].number;
  const last = Math.max(...have);

  const wanted = new Set<number>();
  for (let bar = first; bar <= last; bar++) {
    if (have.has(bar)) continue;
    // The last page whose printed number is at or below this bar is the page it sits on.
    let page = printed[0];
    for (const entry of printed) {
      if (entry.number > bar) break;
      page = entry;
    }
    wanted.add(page.index);
  }

  return [...wanted].sort((a, b) => a - b);
}

/** Scrolled less than this fraction of the width: the same view as the frame before. */
const SAME_VIEW = 0.15;

/**
 * The views to go back to for bars a numbered scrolling score is missing: the ones that read
 * a bar next to the gap, since a window a few bars wide that shows bar 14 or 16 shows 15 too.
 */
function viewsForMissingBars(readings: Readings, bars: TabBar[]): Map<number, string> {
  const have = new Set(bars.flatMap((bar) => (bar.number === undefined ? [] : [bar.number])));
  const wanted = new Map<number, number[]>();
  if (have.size === 0) return new Map();
  for (let n = 1; n <= Math.max(...have); n++) {
    if (have.has(n)) continue;
    for (const [index, read] of readings) {
      if (read.some((bar) => bar.number === n - 1 || bar.number === n + 1)) {
        wanted.set(index, [...(wanted.get(index) ?? []), n]);
      }
    }
  }
  return new Map(
    [...wanted].map(([index, missing]) => [
      index,
      `bar ${missing.join(" and bar ")} should be on this screenshot or the next but never came back — transcribe every complete bar you can see, with its printed number.`,
    ]),
  );
}

/**
 * Assembles a scrolling score whose bars were each read with their printed number. Windows
 * overlap, so most bars come back two or three times: the reading that adds up wins, then the
 * fuller one. Gaps are reported by number — `--fill-gaps` goes back for exactly those.
 */
function mergeNumbered(bars: TabBar[], timeSignature: [number, number]): TabBar[] {
  const fits = (bar: TabBar) => barFits(bar, signatureOf(bar, timeSignature));
  const byNumber = new Map<number, TabBar>();
  let repeats = 0;
  let unnumbered = 0;

  for (const bar of bars) {
    if (bar.number === undefined) {
      unnumbered++;
      continue;
    }
    const held = byNumber.get(bar.number);
    if (!held) {
      byNumber.set(bar.number, bar);
      continue;
    }
    repeats++;
    const fuller = barTokens(bar).length - barTokens(held).length;
    if (fits(bar) !== fits(held) ? fits(bar) : fuller > 0) byNumber.set(bar.number, bar);
  }

  const placed = [...byNumber.keys()].sort((a, b) => a - b);
  const missing: number[] = [];
  for (let n = 1; n < (placed[placed.length - 1] ?? 0); n++) if (!byNumber.has(n)) missing.push(n);
  console.log(
    `  bars ${placed[0]}-${placed[placed.length - 1]} by printed number: ` +
      `${repeats} repeated reading(s) merged` +
      (missing.length ? `, MISSING ${missing.join(", ")}` : ", no gaps") +
      (unnumbered ? `, ${unnumbered} unnumbered fragment(s) dropped` : ""),
  );
  return placed.map((n) => byNumber.get(n) as TabBar);
}

export async function transcribe(
  id: string,
  frames: FrameInfo[],
  cwd: string,
  onProgress?: (done: number, total: number) => void,
): Promise<TabScore> {
  const indices = frames.map((_, i) => i);

  // The heading first: it costs pennies and it tells the transcriber what time signature to
  // expect, as well as carrying the tempo's note value, which no other pass knows.
  const printed = await readScoreHeader(id, frames, cwd);

  const score: TabScore = { title: "", tempo: 90, timeSignature: [4, 4], bars: [] };
  if (printed.title) score.title = printed.title;
  if (printed.composer) score.composer = printed.composer;
  if (printed.tempo) score.tempo = printed.tempo;
  if (printed.timeSignature) score.timeSignature = printed.timeSignature;

  const tuning = coerceTuning(printed.tuning);
  if (tuning) {
    score.tuning = tuning;
    console.log(`  tuning ${tuning.join(" ")}`);
  }

  const numbers = await readBarNumbers(id, frames, cwd);

  // A scrolling video slides one long staff past the window, so a screenshot starts mid-bar
  // and the number "at its left edge" belongs to a bar further in: numbering from it misplaced
  // 53 of the Chopin nocturne's bars, and stitching by content still left 18 duplicates,
  // because music repeats. Where such a score prints numbers, each bar is read with its own.
  const scrolling = frames.filter((frame) => frame.scroll !== undefined).length > frames.length / 2;
  // EXPERIMENTAL, off by default: it fixed the bar count (70 of 70 on the Chopin) but the longer
  // prompt wrecked string placement — 0 of 16 bars agreed with the trusted tab, against 5 of 10
  // for the plain prompt on the same pages — and Matías reverted the result as "terrible".
  const numbered =
    process.env.GUITARRERO_NUMBERED === "1" &&
    scrolling &&
    numbers.filter((n) => n !== null).length >= frames.length / 3;
  const merge = (readings: Readings) =>
    numbered
      ? mergeNumbered(flatten(readings), score.timeSignature)
      : mergeBars(flatten(readings), numbers, score.timeSignature, frames);

  // The view of a scrolling score holds still while the cursor crosses it, then jumps on:
  // a frame that has barely moved is the same view again and adds nothing but cost.
  const views = numbered
    ? indices.filter((i) => !((frames[i].scroll ?? 1) < SAME_VIEW))
    : indices;
  if (numbered) console.log(`  scrolling score with printed bar numbers: ${views.length} views`);

  const cache = readCache(id);
  const readings = await readFrames(id, cwd, frames, views, cache, {
    timeSignature: printed.timeSignature,
    numbered,
    onProgress,
  });

  score.bars = merge(readings);

  // Second, much smaller passes over only the screenshots that came out wrong. Opt-in,
  // because they are the one place the pipeline would spend money without being asked.
  const reread = new Map<number, string>();
  if (process.env.GUITARRERO_REPAIR === "1") {
    // Only where the bad bar reached the score: one that another screenshot already read
    // correctly has been replaced in the merge and is not worth paying for.
    const inScore = new Set(
      score.bars
        .filter((bar) => !barFits(bar, signatureOf(bar, score.timeSignature)))
        .map((bar) => bar.frame),
    );
    for (const [index, hint] of framesWithBadBars(readings, score.timeSignature)) {
      if (inScore.has(index)) reread.set(index, hint);
    }
  }
  if (process.env.GUITARRERO_FILL_GAPS === "1") {
    const pages = numbered
      ? viewsForMissingBars(readings, score.bars)
      : new Map(
          framesForMissingBars(numbers, score.bars).map((index) => [
            index,
            `only ${readings.get(index)?.length ?? 0} bar(s) came back; bars are missing.`,
          ]),
        );
    for (const [index, hint] of pages) {
      reread.set(index, reread.has(index) ? `${reread.get(index)} Also, ${hint}` : hint);
    }
  }

  if (reread.size > 0) {
    console.log(`\n▸ Re-reading ${reread.size} screenshot(s)`);
    const again = await readFrames(id, cwd, frames, [...reread.keys()], cache, {
      timeSignature: printed.timeSignature,
      numbered,
      reread,
    });

    // A second reading replaces the first only when more of its bars add up, so a re-read
    // can never make the score worse.
    let improved = 0;
    for (const [index, bars] of again) {
      const before = readings.get(index) ?? [];
      if (numbered) {
        // Merged by number, so both readings can stand: the better reading of each bar wins.
        readings.set(index, [...before, ...bars]);
        // Kept under the first reading's key, so re-assembling without the flag keeps the fill.
        cache[`${cacheKey(frames[index])}:numbered`] = [...before, ...bars];
        if (bars.some((bar) => !before.some((held) => held.number === bar.number))) improved++;
        continue;
      }
      if (soundBars(bars, score.timeSignature) <= soundBars(before, score.timeSignature)) continue;
      readings.set(index, bars);
      cache[cacheKey(frames[index])] = bars;
      improved++;
    }
    writeCache(id, cache);
    console.log(`  ${improved}/${reread.size} re-read(s) were better and kept`);
    score.bars = merge(readings);
  }

  return score;
}

/**
 * What a bar plays, in order, as fret numbers only. Rhythm is left out because it is the
 * least reliable part of a reading, and so is the string: on the tab-only Vals Venezolano the
 * same bar came back on string 1 in one screenshot and string 2 in the next, which was enough
 * to stop two readings of it from being recognised as one bar.
 */
function barTokens(bar: TabBar): number[] {
  // Note by note rather than beat by beat: whether a bass note was stacked under the melody
  // or read as the beat before it also varies between two readings of one bar.
  return bar.beats.flatMap((beat) => beat.notes.map((note) => note.fret).sort((x, y) => x - y));
}

/**
 * Whether two readings are the same bar. A bar at the edge of a screenshot is cut off, so one
 * reading may be only the start or the end of the other, and two reads of a busy bar rarely
 * agree on every note: what is asked is that most of the shorter one appears, in order, in
 * the longer one.
 */
function sameBar(a: TabBar, b: TabBar): boolean {
  const x = barTokens(a);
  const y = barTokens(b);
  if (x.length === 0 || y.length === 0) return x.length === y.length;

  const lcs = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      lcs[i][j] = x[i - 1] === y[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }
  return lcs[x.length][y.length] / Math.min(x.length, y.length) >= 0.75;
}

/** How many bars before the end of the score a re-shown view may start. */
const REWIND = 3;

/**
 * Joins the bars of a scrolling video that prints no bar numbers.
 *
 * Each screenshot repeats the last bars of the one before it. The overlap is found by content:
 * the end of what has been assembled against the start of the new screenshot. Music repeats,
 * so more than one overlap can match — two identical bars in a row fit shifted by one as well
 * — and the scroll distance measured between the two frames picks the right one. Of two
 * readings of a bar the fuller one is kept, since the other was probably cut by the edge.
 */
export function stitchBars(bars: TabBar[], timeSignature: [number, number], frames: FrameInfo[]): TabBar[] {
  const perFrame = new Map<number, TabBar[]>();
  for (const bar of bars) {
    const index = bar.frame ?? -1;
    perFrame.set(index, [...(perFrame.get(index) ?? []), bar]);
  }

  const fits = (bar: TabBar) => barFits(bar, signatureOf(bar, timeSignature));
  const score: TabBar[] = [];
  let shared = 0;

  for (const index of [...perFrame.keys()].sort((a, b) => a - b)) {
    const next = perFrame.get(index) as TabBar[];

    const candidates: number[] = [];
    for (let k = 1; k <= Math.min(next.length, score.length); k++) {
      if (next.slice(0, k).every((bar, j) => sameBar(score[score.length - k + j], bar))) {
        candidates.push(k);
      }
    }

    let overlap = 0;
    let back = 0;
    if (candidates.length > 0) {
      const scroll = frames[index]?.scroll;
      // A frame scrolled 0.6 of its width still shares 0.4 of its bars with the last one.
      // Without a measured scroll the largest overlap wins: a one-note pickup bar "matches"
      // almost anything, and |k - Infinity| compares equal for every k.
      overlap =
        scroll === undefined
          ? Math.max(...candidates)
          : candidates.reduce((best, k) => {
              const expected = (1 - scroll) * next.length;
              return Math.abs(k - expected) < Math.abs(best - expected) ? k : best;
            });
    } else {
      // Nothing lines up with the very end. The video may have gone back a little — a view
      // shown again after an interlude, with a bar or two already read beyond it — so try the
      // frame against windows ending up to REWIND bars earlier. Every bar of the frame that
      // falls inside the score has to match, and there have to be at least two of them.
      for (let t = 1; t <= Math.min(REWIND, score.length - 1) && overlap === 0; t++) {
        const start = score.length - t;
        for (let k = Math.min(next.length, start); k >= 1; k--) {
          const inside = Math.min(next.length, k + t);
          const matches = next
            .slice(0, inside)
            .every((bar, j) => sameBar(score[start - k + j], bar));
          // One bar resembling one a few bars back proves nothing — music repeats, and a
          // first attempt at this swallowed six real bars. Two in a row is a view.
          if (matches && inside >= 2) {
            overlap = inside;
            back = t - (inside - k);
            break;
          }
        }
      }
    }

    for (let j = 0; j < overlap; j++) {
      const at = score.length - back - overlap + j;
      const held = score[at];
      const fuller = barTokens(next[j]).length - barTokens(held).length;
      if (fuller > 0 || (fuller === 0 && !fits(held) && fits(next[j]))) score[at] = next[j];
    }
    shared += overlap;
    score.push(...next.slice(overlap));
  }

  console.log(`  stitched by content: ${score.length} bars, ${shared} shared bar(s) merged`);
  return score;
}

/**
 * Puts the bars in the order the music is played and drops the readings of a bar that several
 * screenshots shared.
 *
 * Neither reading order nor video order can do this on a lesson video, which teaches sections
 * out of order. The printed bar numbers can — but only the ones from `bar-numbers.ts`, read in
 * a pass of their own. The numbers the transcriber volunteers alongside the music drift with
 * the batch index (it reported 24-35 for pages printed 4 and 10), so they are ignored here.
 *
 * A frame's bars are numbered from the number printed on it, in the order the model listed
 * them. Frames whose number could not be read keep their reading order and are left where
 * they are, so an unreadable page costs nothing more than a missed dedupe.
 */
function mergeBars(
  allBars: TabBar[],
  frameNumbers: (number | null)[],
  timeSignature: [number, number],
  frames: FrameInfo[],
): TabBar[] {
  // Engravers don't print "1" on the first bar, so the frames before the first printed number
  // are the opening of the piece. Anything unnumbered later on is genuinely unplaceable.
  let bars = allBars;
  const numbers = [...frameNumbers];
  const firstPrinted = numbers.findIndex((n) => n !== null);

  const anchored = new Map<number, TabBar>();
  const loose: TabBar[] = [];
  const seenPerFrame = new Map<number, number>();
  let repeats = 0;

  // Those opening frames can't all start at bar 1: on the Clair de Lune the second one showed
  // the same line and the model gave only the bar it hadn't transcribed yet, which counted
  // from 1 made a "repeat" of bar 1 and lost bar 3. Join them by content, then number them.
  // They are numbered backwards from the first printed number, because engravers don't count
  // a pickup: the Turkish March opens with a pickup and four bars before its printed "5", and
  // numbered forwards the pickup became bar 1, the real bar 5 collided with a false one and
  // was dropped as a repeat. Backwards, the pickup is bar 0 and a short opening leaves an
  // honest gap at 1 instead of shifting everything.
  if (firstPrinted > 0) {
    const opening = bars.filter((bar) => bar.frame !== undefined && bar.frame < firstPrinted);
    const stitched = stitchBars(opening, timeSignature, frames);
    const start = Math.max(0, (numbers[firstPrinted] as number) - stitched.length);
    stitched.forEach((bar, i) => {
      bar.number = start + i;
      anchored.set(bar.number, bar);
    });
    if (start === 0 && stitched.length > (numbers[firstPrinted] as number)) {
      console.log(`  opening has ${stitched.length - (numbers[firstPrinted] as number)} bar(s) more than the numbering allows — check the first pages`);
    }
    bars = bars.filter((bar) => !opening.includes(bar));
  }

  for (const bar of bars) {
    const printed = bar.frame === undefined ? null : numbers[bar.frame] ?? null;
    if (printed === null) {
      // Not asked for here, and a number the transcriber volunteers drifts (see above).
      delete bar.number;
      loose.push(bar);
      continue;
    }
    const offset = seenPerFrame.get(bar.frame as number) ?? 0;
    seenPerFrame.set(bar.frame as number, offset + 1);
    bar.number = printed + offset;

    const held = anchored.get(bar.number);
    if (!held) {
      anchored.set(bar.number, bar);
      continue;
    }
    repeats++;
    // Two readings of one bar: the one that adds up wins, and the earlier one on a tie — a
    // later screenshot shows the bar nearer the page edge.
    const fits = (candidate: TabBar) => barFits(candidate, signatureOf(candidate, timeSignature));
    if (!fits(held) && fits(bar)) anchored.set(bar.number, bar);
  }

  // No printed numbers anywhere: a tab-only scrolling video. The bars can still be put
  // together, by matching what each screenshot shares with the one before it.
  if (anchored.size === 0) return stitchBars(bars, timeSignature, frames);

  const placed = [...anchored.keys()].sort((a, b) => a - b);
  const gaps = placed.filter((n, i) => i > 0 && n !== placed[i - 1] + 1);
  console.log(
    `  bars ${placed[0]}-${placed[placed.length - 1]}: ` +
      `${repeats} repeated reading(s) dropped` +
      (gaps.length ? `, missing before ${gaps.slice(0, 8).join(", ")}` : ", no gaps") +
      (loose.length ? `, ${loose.length} unplaced` : ""),
  );

  // Unplaced bars go last rather than into the middle of the piece, where they would be wrong.
  return [...placed.map((n) => anchored.get(n) as TabBar), ...loose];
}
