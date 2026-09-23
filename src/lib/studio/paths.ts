import fs from "node:fs";
import path from "node:path";
import type { ProjectMeta, ProjectStatus, TabScore } from "./types.ts";

/** Root of all studio data. Override with GUITARRERO_DATA for a scratch run. */
export const dataRoot = process.env.GUITARRERO_DATA
  ? path.resolve(process.env.GUITARRERO_DATA)
  : path.join(process.cwd(), ".data");

export const projectsRoot = path.join(dataRoot, "projects");

export function projectDir(id: string): string {
  return path.join(projectsRoot, id);
}

export const projectFile = {
  video: (id: string) => path.join(projectDir(id), "video.mp4"),
  framesDir: (id: string) => path.join(projectDir(id), "frames"),
  frame: (id: string, file: string) => path.join(projectDir(id), "frames", file),
  meta: (id: string) => path.join(projectDir(id), "meta.json"),
  status: (id: string) => path.join(projectDir(id), "status.json"),
  score: (id: string) => path.join(projectDir(id), "tab.json"),
  transcribeCache: (id: string) => path.join(projectDir(id), "transcribe-cache.json"),
  alphaTex: (id: string) => path.join(projectDir(id), "tab.alphatex"),
  log: (id: string) => path.join(projectDir(id), "ingest.log"),
  /** Empty marker; its mtime is when the piece was last opened in the studio. */
  opened: (id: string) => path.join(projectDir(id), "opened"),
};

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export const readMeta = (id: string) => readJson<ProjectMeta>(projectFile.meta(id));
export const writeMeta = (id: string, meta: ProjectMeta) =>
  writeJson(projectFile.meta(id), meta);

export const readStatus = (id: string) => readJson<ProjectStatus>(projectFile.status(id));

export function writeStatus(
  id: string,
  stage: ProjectStatus["stage"],
  message: string,
  progress: number,
  error?: string,
): void {
  writeJson(projectFile.status(id), {
    stage,
    message,
    progress,
    updatedAt: Date.now(),
    error,
  } satisfies ProjectStatus);
}

export const readScore = (id: string) => readJson<TabScore>(projectFile.score(id));
export const writeScore = (id: string, score: TabScore) =>
  writeJson(projectFile.score(id), score);

export function listProjectIds(): string[] {
  try {
    return fs
      .readdirSync(projectsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** YouTube video id from any of the usual URL shapes. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/(?:embed|shorts|live)\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}
