import fs from "node:fs";
import path from "node:path";
import { projectDir } from "../../src/lib/studio/paths.ts";
import type { CropBox } from "../../src/lib/studio/types.ts";
import { askClaudeJson } from "./claude-cli.ts";
import { runOrThrow } from "./exec.ts";

/** Used when detection fails: most tab videos put the notation along the bottom. */
export const FALLBACK_CROP: CropBox = { x: 0, y: 0.6, w: 1, h: 0.4 };

const CROP_SYSTEM =
  "You locate guitar tablature in video screenshots. Reply with a JSON object only.";

interface CropReply {
  found?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  note?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Grabs evenly spaced stills so detection doesn't land on an intro card. */
async function sampleFrames(
  id: string,
  video: string,
  from: number,
  to: number,
  count = 3,
): Promise<string[]> {
  const dir = path.join(projectDir(id), "samples");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const files: string[] = [];
  for (let i = 0; i < count; i++) {
    const at = from + ((to - from) * (i + 1)) / (count + 1);
    const file = path.join(dir, `sample-${i + 1}.jpg`);
    await runOrThrow("ffmpeg", [
      "-y",
      "-ss",
      at.toFixed(2),
      "-i",
      video,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      file,
    ]);
    if (fs.existsSync(file)) files.push(file);
  }
  return files;
}

export async function detectCrop(
  id: string,
  video: string,
  duration: number,
  cwd: string,
  /** Only look inside this part of the video — a lesson's talking intro has no tab in it. */
  range: { start?: number; end?: number } = {},
): Promise<CropBox> {
  const samples = await sampleFrames(id, video, range.start ?? 0, range.end ?? duration);
  if (samples.length === 0) return FALLBACK_CROP;

  const prompt = `The ${samples.length} attached screenshots come from a guitar lesson video.

Find the region that contains the guitar TABLATURE staff (the 6 horizontal lines with
fret numbers on them, sometimes with standard notation above it). Ignore the performer,
the webcam overlay, titles, chord diagrams and any watermark.

Give the region as fractions of the full frame (0 = left/top edge, 1 = right/bottom edge).
Include a small margin so no numbers are cut off, and cover the tab in ALL the samples.

Reply with only this JSON:
{"found": true, "x": 0.0, "y": 0.62, "width": 1.0, "height": 0.36, "note": "tab strip along the bottom"}

If none of the samples show tablature, reply {"found": false}.`;

  try {
    const reply = await askClaudeJson<CropReply>(prompt, {
      cwd,
      system: CROP_SYSTEM,
      images: samples,
    });
    if (!reply.found || reply.width === undefined || reply.height === undefined) {
      console.log("  no tab region detected, using fallback crop");
      return FALLBACK_CROP;
    }

    const crop: CropBox = {
      x: clamp01(reply.x ?? 0),
      y: clamp01(reply.y ?? 0),
      w: clamp01(reply.width),
      h: clamp01(reply.height),
    };
    // A sliver or a near-full frame both mean detection went wrong.
    if (crop.w < 0.2 || crop.h < 0.05 || crop.h > 0.95) {
      console.log(`  implausible crop ${JSON.stringify(crop)}, using fallback`);
      return FALLBACK_CROP;
    }
    if (crop.x + crop.w > 1) crop.w = 1 - crop.x;
    if (crop.y + crop.h > 1) crop.h = 1 - crop.y;
    if (reply.note) console.log(`  ${reply.note}`);
    return crop;
  } catch (error) {
    console.log(`  crop detection failed (${(error as Error).message}), using fallback`);
    return FALLBACK_CROP;
  }
}

/** Translates a normalized box into an ffmpeg crop filter with even pixel values. */
export function cropFilter(crop: CropBox, width: number, height: number): string {
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  const w = even(crop.w * width);
  const h = even(crop.h * height);
  const x = even(crop.x * width);
  const y = even(crop.y * height);
  return `crop=${Math.min(w, width - x)}:${Math.min(h, height - y)}:${x}:${y}`;
}
