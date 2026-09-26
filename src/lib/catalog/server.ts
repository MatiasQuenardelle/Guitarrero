import fs from "node:fs";
import path from "node:path";
import type { Piece, PieceWithScore } from "./types.ts";

/**
 * The published library. Each piece is a folder in the repo:
 *   content/pieces/<slug>/piece.json      metadata
 *   content/pieces/<slug>/score.alphatex  the score the player renders
 * Tabs are only ever made in the local studio and published here with `npm run publish`.
 */
export const piecesRoot = path.join(process.cwd(), "content/pieces");

export const pieceFile = {
  meta: (slug: string) => path.join(piecesRoot, slug, "piece.json"),
  score: (slug: string) => path.join(piecesRoot, slug, "score.alphatex"),
};

function readPiece(slug: string): Piece | null {
  try {
    return JSON.parse(fs.readFileSync(pieceFile.meta(slug), "utf8")) as Piece;
  } catch {
    return null;
  }
}

/** Every published piece, easiest first, then by composer and title. */
export function listPieces(): Piece[] {
  let slugs: string[] = [];
  try {
    slugs = fs
      .readdirSync(piecesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  return slugs
    .map(readPiece)
    .filter((piece): piece is Piece => piece !== null)
    .sort(
      (a, b) =>
        a.difficulty - b.difficulty ||
        a.composer.localeCompare(b.composer) ||
        a.title.es.localeCompare(b.title.es),
    );
}

export function getPiece(slug: string): PieceWithScore | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const piece = readPiece(slug);
  if (!piece) return null;
  try {
    return { ...piece, alphaTex: fs.readFileSync(pieceFile.score(slug), "utf8") };
  } catch {
    return null;
  }
}
