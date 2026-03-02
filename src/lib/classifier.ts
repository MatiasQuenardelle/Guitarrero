import { LineType } from "./types";
import { CHORD_REGEX, parseChordToken } from "./chords";

const SECTION_HEADER_PATTERN =
  /^\[.*\]$|^(intro|verse|chorus|bridge|outro|solo|interlude|pre-chorus|refrain|tab|instrumental|riff|hook|coda|breakdown|estrofa|estribillo|puente)\s*\d*\s*:?\s*$/i;

function isChordToken(token: string): boolean {
  return parseChordToken(token) !== null;
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;

  const chordCount = tokens.filter(isChordToken).length;
  return chordCount / tokens.length > 0.5;
}

function isTabLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Standard tab notation: e|---0---2---|
  if (/^[eEABDGa-g]\|[\d\-|hpbs\/\\~x\s]+\|?\s*$/.test(trimmed)) return true;

  // Lines with lots of dashes and pipes
  const dashCount = (trimmed.match(/-/g) || []).length;
  const pipeCount = (trimmed.match(/\|/g) || []).length;

  if (dashCount > trimmed.length * 0.4 && pipeCount >= 1) return true;
  if (dashCount > trimmed.length * 0.6) return true;

  return false;
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  return SECTION_HEADER_PATTERN.test(trimmed);
}

export function classifyLine(line: string): LineType {
  if (!line.trim()) return "empty";
  if (isSectionHeader(line)) return "header";
  if (isTabLine(line)) return "tab";
  if (isChordLine(line)) return "chord";
  return "lyric";
}

export { CHORD_REGEX };
