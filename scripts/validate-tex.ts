/**
 * Parses a generated .alphatex with alphaTab's own importer and prints what it found —
 * proof the file loads before it ever reaches the browser.
 *
 *   node scripts/validate-tex.ts .data/projects/<id>/tab.alphatex [--bars]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// The Node build is CommonJS; loading it this way keeps the script dependency-free.
const alphaTab = require("@coderline/alphatab");

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/validate-tex.ts <file.alphatex> [--bars]");
  process.exit(1);
}

const tex = fs.readFileSync(file, "utf8");
const importer = new alphaTab.importer.AlphaTexImporter();
importer.logErrors = true;

try {
  importer.initFromString(tex, new alphaTab.Settings());
  const score = importer.readScore();
  const staff = score.tracks[0].staves[0];

  const beats = staff.bars.reduce(
    (total: number, bar: { voices: { beats: unknown[] }[] }) => total + bar.voices[0].beats.length,
    0,
  );
  const notes = staff.bars.reduce(
    (total: number, bar: { voices: { beats: { notes: unknown[] }[] }[] }) =>
      total + bar.voices[0].beats.reduce((sum, beat) => sum + beat.notes.length, 0),
    0,
  );

  console.log(`✓ ${file}`);
  console.log(`  title    ${score.title}${score.subTitle ? ` — ${score.subTitle}` : ""}`);
  console.log(`  tempo    ${score.tempo}`);
  console.log(`  bars     ${score.masterBars.length}`);
  console.log(`  beats    ${beats}`);
  console.log(`  notes    ${notes}`);

  if (process.argv.includes("--bars")) {
    staff.bars.forEach((bar: { index: number; voices: { beats: unknown[] }[] }) => {
      const contents = (
        bar.voices[0].beats as {
          duration: number;
          dots: number;
          isRest: boolean;
          notes: { string: number; fret: number }[];
        }[]
      )
        .map((beat) => {
          const value = beat.isRest
            ? "r"
            : beat.notes.map((note) => `${note.fret}/${7 - note.string}`).join("+");
          return `${value}:${beat.duration}${beat.dots ? "." : ""}`;
        })
        .join(" ");
      console.log(`  bar ${String(bar.index + 1).padStart(3)} | ${contents}`);
    });
  }
} catch (error) {
  console.error(`✗ ${file}\n  ${(error as Error).message}`);
  process.exit(1);
}
