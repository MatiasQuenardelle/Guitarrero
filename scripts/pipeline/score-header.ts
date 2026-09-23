import { projectFile, readMeta, writeMeta } from "../../src/lib/studio/paths.ts";
import type { FrameInfo, ScoreHeader } from "../../src/lib/studio/types.ts";
import { askClaudeJson } from "./claude-cli.ts";

/**
 * Reads the heading of the first page: title, composer, tempo and time signature.
 *
 * Its reason to exist is the tempo. A tempo mark names a note value as well as a number —
 * Clair de Lune is marked "♪ = 84", eighth notes — and the transcriber, asked for a "tempo"
 * in among everything else, returns the number alone. alphaTab counts quarter notes, so 84
 * eighths came out as 84 quarters and the piece played at twice its speed.
 *
 * Like the bar numbers, this is one cheap call doing one job, so it can be fixed and re-run
 * without touching the expensive transcription cache.
 */
const EFFORT = "low";
const SYSTEM = "You read the heading of a music score. Reply with JSON only.";

/** Beats per minute of the marked note value, relative to a quarter note. */
const NOTE_VALUE: Record<string, number> = {
  whole: 4,
  "dotted-half": 3,
  half: 2,
  "dotted-quarter": 1.5,
  quarter: 1,
  "dotted-eighth": 0.75,
  eighth: 0.5,
  sixteenth: 0.25,
};

const PROMPT = `The attached images are the first page of a guitar score.

Read its heading and report, reading only what is actually printed:
- "title" and "composer", or omit either if not printed there.
- "tempo": the tempo mark, as {"note": "<value>", "bpm": <number>}. The note is the one drawn
  before the "=" sign: "whole", "dotted-half", "half", "dotted-quarter", "quarter",
  "dotted-eighth", "eighth" or "sixteenth". A note drawn with a flag is an eighth; with a dot
  after it, the dotted form. Omit "tempo" if no tempo mark is printed.
- "timeSignature": [beats, value], e.g. [9, 8].
- "tuning": {"6": "D"} for a printed re-tuning such as "6th=D" or "Drop D", only the strings
  that differ from standard EADGBE. Omit it for standard tuning.

Reply with JSON only.`;

interface HeaderReply {
  title?: string;
  composer?: string;
  tempo?: { note?: string; bpm?: number };
  timeSignature?: [number, number];
  tuning?: Record<string, string>;
}

export async function readScoreHeader(
  id: string,
  frames: FrameInfo[],
  cwd: string,
): Promise<ScoreHeader> {
  const meta = readMeta(id);
  if (meta?.header) {
    console.log("  score heading reused from a previous read");
    return meta.header;
  }
  if (frames.length === 0) return {};

  let reply: HeaderReply;
  try {
    reply = await askClaudeJson<HeaderReply>(PROMPT, {
      cwd,
      system: SYSTEM,
      images: frames.slice(0, 2).map((frame) => projectFile.frame(id, frame.file)),
      effort: EFFORT,
    });
  } catch (error) {
    console.log(`  heading unreadable (${(error as Error).message})`);
    return {};
  }

  const header: ScoreHeader = {};
  if (typeof reply.title === "string" && reply.title.trim()) header.title = reply.title.trim();
  if (typeof reply.composer === "string" && reply.composer.trim()) {
    header.composer = reply.composer.trim();
  }

  const bpm = Number(reply.tempo?.bpm);
  const relative = NOTE_VALUE[String(reply.tempo?.note).toLowerCase()];
  if (bpm > 0 && relative) {
    // alphaTab's \tempo is quarter notes per minute, whatever the score chose to count in.
    header.tempo = Math.round(bpm * relative);
    header.tempoMark = `${reply.tempo?.note} = ${bpm}`;
    console.log(`  tempo ${header.tempoMark} → ${header.tempo} quarter bpm`);
  }

  const ts = reply.timeSignature;
  if (Array.isArray(ts) && Number(ts[0]) > 0 && Number(ts[1]) > 0) {
    header.timeSignature = [Number(ts[0]), Number(ts[1])];
  }
  if (reply.tuning && typeof reply.tuning === "object") header.tuning = reply.tuning;

  if (meta) {
    meta.header = header;
    writeMeta(id, meta);
  }
  return header;
}
