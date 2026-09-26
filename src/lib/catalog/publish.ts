import fs from "node:fs";
import path from "node:path";
import { projectFile, readMeta, readScore } from "../studio/paths.ts";
import { pieceFile, piecesRoot } from "./server.ts";
import type { Difficulty, Piece } from "./types.ts";

export interface PublishOptions {
  slug: string;
  titleEs?: string;
  titleEn?: string;
  composer?: string;
  composerDates?: string;
  difficulty?: Difficulty;
  aboutEs?: string;
  aboutEn?: string;
  tuning?: string;
}

const TUNING_NAMES: Record<string, string> = { "6:D": "Drop D", "6:D 5:G": "Drop D + G" };

/**
 * Copies a studio project's current score into the library. Publishing again keeps the
 * titles and notes already written for the piece unless new ones are given.
 */
export function publishProject(projectId: string, options: PublishOptions): Piece {
  const meta = readMeta(projectId);
  const score = readScore(projectId);
  const texPath = projectFile.alphaTex(projectId);
  if (!meta || !score || !fs.existsSync(texPath)) {
    throw new Error(`project ${projectId} has no finished score to publish`);
  }
  if (!/^[a-z0-9-]+$/.test(options.slug)) throw new Error(`bad slug: ${options.slug}`);

  let previous: Partial<Piece> = {};
  try {
    previous = JSON.parse(fs.readFileSync(pieceFile.meta(options.slug), "utf8")) as Piece;
  } catch {
    // First publish.
  }

  const headerTuning = meta.header?.tuning
    ? Object.entries(meta.header.tuning)
        .map(([string, note]) => `${string}:${note}`)
        .join(" ")
    : undefined;

  const title = options.titleEs ?? previous.title?.es ?? meta.header?.title ?? meta.title;
  const about =
    options.aboutEs || options.aboutEn
      ? { es: options.aboutEs ?? "", en: options.aboutEn ?? options.aboutEs ?? "" }
      : previous.about;

  const piece: Piece = {
    slug: options.slug,
    title: { es: title, en: options.titleEn ?? previous.title?.en ?? title },
    composer: options.composer ?? previous.composer ?? meta.header?.composer ?? "",
    composerDates: options.composerDates ?? previous.composerDates,
    difficulty: options.difficulty ?? previous.difficulty ?? 2,
    about,
    bars: score.bars.length,
    tempo: score.tempo,
    timeSignature: score.timeSignature,
    tuning:
      options.tuning ??
      previous.tuning ??
      (headerTuning ? (TUNING_NAMES[headerTuning] ?? headerTuning) : undefined),
    youtubeId: meta.video.id,
    sourceProject: projectId,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  fs.mkdirSync(path.join(piecesRoot, options.slug), { recursive: true });
  fs.writeFileSync(pieceFile.meta(options.slug), `${JSON.stringify(piece, null, 2)}\n`);
  fs.copyFileSync(texPath, pieceFile.score(options.slug));
  return piece;
}
