/** What the app remembers about one user and one piece. */
export interface PieceProgress {
  slug: string;
  favorite: boolean;
  /** Playback speed as a ratio of the written tempo. */
  speed: number | null;
  /** ISO timestamp. */
  lastOpenedAt: string | null;
}

export interface ProgressUpdate {
  slug: string;
  favorite?: boolean;
  speed?: number;
  opened?: boolean;
}
