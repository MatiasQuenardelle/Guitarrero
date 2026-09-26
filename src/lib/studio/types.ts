/** Shared shapes for the studio pipeline (scripts) and the player UI (app). */

/** Crop rectangle in normalized 0..1 coordinates of the video frame. */
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VideoMeta {
  id: string;
  url: string;
  title: string;
  uploader: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

/** One extracted tab screenshot. */
export interface FrameInfo {
  /** File name inside the project's `frames/` folder. */
  file: string;
  /** Position in the video, in seconds. */
  time: number;
  /** Content hash of the frame, hex. Keys the transcription cache. */
  hash?: string;
  /**
   * How far this frame has scrolled past the one kept before it, as a fraction of the width.
   * Absent when the two could not be aligned: a page flip, or a jump elsewhere in the piece.
   */
  scroll?: number;
  /** Bar number printed at the start of this frame's staff, once read. null = none printed. */
  bar?: number | null;
}

export interface ProjectMeta {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  video: VideoMeta;
  crop: CropBox | null;
  frames: FrameInfo[];
  /** The part of the video that shows tablature, when it isn't the whole thing. */
  range?: { start?: number; end?: number };
  /** The first page's heading, once read. */
  header?: ScoreHeader;
  /** URL name, e.g. "clair-de-lune"; derived from the title when unset (`scripts/slug.ts` sets it). */
  slug?: string;
  /** Read from a PDF score instead of a video; `video` is then a stub and `url` the PDF. */
  source?: "pdf";
  /** PDF only: the pages holding the TAB score, first and last. */
  pages?: [number, number];
}

export type Stage =
  | "queued"
  | "download"
  | "crop"
  | "frames"
  | "transcribe"
  | "alphatex"
  | "done"
  | "error";

export interface ProjectStatus {
  stage: Stage;
  message: string;
  /** 0..1 within the whole pipeline. */
  progress: number;
  updatedAt: number;
  error?: string;
}

export type Harmonic = "natural" | "artificial" | "tap" | "pinch" | "semi";

export interface TabNote {
  /** 1 = top tab line (high E), 6 = bottom line (low E). */
  string: number;
  fret: number;
  /** Tied to the previous note on the same string. */
  tie?: boolean;
  /** Dead / muted note. */
  dead?: boolean;
  /** Hammer-on or pull-off into the next note on this string. */
  hammer?: boolean;
  /** Slide into the next note; legato keeps the slur, shift re-picks. */
  slide?: "legato" | "shift";
  harmonic?: Harmonic;
  vibrato?: boolean;
  /** Note in parentheses. */
  ghost?: boolean;
  letRing?: boolean;
  palmMute?: boolean;
  staccato?: boolean;
  accent?: "normal" | "heavy";
  /** Fret the trill alternates to. */
  trill?: number;
  tap?: boolean;
  /** Bend shape in quarter tones, e.g. [0, 4, 4, 0]. */
  bend?: number[];
}

export interface TabBeat {
  /** 1, 2, 4, 8, 16, 32 or 64. */
  duration: number;
  dotted?: boolean;
  rest?: boolean;
  /** Small-size ornamental note before the beat. */
  grace?: boolean;
  /** Arrow through a chord. */
  strum?: "up" | "down";
  /** Tuplet bracket, e.g. [3, 2] for a triplet or [11, 12] for 11 in the space of 12. */
  tuplet?: [number, number];
  notes: TabNote[];
}

/** What the first page's heading says, read on its own so the tempo keeps its note value. */
export interface ScoreHeader {
  title?: string;
  composer?: string;
  /** Already converted to quarter notes per minute, which is what alphaTab counts. */
  tempo?: number;
  /** The mark as printed, e.g. "eighth = 84", for the record. */
  tempoMark?: string;
  timeSignature?: [number, number];
  /** Strings that differ from standard, e.g. {"6": "D"}. */
  tuning?: Record<string, string>;
}

/** alphaTex pitches for strings 1..6. */
export type Tuning = [string, string, string, string, string, string];

export interface TabBar {
  timeSignature?: [number, number];
  tempo?: number;
  /** Index into ProjectMeta.frames this bar was read from, when known. */
  frame?: number;
  /** The bar's number in the printed score, when the model could work it out. */
  number?: number;
  beats: TabBeat[];
}

export interface TabScore {
  title: string;
  composer?: string;
  tempo: number;
  timeSignature: [number, number];
  /** Non-standard tuning as alphaTex pitches for strings 1..6, when the score prints one. */
  tuning?: Tuning;
  bars: TabBar[];
}

/** Everything the player page needs in one payload. */
export interface ProjectPayload {
  meta: ProjectMeta;
  status: ProjectStatus;
  alphaTex: string | null;
  score: TabScore | null;
}
