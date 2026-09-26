/**
 * YouTube URL -> tab.alphatex, end to end.
 *
 *   node scripts/ingest.ts "https://youtube.com/watch?v=..."
 *   node scripts/ingest.ts <url> --crop 0,0.62,1,0.36   # skip crop detection
 *   node scripts/ingest.ts <url> --from transcribe      # reuse existing frames
 *   node scripts/ingest.ts score.pdf --pages 7-15       # a notation + TAB PDF, one frame per system
 *
 * Progress is mirrored into the project's status.json so the /studio page can poll it.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  projectDir,
  projectFile,
  readMeta,
  writeMeta,
  writeScore,
  writeStatus,
  youtubeId,
} from "../src/lib/studio/paths.ts";
import { findBarIssues } from "../src/lib/studio/lint.ts";
import type { CropBox, ProjectMeta, TabScore } from "../src/lib/studio/types.ts";
import { usageSummary } from "./pipeline/claude-cli.ts";
import { detectCrop } from "./pipeline/detect-crop.ts";
import { extractFrames } from "./pipeline/extract-frames.ts";
import { fetchMetadata, fetchVideo, probeVideo } from "./pipeline/fetch-video.ts";
import { toAlphaTex } from "./pipeline/to-alphatex.ts";
import { transcribe } from "./pipeline/transcribe.ts";

type StartStage = "download" | "frames" | "transcribe" | "alphatex";
const STAGE_ORDER: StartStage[] = ["download", "frames", "transcribe", "alphatex"];

export interface IngestOptions {
  crop?: CropBox;
  from?: StartStage;
  /** Stop after this stage instead of running to the end. */
  stop?: StartStage;
  /** Only the part of the video that actually shows tablature, in seconds. */
  start?: number;
  end?: number;
  /** For a tab that prints no time signature — the transcriber needs one to read rhythm. */
  timeSignature?: [number, number];
  /** PDF only: the pages that hold the TAB score, first and last. */
  pages?: [number, number];
}

const cwd = process.cwd();

/** Accepts seconds, or mm:ss / h:mm:ss as written on a video's progress bar. */
function parseTime(value: string): number {
  const parts = value.split(":").map(Number);
  if (parts.length === 0 || parts.some(Number.isNaN)) {
    throw new Error(`expected seconds or mm:ss, got "${value}"`);
  }
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function parseCrop(value: string): CropBox {
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error("--crop expects x,y,w,h as fractions, e.g. 0,0.62,1,0.36");
  }
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

/**
 * A PDF has no video to download or scan: its frames are its systems, cut straight from the
 * vector page, and their bar numbers come from the PDF's own text. Keeps a copy of the PDF in
 * the project so a re-read never depends on where the original was.
 */
function pdfFrames(id: string, pdf: string, pages: [number, number] | undefined): ProjectMeta {
  const source = path.join(projectDir(id), "source.pdf");
  if (path.resolve(pdf) !== source) fs.copyFileSync(pdf, source);
  const existing = readMeta(id);
  const range = pages ?? existing?.pages;
  if (!range) throw new Error("--pages first-last is needed: the pages that hold the TAB score");

  console.log(`\n▸ Cutting pages ${range[0]}-${range[1]} into systems`);
  fs.rmSync(projectFile.framesDir(id), { recursive: true, force: true });
  const run = spawnSync(
    "python3",
    ["scripts/pipeline/pdf_frames.py", source, projectFile.framesDir(id), String(range[0]), String(range[1])],
    { cwd, encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(`pdf_frames.py failed: ${run.stderr.trim()}`);
  const frames = JSON.parse(run.stdout) as ProjectMeta["frames"];
  console.log(`  ${frames.length} systems, printed bars ${frames.map((f) => f.bar ?? "?").join(" ")}`);

  const title = path.basename(pdf, ".pdf");
  return {
    ...(existing ?? { id, url: path.relative(cwd, source), title, createdAt: Date.now() }),
    video: { id, url: path.relative(cwd, source), title, uploader: "PDF", duration: 0, width: 0, height: 0, fps: 0 },
    source: "pdf",
    pages: range,
    crop: null,
    frames,
  };
}

export async function ingest(url: string, options: IngestOptions = {}): Promise<string> {
  const pdf = url.toLowerCase().endsWith(".pdf") ? url : null;
  const id = pdf ? path.basename(pdf, ".pdf").toLowerCase().replace(/[^a-z0-9]+/g, "-") : youtubeId(url);
  if (!id) throw new Error(`not a YouTube URL, video id or PDF: ${url}`);

  const from = options.from ?? "download";
  const startIndex = STAGE_ORDER.indexOf(from);
  const stopIndex = options.stop ? STAGE_ORDER.indexOf(options.stop) : STAGE_ORDER.length - 1;
  const runs = (stage: StartStage) => {
    const i = STAGE_ORDER.indexOf(stage);
    return i >= startIndex && i <= stopIndex;
  };

  fs.mkdirSync(projectDir(id), { recursive: true });
  const existing = readMeta(id);

  try {
    if (pdf) {
      if (runs("download") || runs("frames")) writeMeta(id, pdfFrames(id, pdf, options.pages));
      return await transcribeStage(id, options, runs);
    }

    writeStatus(id, "download", "Fetching video info…", 0.02);
    const video = existing && !runs("download") ? existing.video : await fetchMetadata(url);
    console.log(`\n▸ ${video.title}  (${Math.round(video.duration)}s)`);

    let meta: ProjectMeta = existing ?? {
      id,
      url: video.url,
      title: video.title,
      createdAt: Date.now(),
      video,
      crop: null,
      frames: [],
    };
    meta.video = video;
    meta.title = video.title;
    writeMeta(id, meta);

    if (runs("download")) {
      writeStatus(id, "download", "Downloading video…", 0.05);
      console.log("\n▸ Downloading video");
      await fetchVideo(id, url);
    }

    const videoFile = projectFile.video(id);
    if (!fs.existsSync(videoFile)) {
      throw new Error("no video file — run without --from to download it first");
    }
    const size = await probeVideo(videoFile);

    if (runs("frames")) {
      writeStatus(id, "crop", "Locating the tab staff…", 0.35);
      console.log("\n▸ Locating the tab staff");
      const range = { start: options.start ?? meta.range?.start, end: options.end ?? meta.range?.end };
      if (range.start !== undefined || range.end !== undefined) {
        meta.range = range;
        console.log(`  tab runs from ${range.start ?? 0}s to ${range.end ?? Math.round(video.duration)}s`);
      }
      const crop =
        options.crop ?? meta.crop ?? (await detectCrop(id, videoFile, video.duration, cwd, range));
      meta.crop = crop;
      writeMeta(id, meta);
      console.log(`  crop ${JSON.stringify(crop)}`);

      writeStatus(id, "frames", "Extracting tab screenshots…", 0.45);
      console.log("\n▸ Extracting tab screenshots");
      meta.frames = await extractFrames(id, videoFile, crop, size, {
        startTime: range.start,
        endTime: range.end,
      });
      writeMeta(id, meta);
    }

    return await transcribeStage(id, options, runs);
  } catch (error) {
    const message = (error as Error).message;
    writeStatus(id, "error", "Ingest failed", 0, message);
    throw error;
  }
}

/** Everything after the frames exist, the same for a video and a PDF. */
async function transcribeStage(
  id: string,
  options: IngestOptions,
  runs: (stage: StartStage) => boolean,
): Promise<string> {
  const meta = readMeta(id) as ProjectMeta;
  if (!runs("transcribe") && !runs("alphatex")) {
    console.log(`\n■ stopped after ${options.stop} — ${meta.frames.length} frames ready\n`);
    writeStatus(id, "frames", `${meta.frames.length} frames ready`, 0.5);
    return id;
  }
  if (meta.frames.length === 0) throw new Error("no frames extracted — check the crop box");

  if (runs("transcribe")) {
    if (options.timeSignature) {
      meta.header = { ...meta.header, timeSignature: options.timeSignature };
      writeMeta(id, meta);
    }
    writeStatus(id, "transcribe", "Reading the tab…", 0.55);
    console.log(`\n▸ Transcribing ${meta.frames.length} frames`);
    const score = await transcribe(id, meta.frames, cwd, (done, total) => {
      writeStatus(
        id,
        "transcribe",
        `Reading the tab (${done}/${total})…`,
        0.55 + 0.4 * (done / total),
      );
    });
    if (!score.title) score.title = meta.title;
    writeScore(id, score);
  }

  const score = JSON.parse(fs.readFileSync(projectFile.score(id), "utf8")) as TabScore;
  writeStatus(id, "alphatex", "Building the score…", 0.97);
  fs.writeFileSync(projectFile.alphaTex(id), toAlphaTex(score));

  writeStatus(id, "done", `${score.bars.length} bars ready`, 1);
  console.log(`\n✓ ${score.bars.length} bars → ${path.relative(cwd, projectFile.alphaTex(id))}`);

  const issues = findBarIssues(score);
  if (issues.length > 0) {
    console.log(
      `  ${issues.length} bar(s) don't add up: ` +
        issues.map((i) => `${i.bar} (${i.actual}/${i.expected})`).join(", "),
    );
  }
  console.log(`  ${usageSummary()}`);

  // The page check needs no model and catches what the transcriber cannot see: notes on the
  // wrong string, and page bars the assembly lost (a pickup numbered 1, a repeat taken for
  // a duplicate). It writes <id>-checked beside the project; the report is what matters.
  // A PDF carries its fret numbers as text, so there the check is exact rather than read.
  console.log(`\n▸ Checking against the ${meta.source === "pdf" ? "PDF" : "page"}`);
  const checker = meta.source === "pdf" ? "scripts/pdf-check.py" : "scripts/check-tab.py";
  const check = spawnSync("python3", [checker, id], { cwd, encoding: "utf8" });
  if (check.status === 0) {
    console.log(check.stdout.split("\n").filter((line) => line.trim()).slice(1).join("\n"));
  } else {
    console.log(`  page check skipped (${(check.stderr || "python3 with numpy + Pillow needed").trim().split("\n").pop()})`);
  }
  console.log("");
  return id;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith("--"));
  if (!url) {
    console.error(
      'usage: node scripts/ingest.ts "<youtube url>" [--crop x,y,w,h] [--from stage]\n' +
        "       [--stop stage] [--start mm:ss] [--end mm:ss] [--fill-gaps] [--repair]\n" +
        "       [--time 3/4] [--pages 7-15 for a PDF]",
    );
    process.exit(1);
  }

  const options: IngestOptions = {};
  const cropIndex = args.indexOf("--crop");
  if (cropIndex !== -1) options.crop = parseCrop(args[cropIndex + 1] ?? "");
  if (args.includes("--fill-gaps")) process.env.GUITARRERO_FILL_GAPS = "1";
  if (args.includes("--repair")) process.env.GUITARRERO_REPAIR = "1";

  const stageArg = (flag: string): StartStage | undefined => {
    const at = args.indexOf(flag);
    if (at === -1) return undefined;
    const stage = args[at + 1] as StartStage;
    if (!STAGE_ORDER.includes(stage)) throw new Error(`${flag} must be one of ${STAGE_ORDER}`);
    return stage;
  };
  options.from = stageArg("--from");
  options.stop = stageArg("--stop");

  const timeArg = (flag: string): number | undefined => {
    const at = args.indexOf(flag);
    if (at === -1) return undefined;
    return parseTime(args[at + 1] ?? "");
  };
  const timeSignatureAt = args.indexOf("--time");
  if (timeSignatureAt !== -1) {
    const [beats, value] = (args[timeSignatureAt + 1] ?? "").split("/").map(Number);
    if (!(beats > 0) || !(value > 0)) throw new Error("--time expects a time signature, e.g. 3/4");
    options.timeSignature = [beats, value];
  }
  const pagesAt = args.indexOf("--pages");
  if (pagesAt !== -1) {
    const [first, last] = (args[pagesAt + 1] ?? "").split("-").map(Number);
    if (!(first > 0) || !(last >= first)) throw new Error("--pages expects first-last, e.g. 7-15");
    options.pages = [first, last];
  }
  options.start = timeArg("--start");
  options.end = timeArg("--end");

  await ingest(url, options);
}

if (process.argv[1]?.endsWith("ingest.ts")) {
  main().catch((error) => {
    console.error(`\n✗ ${(error as Error).message}\n`);
    process.exit(1);
  });
}
