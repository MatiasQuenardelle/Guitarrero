import fs from "node:fs";
import path from "node:path";
import { projectDir, projectFile } from "../../src/lib/studio/paths.ts";
import type { VideoMeta } from "../../src/lib/studio/types.ts";
import { run, runOrThrow } from "./exec.ts";

interface YtDlpJson {
  id: string;
  title: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  webpage_url: string;
}

/** Set GUITARRERO_YT_COOKIES=1 for age-restricted or members-only videos. */
function cookieArgs(): string[] {
  return process.env.GUITARRERO_YT_COOKIES ? ["--cookies-from-browser", "chrome"] : [];
}

export async function fetchMetadata(url: string): Promise<VideoMeta> {
  const result = await runOrThrow("yt-dlp", [
    "--dump-json",
    "--no-warnings",
    ...cookieArgs(),
    url,
  ]);
  const raw = JSON.parse(result.stdout.trim().split("\n")[0]) as YtDlpJson;

  return {
    id: raw.id,
    url: raw.webpage_url ?? url,
    title: raw.title,
    uploader: raw.uploader ?? raw.channel ?? "",
    duration: raw.duration ?? 0,
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    fps: raw.fps ?? 0,
  };
}

/**
 * Downloads the video stream only — the audio is never used (playback comes from
 * alphaTab's synthesizer), and skipping it roughly halves the download.
 */
export async function fetchVideo(id: string, url: string): Promise<string> {
  const target = projectFile.video(id);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log("  video already downloaded");
    return target;
  }

  fs.mkdirSync(projectDir(id), { recursive: true });
  const template = path.join(projectDir(id), "video.%(ext)s");

  await runOrThrow(
    "yt-dlp",
    [
      "-f",
      "bv*[height<=1080]/b[height<=1080]/bv*/b",
      "--remux-video",
      "mp4",
      "--no-playlist",
      "--no-warnings",
      "--newline",
      "-o",
      template,
      ...cookieArgs(),
      url,
    ],
    { echo: true },
  );

  if (!fs.existsSync(target)) {
    const downloaded = fs
      .readdirSync(projectDir(id))
      .find((f) => f.startsWith("video.") && !f.endsWith(".part"));
    if (!downloaded) throw new Error("yt-dlp produced no video file");
    fs.renameSync(path.join(projectDir(id), downloaded), target);
  }
  return target;
}

/** Actual stream dimensions, which can differ from the metadata's. */
export async function probeVideo(file: string): Promise<{ width: number; height: number }> {
  const result = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    file,
  ]);
  const parsed = JSON.parse(result.stdout) as {
    streams?: { width: number; height: number }[];
  };
  const stream = parsed.streams?.[0];
  if (!stream) throw new Error(`ffprobe found no video stream in ${file}`);
  return { width: stream.width, height: stream.height };
}
