import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { projectFile } from "../../src/lib/studio/paths.ts";
import type { CropBox, FrameInfo } from "../../src/lib/studio/types.ts";
import { cropFilter } from "./detect-crop.ts";
import { runBinary, runOrThrow } from "./exec.ts";

export interface ExtractOptions {
  /** ffmpeg scene score above which a frame is taken (0..1). */
  sceneThreshold?: number;
  /** Take a frame at least this often even without a scene change, in seconds. */
  maxGap?: number;
  /** Ink distance (0..1) below which two frames count as the same page. */
  pageThreshold?: number;
  /** Upper bound on frames handed to the transcriber. */
  maxFrames?: number;
  /** Ignore everything before this point in the video, in seconds. */
  startTime?: number;
  /** Ignore everything after this point in the video, in seconds. */
  endTime?: number;
}

/**
 * Pages are compared on an "ink map": how far each pixel of a small thumbnail sits from the
 * page background, measured on the brightest colour channel.
 *
 * A difference hash of the grayscale frame cannot tell "next page" from "the playback cursor
 * moved": on the Clair de Lune lesson 22 of 51 kept frames were a page already kept, with
 * only the blue cursor bar and the highlighted notes changed, and each was paid for again.
 * On the brightest channel a coloured overlay is nearly as bright as the paper, so it drops
 * out and only the black notation is left. Measured on the three test videos: copies of one
 * page sit at 0.03-0.23, different pages at 0.48-0.95.
 */
const INK_W = 256;
const INK_H = 64;

/** Distance from the background below which a pixel is paper, JPEG noise or a highlight. */
const INK_FLOOR = 40;

/** Mean ink below which a strip holds no notation at all: fades, black frames, blank gaps. */
const BLANK_INK = 0.3;

/**
 * Full-width lines a frame must show to be a page of tablature: a tab staff has six. Title
 * cards, the teacher's hands and fades in and out of the score read 0-4 on the corner-panel
 * Vals video, every real page of every test video 9-12. They used to reach the model, which
 * was told to ignore them — at full price — and one of them landing first also starved the
 * heading pass, which reads the first two frames.
 */
const STAFF_LINES = 6;
/** How far from the background a pixel must be, and how much of a row, to count as a line. */
const LINE_CONTRAST = 60;
const LINE_COVERAGE = 0.6;

async function frameSize(file: string): Promise<{ width: number; height: number }> {
  const probe = await runOrThrow("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0", file,
  ]);
  const [width, height] = probe.stdout.trim().split(",").map(Number);
  return { width, height };
}

async function staffLines(file: string): Promise<number> {
  // At full size: a staff line is a pixel or two thick and downscaling greys it out.
  const { width, height } = await frameSize(file);
  const raw = await runBinary("ffmpeg", [
    "-v", "error", "-i", file, "-pix_fmt", "gray", "-f", "rawvideo", "-",
  ]);
  if (height === 0) return 0;
  const background = [...raw].sort((a, b) => a - b)[raw.length >> 1];

  let lines = 0;
  let inLine = false;
  for (let y = 0; y < height; y++) {
    let far = 0;
    for (let x = 0; x < width; x++) {
      if (Math.abs(raw[y * width + x] - background) > LINE_CONTRAST) far++;
    }
    const isLine = far > width * LINE_COVERAGE;
    if (isLine && !inLine) lines++;
    inLine = isLine;
  }
  return lines;
}

/** Channel spread above which a pixel counts as coloured — a cursor or a highlighted note. */
const COLOUR_SPREAD = 40;

const DEFAULTS = {
  sceneThreshold: 0.06,
  maxGap: 2,
  pageThreshold: 0.3,
  maxFrames: 80,
} satisfies Omit<Required<ExtractOptions>, "startTime" | "endTime">;

interface PageInk {
  ink: Uint8Array;
  /** Mean ink per pixel. */
  density: number;
  /** Coloured pixels: how much of a cursor or highlight sits on this copy of the page. */
  colour: number;
}

async function pageInk(file: string): Promise<PageInk> {
  const raw = await runBinary("ffmpeg", [
    "-v",
    "error",
    "-i",
    file,
    "-vf",
    `scale=${INK_W}:${INK_H}:flags=area`,
    "-pix_fmt",
    "rgb24",
    "-f",
    "rawvideo",
    "-",
  ]);

  const pixels = Math.floor(raw.length / 3);
  const brightest = new Uint8Array(pixels);
  let colour = 0;
  for (let i = 0; i < pixels; i++) {
    const r = raw[i * 3];
    const g = raw[i * 3 + 1];
    const b = raw[i * 3 + 2];
    brightest[i] = Math.max(r, g, b);
    if (brightest[i] - Math.min(r, g, b) > COLOUR_SPREAD) colour++;
  }

  // Relative to the median rather than to white, so a dark-theme video works the same way.
  const background = [...brightest].sort((a, b) => a - b)[pixels >> 1] ?? 0;
  const ink = new Uint8Array(pixels);
  let total = 0;
  for (let i = 0; i < pixels; i++) {
    ink[i] = Math.max(0, Math.abs(brightest[i] - background) - INK_FLOOR);
    total += ink[i];
  }

  return { ink, density: pixels ? total / pixels : 0, colour };
}

/** Weighted Jaccard distance between two ink maps: 0 = same page, 1 = nothing in common. */
function inkDistance(a: Uint8Array, b: Uint8Array): number {
  let differing = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    differing += Math.abs(a[i] - b[i]);
    union += Math.max(a[i], b[i]);
  }
  return union ? differing / union : 0;
}

/**
 * The second test a copy has to pass, at full resolution.
 *
 * Music repeats, and an engraved repeat is the same page with a different bar number on it:
 * on La Paloma the line at bar 16 is bars 6-10 again note for note, the thumbnail distance
 * between the two is that of a copy, and the whole line was dropped from the score. So two
 * frames only count as one page if no small block of them differs either. Coloured pixels —
 * the cursor and the notes it lights up — are masked out first, since they are what
 * legitimately changes between copies. Measured in 32 px blocks: copies differ by at most 35
 * pixels in any block, the "6" → "16" alone by 82, fingerings by 110+.
 *
 * Both numbers are in pixels, not fractions of the frame: a glyph is as big as the video drew
 * it, however narrow the crop around it. Scaled to the width, a 652 px corner panel got 13 px
 * blocks and a threshold of 10, and ordinary noise kept every copy.
 */
const DETAIL_BLOCK = 32;
/**
 * Differing pixels in one block above which two frames are different pages. A pixel only
 * counts when the other frame has no ink right next to it either: the second play-through of
 * the corner-panel Vals has a slightly different tint, glyph edges land on the other side of
 * the ink threshold, and edge flicker alone reached 43 a block. With that tolerance copies
 * score 0-6 and the "6" → "16" still scores 63-100.
 */
const DETAIL_THRESHOLD = 30;
/**
 * Share of the frame ignored along each edge. The crop box is an estimate, so a sliver of the
 * video beside the tab panel often sits inside it, and that sliver never stops changing.
 */
const DETAIL_MARGIN = 0.03;
/**
 * Distance from the background beyond which a pixel is ink, as a share of the room there is
 * on the far side of the background — 90 on white paper, and never less than 60. A fixed 90
 * broke on a tab drawn over a mid-green panel: only pixels under 20 counted as ink, JPEG black
 * sits right there, and the flicker made every copy of a page look like a new one (78 frames
 * kept where ~40 were distinct).
 */
const DETAIL_INK_SHARE = 0.36;
const DETAIL_INK_MIN = 60;
/**
 * Channel spread that marks a pixel as coloured, how close to the background's own colour it
 * must be to be let off (a green panel is not an overlay), and how far the mask reaches.
 */
const DETAIL_COLOUR = 25;
const DETAIL_NEAR_BACKGROUND = 40;
const DETAIL_MASK_REACH = 3;

interface PageDetail {
  width: number;
  height: number;
  /** Per pixel: 0 = paper, 1 = ink, 2 = masked out as coloured, 3 = too close to call. */
  pixels: Uint8Array;
}

async function pageDetail(file: string): Promise<PageDetail> {
  const { width, height } = await frameSize(file);
  const raw = await runBinary("ffmpeg", [
    "-v", "error", "-i", file, "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
  ]);

  const count = width * height;
  const darkest = new Uint8Array(count);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < count; i++) {
    darkest[i] = Math.min(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
    histogram[darkest[i]]++;
  }
  const background = histogram.indexOf(Math.max(...histogram));
  const inkDistance = Math.max(
    DETAIL_INK_MIN,
    DETAIL_INK_SHARE * Math.max(background, 255 - background),
  );

  // The background's colour, so that a tinted page isn't taken for one big overlay.
  const paper = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    if (darkest[i] !== background) continue;
    for (let c = 0; c < 3; c++) paper[c] += raw[i * 3 + c] / histogram[background];
  }

  const pixels = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    // Two thresholds, not one: a faint line sitting right on a single threshold is ink in
    // one sample and paper in the next, and a whole staff line of that kept every copy of
    // the Moonlight Sonata's pages. Only clear ink against clear paper is a difference.
    const distance = Math.abs(background - darkest[i]);
    if (distance > inkDistance * 1.25) pixels[i] = 1;
    else if (distance > inkDistance * 0.6) pixels[i] = 3;
  }
  for (let i = 0; i < count; i++) {
    const brightest = Math.max(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
    if (brightest - darkest[i] <= DETAIL_COLOUR) continue;
    if ([0, 1, 2].every((c) => Math.abs(raw[i * 3 + c] - paper[c]) < DETAIL_NEAR_BACKGROUND)) continue;
    const x = i % width;
    const y = (i - x) / width;
    for (let yy = Math.max(0, y - DETAIL_MASK_REACH); yy <= Math.min(height - 1, y + DETAIL_MASK_REACH); yy++) {
      for (let xx = Math.max(0, x - DETAIL_MASK_REACH); xx <= Math.min(width - 1, x + DETAIL_MASK_REACH); xx++) {
        pixels[yy * width + xx] = 2;
      }
    }
  }
  return { width, height, pixels };
}

/** Whether any one block of the two frames differs by more than noise can explain. */
function detailDiffers(a: PageDetail, b: PageDetail): boolean {
  if (a.width !== b.width || a.height !== b.height) return true;

  const block = DETAIL_BLOCK;
  const threshold = DETAIL_THRESHOLD;
  const across = Math.ceil(a.width / block);
  const counts = new Uint32Array(across * Math.ceil(a.height / block));
  const marginX = Math.round(a.width * DETAIL_MARGIN);
  const marginY = Math.round(a.height * DETAIL_MARGIN);

  const width = a.width;
  /** Whether `pixels` has ink, or a mask, on or beside (x, y). */
  const inkNear = (pixels: Uint8Array, x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (pixels[(y + dy) * width + x + dx] !== 0) return true;
      }
    }
    return false;
  };

  for (let y = Math.max(1, marginY); y < a.height - Math.max(1, marginY); y++) {
    for (let x = Math.max(1, marginX); x < a.width - Math.max(1, marginX); x++) {
      const p = a.pixels[y * a.width + x];
      const q = b.pixels[y * a.width + x];
      if (p >= 2 || q >= 2 || p === q) continue;
      if (inkNear(p === 1 ? b.pixels : a.pixels, x, y)) continue;
      if (++counts[Math.floor(y / block) * across + Math.floor(x / block)] > threshold) return true;
    }
  }
  return false;
}

/** Best alignment distance below which one frame is the other scrolled sideways. */
const SCROLL_MATCH = 0.4;
/** How much worse every other offset must be, so a repetitive passage can't fake a match. */
const SCROLL_MARGIN = 0.2;
/**
 * Furthest a kept frame may sit from the one before it, as a fraction of the width. Half a
 * screen of overlap means any bar narrower than that is whole in at least one of the two.
 */
const SCROLL_STEP = 0.5;

/**
 * How far `b` has scrolled left of `a`, as a fraction of the width, or null when the two
 * cannot be shown to overlap.
 *
 * Sliding a one-dimensional "ink per column" profile was tried first and could not tell a
 * true scroll (~0.5) from a spurious one. The full ink map can: on the Chopin a true scroll
 * scores 0.04-0.50 with every other offset at 0.6-0.9, and frames with nothing in common
 * bottom out at 0.83. Different pages of a page-flip video never score below 0.48, so they
 * are never mistaken for a scroll.
 */
function scrollOffset(a: Uint8Array, b: Uint8Array): number | null {
  const scores: number[] = [];
  for (let shift = 0; shift <= INK_W * 0.8; shift++) {
    let differing = 0;
    let union = 0;
    for (let y = 0; y < INK_H; y++) {
      for (let x = 0; x + shift < INK_W; x++) {
        const p = a[y * INK_W + x + shift];
        const q = b[y * INK_W + x];
        differing += Math.abs(p - q);
        union += Math.max(p, q);
      }
    }
    scores.push(union ? differing / union : 1);
  }

  const best = scores.indexOf(Math.min(...scores));
  if (scores[best] > SCROLL_MATCH) return null;
  const elsewhere = Math.min(...scores.filter((_, shift) => Math.abs(shift - best) > 6), 1);
  if (elsewhere - scores[best] < SCROLL_MARGIN) return null;
  return best / INK_W;
}

/**
 * Thins a scrolling video down to the frames needed to see every bar once.
 *
 * A scrolling tab advances a bar or so at a time, so each bar shows up in two or three
 * consecutive frames and was being paid for that many times. From each kept frame this walks
 * forward to the furthest frame still proven to overlap it by half a screen and keeps that
 * one. A frame is only ever dropped when its offset from a kept frame was measured, so
 * coverage holds by construction; anything that can't be aligned — a page flip, a jump back
 * for a repeat — is kept. On a page-flip video nothing aligns and nothing is dropped.
 */
function dropScrollOverlap<T extends { page: PageInk; scroll?: number }>(frames: T[]): T[] {
  if (frames.length === 0) return [];

  const selected: T[] = [frames[0]];
  let reach: { frame: T; offset: number } | null = null;

  for (let i = 1; i < frames.length; i++) {
    const anchor = selected[selected.length - 1];
    const offset = scrollOffset(anchor.page.ink, frames[i].page.ink);

    if (offset !== null && offset <= SCROLL_STEP) {
      if (!reach || offset >= reach.offset) reach = { frame: frames[i], offset };
      continue;
    }

    if (reach) {
      // Out of the anchor's reach: move the anchor up and look at this frame again.
      reach.frame.scroll = reach.offset;
      selected.push(reach.frame);
      reach = null;
      i--;
      continue;
    }
    // Too far to drop anything in between, but still worth knowing for stitching the bars.
    if (offset !== null) frames[i].scroll = offset;
    selected.push(frames[i]);
  }
  if (reach) {
    reach.frame.scroll = reach.offset;
    selected.push(reach.frame);
  }

  return selected;
}

/** Identifies a frame by its bytes. Keys the transcription cache. */
function contentHash(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 24);
}

/** Frames narrower than this are doubled in size before they go to the model. */
const SMALL_FRAME = 1000;

/** Thins a list down to `max` entries, always keeping the first and last. */
function subsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

export async function extractFrames(
  id: string,
  video: string,
  crop: CropBox,
  size: { width: number; height: number },
  options: ExtractOptions = {},
): Promise<FrameInfo[]> {
  const { sceneThreshold, maxGap, pageThreshold, maxFrames } = { ...DEFAULTS, ...options };
  const startTime = Math.max(0, options.startTime ?? 0);
  const endTime = options.endTime;

  const framesDir = projectFile.framesDir(id);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  // One pass: crop to the tab strip, keep frames on a scene change or every maxGap
  // seconds, and have showinfo print each kept frame's timestamp to stderr.
  const select =
    `select='gt(scene,${sceneThreshold})+isnan(prev_selected_t)` +
    `+gte(t-prev_selected_t,${maxGap})'`;
  const filter = [
    cropFilter(crop, size.width, size.height),
    select,
    "scale='min(1600,iw)':-2",
    "showinfo",
  ].join(",");

  // Seeking before -i means a lesson video's talking intro is never decoded, let alone read
  // by the model. Output timestamps restart at the seek point, so startTime goes back on
  // below to keep the filmstrip's links to the video honest.
  const trim: string[] = [];
  if (startTime > 0) trim.push("-ss", startTime.toFixed(2));
  if (endTime !== undefined) trim.push("-t", Math.max(0, endTime - startTime).toFixed(2));

  const result = await runOrThrow("ffmpeg", [
    "-v",
    "info",
    ...trim,
    "-i",
    video,
    "-vf",
    filter,
    "-fps_mode",
    "vfr",
    "-q:v",
    "3",
    path.join(framesDir, "raw-%04d.jpg"),
  ]);

  const times = [...result.stderr.matchAll(/pts_time:([\d.]+)/g)].map(
    (m) => Number(m[1]) + startTime,
  );
  const rawFiles = fs
    .readdirSync(framesDir)
    .filter((f) => f.startsWith("raw-"))
    .sort();
  console.log(`  ${rawFiles.length} candidate frames`);

  // Drop blanks, then copies of a page (the video's own playback cursor moving doesn't count
  // as a new page). Compared against every page kept so far, not just the previous one:
  // lesson videos revisit earlier pages, and a repeat costs a full model read.
  const kept: {
    file: string;
    time: number;
    page: PageInk;
    detail?: PageDetail;
    scroll?: number;
    /** Copies of this page seen so far. */
    copies: number;
    /** The page this one nearly matched: alike as a thumbnail, different in detail. */
    nearly?: object;
  }[] = [];
  let blanks = 0;
  let staffless = 0;
  let dupes = 0;
  for (let i = 0; i < rawFiles.length; i++) {
    const file = path.join(framesDir, rawFiles[i]);
    const page = await pageInk(file);

    if (page.density < BLANK_INK) {
      fs.rmSync(file, { force: true });
      blanks++;
      continue;
    }
    if ((await staffLines(file)) < STAFF_LINES) {
      fs.rmSync(file, { force: true });
      staffless++;
      continue;
    }

    // The full-resolution test only runs on frames the thumbnail already calls a copy.
    let detail: PageDetail | undefined;
    let copyOf: (typeof kept)[number] | undefined;
    let nearly: (typeof kept)[number] | undefined;
    for (const candidate of kept) {
      if (inkDistance(page.ink, candidate.page.ink) >= pageThreshold) continue;
      nearly ??= candidate;
      detail ??= await pageDetail(file);
      candidate.detail ??= await pageDetail(candidate.file);
      if (!detailDiffers(detail, candidate.detail)) {
        copyOf = candidate;
        break;
      }
    }
    if (!copyOf) {
      kept.push({ file, time: times[i] ?? 0, page, detail, copies: 0, nearly });
      continue;
    }

    // A scene-change sample can land on the transition into a page: all but identical to it,
    // just blurred enough to fail the detail test, and kept as new. It gives itself away when
    // the very next sample is a clean copy of the page it nearly matched and nothing ever
    // matched the sample itself. A real repeat of a page is followed by copies of itself.
    const last = kept[kept.length - 1];
    if (last !== copyOf && last.nearly === copyOf && last.copies === 0) {
      fs.rmSync(last.file, { force: true });
      kept.pop();
      dupes++;
    }
    copyOf.copies++;

    dupes++;
    // Keep whichever copy has the least cursor on it: a highlight tints the numbers under it.
    // The page keeps its place and time in the sequence; only the pixels are swapped.
    if (page.colour < copyOf.page.colour) {
      fs.renameSync(file, copyOf.file);
      copyOf.page = page;
      copyOf.detail = detail;
    } else {
      fs.rmSync(file, { force: true });
    }
  }
  console.log(`  dropped ${blanks} blank, ${staffless} without a staff, ${dupes} duplicate`);

  const covering = dropScrollOverlap(kept);
  if (covering.length < kept.length) {
    console.log(`  dropped ${kept.length - covering.length} scroll overlap(s)`);
  }

  const selected = subsample(covering, maxFrames);
  if (selected.length < covering.length) {
    // Never silent: every page cut here is music missing from the score.
    console.log(
      `  ! ${covering.length} pages is over the ${maxFrames}-frame cap — ` +
        `${covering.length - selected.length} dropped. Narrow the video with --start/--end.`,
    );
  }
  for (const dropped of kept.filter((k) => !selected.includes(k))) {
    fs.rmSync(dropped.file, { force: true });
  }

  const frames: FrameInfo[] = [];
  for (const [index, frame] of selected.entries()) {
    const name = `${String(index).padStart(3, "0")}.jpg`;
    // A tab tucked in a corner of the video comes out a few hundred pixels wide. Doubling it
    // gives the model more to look at per digit. Done last, on the frames that survived:
    // the dedupe's thresholds are in source pixels.
    if ((await frameSize(frame.file)).width < SMALL_FRAME) {
      await runOrThrow("ffmpeg", [
        "-v", "error", "-y", "-i", frame.file,
        "-vf", "scale=iw*2:ih*2:flags=lanczos", "-q:v", "2", path.join(framesDir, name),
      ]);
      fs.rmSync(frame.file, { force: true });
    } else {
      fs.renameSync(frame.file, path.join(framesDir, name));
    }
    // The hash travels with the frame so the transcription cache keys on content, not names.
    const info: FrameInfo = {
      file: name,
      time: frame.time,
      hash: contentHash(path.join(framesDir, name)),
    };
    // Only meaningful when the frame before it survived the cap too.
    if (frame.scroll !== undefined && selected[index - 1] === covering[covering.indexOf(frame) - 1]) {
      info.scroll = frame.scroll;
    }
    frames.push(info);
  }

  console.log(`  ${frames.length} unique frames kept`);
  return frames;
}
