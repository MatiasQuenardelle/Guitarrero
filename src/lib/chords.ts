export const CHORD_REGEX =
  /^[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add|M)?[0-9]*(\/[A-G][#b]?)?$/;

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export interface ChordToken {
  type: "chord";
  raw: string;
  root: string;
  quality: string;
  bass: string | null;
  start: number;
  end: number;
}

export interface GapToken {
  type: "gap";
  raw: string;
  start: number;
  end: number;
}

export type Token = ChordToken | GapToken;

export function parseChordToken(token: string): { root: string; quality: string; bass: string | null } | null {
  const match = token.match(/^([A-G][#b]?)((?:m|maj|min|dim|aug|sus[24]?|add|M)?[0-9]*)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  return { root: match[1], quality: match[2] || "", bass: match[3] || null };
}

function isFlat(note: string): boolean {
  return note.length === 2 && note[1] === "b";
}

function noteIndex(note: string): number {
  const idx = SHARPS.indexOf(note);
  if (idx !== -1) return idx;
  return FLATS.indexOf(note);
}

export function transposeNote(note: string, semitones: number): string {
  const useFlats = isFlat(note);
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const scale = useFlats ? FLATS : SHARPS;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return scale[newIdx];
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const parsed = parseChordToken(chord);
  if (!parsed) return chord;
  const newRoot = transposeNote(parsed.root, semitones);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones) : "";
  return newRoot + parsed.quality + (newBass ? "/" + newBass : "");
}

export function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;

  const tokens = tokenizeChordLine(line);
  let result = "";
  let pos = 0;

  for (const token of tokens) {
    if (token.type === "gap") {
      result += token.raw;
      pos += token.raw.length;
    } else {
      const transposed = transposeChord(token.raw, semitones);
      result += transposed;
      const diff = transposed.length - token.raw.length;
      pos += token.raw.length;

      // Adjust trailing whitespace: find the next gap token and compensate
      const nextIdx = tokens.indexOf(token) + 1;
      if (nextIdx < tokens.length && tokens[nextIdx].type === "gap" && diff !== 0) {
        const gap = tokens[nextIdx];
        const newGapLen = Math.max(1, gap.raw.length - diff);
        tokens[nextIdx] = { ...gap, raw: " ".repeat(newGapLen) };
      }
    }
  }

  return result;
}

export function tokenizeChordLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Consume whitespace
    if (line[i] === " " || line[i] === "\t") {
      const start = i;
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        i++;
      }
      tokens.push({ type: "gap", raw: line.slice(start, i), start, end: i });
      continue;
    }

    // Try to consume a chord token
    const start = i;
    while (i < line.length && line[i] !== " " && line[i] !== "\t") {
      i++;
    }
    const word = line.slice(start, i);
    const parsed = parseChordToken(word);

    if (parsed) {
      tokens.push({
        type: "chord",
        raw: word,
        root: parsed.root,
        quality: parsed.quality,
        bass: parsed.bass,
        start,
        end: i,
      });
    } else {
      // Non-chord word, treat as gap
      tokens.push({ type: "gap", raw: word, start, end: i });
    }
  }

  return tokens;
}

export function normalizeChordName(name: string): string {
  return name
    .replace("min", "m")
    .replace("maj", "M")
    .replace("Maj", "M");
}
