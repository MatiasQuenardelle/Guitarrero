import { projectFile, readMeta, writeMeta } from "../../src/lib/studio/paths.ts";
import type { FrameInfo } from "../../src/lib/studio/types.ts";
import { askClaudeJson } from "./claude-cli.ts";

/**
 * Reads the bar number printed at the start of each screenshot's staff.
 *
 * This is a pass of its own because asking for it *during* transcription doesn't work: on the
 * Clair de Lune lesson the transcriber reported bars 24-35 for screenshots printed 4 and 10,
 * drifting roughly with the batch index rather than reading the page. Asked on its own, with
 * nothing else to do, the same model got all four check frames exactly right for $0.05.
 *
 * It earns its cost on lesson videos, which teach sections out of order — without the numbers
 * neither reading order nor video order is the order the music is played in.
 */
const BATCH = 8;
const CONCURRENCY = 4;

/** Low effort: reading one printed number is not work that deliberation improves. */
const EFFORT = "low";

const SYSTEM = "You read bar numbers printed on sheet music. Reply with JSON only.";

function buildPrompt(count: number): string {
  return `Each attached image is one line of a guitar score, in order. A small bar number is
printed above the left edge of the staff, before the clef or at the first barline.

Report ONLY that printed number for each image. Do not count bars, do not infer a number from
context, and do not guess: if no number is printed on an image, use null.

Reply with JSON only: {"numbers": [${Array.from({ length: count }, () => "n").join(", ")}]}`;
}

export async function readBarNumbers(
  id: string,
  frames: FrameInfo[],
  cwd: string,
): Promise<(number | null)[]> {
  // Already read on a previous run: this pass is cheap but not free, and re-assembling a
  // score from cached readings should cost nothing at all.
  if (frames.every((frame) => frame.bar !== undefined)) {
    console.log(`  bar numbers reused from a previous read`);
    return frames.map((frame) => frame.bar ?? null);
  }

  const batches: FrameInfo[][] = [];
  for (let i = 0; i < frames.length; i += BATCH) batches.push(frames.slice(i, i + BATCH));

  const results = new Array<(number | null)[]>(batches.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
      for (let i = next++; i < batches.length; i = next++) {
        const batch = batches[i];
        try {
          const reply = await askClaudeJson<{ numbers?: unknown[] }>(buildPrompt(batch.length), {
            cwd,
            system: SYSTEM,
            images: batch.map((frame) => projectFile.frame(id, frame.file)),
            effort: EFFORT,
          });
          const numbers = Array.isArray(reply.numbers) ? reply.numbers : [];
          results[i] = batch.map((_, j) => {
            const value = Number(numbers[j]);
            return Number.isInteger(value) && value >= 1 && value <= 999 ? value : null;
          });
        } catch {
          results[i] = batch.map(() => null);
        }
      }
    }),
  );

  const flat = results.flat();
  frames.forEach((frame, i) => {
    frame.bar = flat[i];
  });
  const meta = readMeta(id);
  if (meta) {
    meta.frames = frames;
    writeMeta(id, meta);
  }

  const read = flat.filter((n) => n !== null).length;
  console.log(`  bar numbers read on ${read}/${frames.length} frames`);
  return flat;
}
