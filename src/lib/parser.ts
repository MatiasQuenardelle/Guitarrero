import { ParsedSong, Section, ParsedLine } from "./types";
import { classifyLine } from "./classifier";

function extractMetadata(lines: string[]): {
  title: string;
  artist: string;
  capo: string;
  key: string;
  metadataEndIndex: number;
} {
  let title = "";
  let artist = "";
  let capo = "";
  let key = "";
  let metadataEndIndex = 0;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();

    const titleMatch = line.match(/^title:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      metadataEndIndex = i + 1;
      continue;
    }

    const artistMatch = line.match(/^artist:\s*(.+)$/i);
    if (artistMatch) {
      artist = artistMatch[1].trim();
      metadataEndIndex = i + 1;
      continue;
    }

    const capoMatch = line.match(/^capo:?\s*(\d+).*$/i);
    if (capoMatch) {
      capo = capoMatch[1];
      metadataEndIndex = i + 1;
      continue;
    }

    const keyMatch = line.match(/^key:\s*(.+)$/i);
    if (keyMatch) {
      key = keyMatch[1].trim();
      metadataEndIndex = i + 1;
      continue;
    }
  }

  return { title, artist, capo, key, metadataEndIndex };
}

function splitIntoSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section = { title: "", lines: [] };
  let hasHeaderSections = false;

  for (const rawLine of lines) {
    const lineType = classifyLine(rawLine);

    if (lineType === "header") {
      hasHeaderSections = true;
      if (currentSection.lines.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }
      const headerTitle = rawLine.trim().replace(/^\[|\]$/g, "").replace(/:$/, "");
      currentSection = { title: headerTitle, lines: [] };
    } else {
      currentSection.lines.push({ type: lineType, content: rawLine });
    }
  }

  if (currentSection.lines.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  // If no section headers found, split by empty line groups
  if (!hasHeaderSections && sections.length === 1) {
    return splitByEmptyLines(sections[0].lines);
  }

  return sections;
}

function splitByEmptyLines(lines: ParsedLine[]): Section[] {
  const sections: Section[] = [];
  let currentLines: ParsedLine[] = [];
  let emptyCount = 0;

  for (const line of lines) {
    if (line.type === "empty") {
      emptyCount++;
      if (emptyCount >= 2 && currentLines.length > 0) {
        sections.push({
          title: `Section ${sections.length + 1}`,
          lines: currentLines,
        });
        currentLines = [];
        emptyCount = 0;
      }
    } else {
      if (emptyCount >= 1 && currentLines.length > 0) {
        sections.push({
          title: `Section ${sections.length + 1}`,
          lines: currentLines,
        });
        currentLines = [];
      }
      emptyCount = 0;
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      title: `Section ${sections.length + 1}`,
      lines: currentLines,
    });
  }

  return sections;
}

export function parseTab(rawText: string): ParsedSong {
  const allLines = rawText.split("\n");
  const { title, artist, capo, key, metadataEndIndex } =
    extractMetadata(allLines);

  const contentLines = allLines.slice(metadataEndIndex);
  const sections = splitIntoSections(contentLines);

  // Trim trailing empty lines from each section
  for (const section of sections) {
    while (
      section.lines.length > 0 &&
      section.lines[section.lines.length - 1].type === "empty"
    ) {
      section.lines.pop();
    }
    while (section.lines.length > 0 && section.lines[0].type === "empty") {
      section.lines.shift();
    }
  }

  return {
    title,
    artist,
    capo,
    key,
    sections: sections.filter((s) => s.lines.length > 0),
  };
}
