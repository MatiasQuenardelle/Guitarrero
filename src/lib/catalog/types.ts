/** A piece published to the library: what every user sees. */

export type Locale = "es" | "en";

/** 1 = early intermediate, 2 = intermediate, 3 = advanced. */
export type Difficulty = 1 | 2 | 3;

export interface Piece {
  /** URL name: /piece/<slug>. */
  slug: string;
  title: Record<Locale, string>;
  composer: string;
  /** Composer's years or era, shown as a quiet subtitle, e.g. "1852 – 1909". */
  composerDates?: string;
  difficulty: Difficulty;
  /** Short note on what the piece practises. */
  about?: Record<Locale, string>;
  bars: number;
  /** Written tempo in quarter notes per minute. */
  tempo: number;
  timeSignature: [number, number];
  /** Non-standard tuning, e.g. "Drop D". */
  tuning?: string;
  /** The YouTube video the tab was read from, for reference. Absent for a tab read from a PDF. */
  youtubeId?: string;
  /** Kept in the database rather than the public repo (see catalog/server.ts). */
  private?: boolean;
  /** Studio project it was published from, so it can be published again after a fix. */
  sourceProject: string;
  publishedAt: string;
}

export interface PieceWithScore extends Piece {
  alphaTex: string;
}
