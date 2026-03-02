export type LineType = "chord" | "tab" | "lyric" | "header" | "empty";

export interface ParsedLine {
  type: LineType;
  content: string;
}

export interface Section {
  title: string;
  lines: ParsedLine[];
}

export interface ParsedSong {
  title: string;
  artist: string;
  capo: string;
  key: string;
  sections: Section[];
}
