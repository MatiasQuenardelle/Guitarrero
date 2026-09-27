import fs from "node:fs";
import path from "node:path";
import { projectFile, readMeta, readScore } from "../studio/paths.ts";
import { sql } from "../db.ts";
import { findPiece, pieceFile, piecesRoot } from "./server.ts";
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
  /**
   * Publish to the database instead of the public repo. Defaults to on for a tab read from a
   * PDF, which is a purchased arrangement.
   */
  private?: boolean;
}

const TUNING_NAMES: Record<string, string> = { "6:D": "Drop D", "6:D 5:G": "Drop D + G" };

/**
 * Copies a studio project's current score into the library. Publishing again keeps the
 * titles and notes already written for the piece unless new ones are given.
 */
export async function publishProject(projectId: string, options: PublishOptions): Promise<Piece> {
  const meta = readMeta(projectId);
  const score = readScore(projectId);
  const texPath = projectFile.alphaTex(projectId);
  if (!meta || !score || !fs.existsSync(texPath)) {
    throw new Error(`project ${projectId} has no finished score to publish`);
  }
  if (!/^[a-z0-9-]+$/.test(options.slug)) throw new Error(`bad slug: ${options.slug}`);

  const isPrivate = options.private ?? meta.source === "pdf";
  const existing = await findPiece(options.slug);
  if (existing && Boolean(existing.private) !== isPrivate) {
    throw new Error(`${options.slug} is already published ${existing.private ? "privately" : "in the repo"}`);
  }
  const previous: Partial<Piece> = existing ?? {};

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
    youtubeId: meta.source === "pdf" ? undefined : meta.video.id,
    sourceProject: projectId,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  if (isPrivate) {
    const tex = fs.readFileSync(texPath, "utf8");
    await sql()`
      insert into private_pieces (slug, piece, alphatex) values (${piece.slug}, ${JSON.stringify(piece)}::jsonb, ${tex})
      on conflict (slug) do update set piece = excluded.piece, alphatex = excluded.alphatex, updated_at = now()
    `;
    return { ...piece, private: true };
  }

  fs.mkdirSync(path.join(piecesRoot, options.slug), { recursive: true });
  fs.writeFileSync(pieceFile.meta(options.slug), `${JSON.stringify(piece, null, 2)}\n`);
  fs.copyFileSync(texPath, pieceFile.score(options.slug));
  return piece;
}
