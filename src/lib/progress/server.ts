import { neon } from "@neondatabase/serverless";
import type { PieceProgress, ProgressUpdate } from "./types";

/** Schema: db/schema.sql. */
function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
}

interface Row {
  piece_slug: string;
  favorite: boolean;
  speed: number | null;
  last_opened_at: Date | null;
}

export async function getProgress(userId: string): Promise<PieceProgress[]> {
  const rows = (await sql()`
    select piece_slug, favorite, speed, last_opened_at
    from piece_progress
    where user_id = ${userId}
    order by last_opened_at desc nulls last
  `) as Row[];
  return rows.map((row) => ({
    slug: row.piece_slug,
    favorite: row.favorite,
    speed: row.speed,
    lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at).toISOString() : null,
  }));
}

/** Upserts only the fields given; the others keep their stored value. */
export async function updateProgress(userId: string, update: ProgressUpdate): Promise<void> {
  const favorite = update.favorite ?? null;
  const speed = update.speed ?? null;
  const opened = update.opened ? new Date().toISOString() : null;
  await sql()`
    insert into piece_progress (user_id, piece_slug, favorite, speed, last_opened_at)
    values (${userId}, ${update.slug}, coalesce(${favorite}::boolean, false), ${speed}::real, ${opened}::timestamptz)
    on conflict (user_id, piece_slug) do update set
      favorite = coalesce(${favorite}::boolean, piece_progress.favorite),
      speed = coalesce(${speed}::real, piece_progress.speed),
      last_opened_at = coalesce(${opened}::timestamptz, piece_progress.last_opened_at),
      updated_at = now()
  `;
}
