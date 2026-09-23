import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  listProjectIds,
  projectFile,
  readMeta,
  readScore,
  readStatus,
  writeStatus,
} from "./paths.ts";
import type { ProjectMeta, ProjectPayload, ProjectStatus } from "./types.ts";

const MISSING: ProjectStatus = {
  stage: "queued",
  message: "Not started",
  progress: 0,
  updatedAt: 0,
};

/** "Clair de Lune - Guitar Lesson + TAB" → "clair-de-lune". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The piece's name out of a video title: what comes before the first " - ", "(", "|", "/" or emoji. */
function autoSlug(meta: ProjectMeta): string {
  const name = meta.header?.title ?? meta.title;
  const piece = name.split(/\s+[-–|/]\s+|\s*[(|]|\s*[\u{1F300}-\u{1FAFF}]/u)[0];
  return slugify(piece) || slugify(meta.title) || meta.id.toLowerCase();
}

/**
 * URL name for every project: the stored slug, else one derived from the title, made unique
 * in creation order so an older tab keeps its address when a second reading of the same
 * piece is added.
 */
export function projectSlugs(): Map<string, string> {
  const metas = listProjectIds()
    .map((id) => readMeta(id))
    .filter((meta): meta is ProjectMeta => meta !== null)
    .sort((a, b) => a.createdAt - b.createdAt);
  const taken = new Set<string>();
  const slugs = new Map<string, string>();
  for (const meta of metas) {
    const base = meta.slug ?? autoSlug(meta);
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    slugs.set(meta.id, slug);
  }
  return slugs;
}

/** The project a URL segment names — its slug, or its id for older links and API calls. */
export function resolveProjectId(slugOrId: string): string | null {
  for (const [id, slug] of projectSlugs()) if (slug === slugOrId) return id;
  return readMeta(slugOrId) ? slugOrId : null;
}

export function getProject(id: string): ProjectPayload | null {
  const meta = readMeta(id);
  if (!meta) return null;

  const texFile = projectFile.alphaTex(id);
  return {
    meta,
    status: readStatus(id) ?? MISSING,
    alphaTex: fs.existsSync(texFile) ? fs.readFileSync(texFile, "utf8") : null,
    score: readScore(id),
  };
}

function openedAt(id: string): number | null {
  try {
    return fs.statSync(projectFile.opened(id)).mtimeMs;
  } catch {
    return null;
  }
}

export function markOpened(id: string): void {
  fs.writeFileSync(projectFile.opened(id), "");
}

export interface ProjectSummary {
  id: string;
  /** What goes in the URL: /studio/<slug>. */
  slug: string;
  title: string;
  createdAt: number;
  /** Last time it was opened in the studio; falls back to `createdAt`. */
  openedAt: number;
  frames: number;
  bars: number;
  status: ProjectStatus;
}

export function listProjects(): ProjectSummary[] {
  const slugs = projectSlugs();
  return listProjectIds()
    .map((id) => {
      const meta = readMeta(id);
      if (!meta) return null;
      return {
        id,
        slug: slugs.get(id) ?? id,
        title: meta.title,
        createdAt: meta.createdAt,
        openedAt: openedAt(id) ?? meta.createdAt,
        frames: meta.frames.length,
        bars: readScore(id)?.bars.length ?? 0,
        status: readStatus(id) ?? MISSING,
      };
    })
    .filter((p): p is ProjectSummary => p !== null)
    .sort((a, b) => b.openedAt - a.openedAt);
}

/**
 * Runs the ingest script as a detached child so the request returns immediately;
 * the page follows along by polling status.json.
 */
export function startIngest(url: string, id: string, from?: string): void {
  const args = [path.join(process.cwd(), "scripts/ingest.ts"), url];
  if (from) args.push("--from", from);

  writeStatus(id, "queued", "Starting…", 0.01);
  fs.mkdirSync(path.dirname(projectFile.log(id)), { recursive: true });
  const log = fs.openSync(projectFile.log(id), "a");

  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
}

export function saveAlphaTex(id: string, tex: string): void {
  fs.writeFileSync(projectFile.alphaTex(id), tex);
}

/** Guards against `..` and absolute paths in a user-supplied frame name. */
export function readFrame(id: string, file: string): Buffer | null {
  if (!/^[\w.-]+\.jpg$/.test(file)) return null;
  const full = projectFile.frame(id, file);
  return fs.existsSync(full) ? fs.readFileSync(full) : null;
}
