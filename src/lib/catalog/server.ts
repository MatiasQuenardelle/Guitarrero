import fs from "node:fs";
import path from "node:path";
import { sql } from "../db.ts";
import type { Piece, PieceWithScore } from "./types.ts";

/**
 * The published library. Each piece is a folder in the repo:
 *   content/pieces/<slug>/piece.json      metadata
 *   content/pieces/<slug>/score.alphatex  the score the player renders
 * Tabs are only ever made in the local studio and published here with `npm run publish`.
 *
 * The repo is public, so a piece that mustn't be (a purchased arrangement) is published to
 * the private_pieces table instead. `listLibrary` / `findPiece` see both; `listPieces` is the
 * repo alone, for the public landing page.
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

const byDifficulty = (a: Piece, b: Piece) =>
  a.difficulty - b.difficulty ||
  a.composer.localeCompare(b.composer) ||
  a.title.es.localeCompare(b.title.es);

/** Every piece published to the repo, easiest first, then by composer and title. */
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
    .sort(byDifficulty);
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

interface PrivateRow {
  piece: Piece;
  alphatex: string;
}

/** The whole library the owner sees: the repo's pieces and the private ones. */
export async function listLibrary(): Promise<Piece[]> {
  if (!process.env.DATABASE_URL) return listPieces();
  const rows = (await sql()`select piece from private_pieces`) as { piece: Piece }[];
  const extra = rows.map((row) => ({ ...row.piece, private: true }));
  return [...listPieces(), ...extra].sort(byDifficulty);
}

/** One piece with its score, from the repo or else the private table. */
export async function findPiece(slug: string): Promise<PieceWithScore | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const inRepo = getPiece(slug);
  if (inRepo || !process.env.DATABASE_URL) return inRepo;
  const rows = (await sql()`
    select piece, alphatex from private_pieces where slug = ${slug}
  `) as PrivateRow[];
  return rows[0] ? { ...rows[0].piece, private: true, alphaTex: rows[0].alphatex } : null;
}
