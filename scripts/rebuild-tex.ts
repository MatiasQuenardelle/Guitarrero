/**
 * Regenerates tab.alphatex from an existing tab.json — no video, no model calls.
 * Use it after changing the alphaTex generator.
 *
 *   node scripts/rebuild-tex.ts <projectId | all>
 */
import fs from "node:fs";
import { listProjectIds, projectFile, readScore } from "../src/lib/studio/paths.ts";
import { findBarIssues } from "../src/lib/studio/lint.ts";
import { toAlphaTex } from "./pipeline/to-alphatex.ts";

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/rebuild-tex.ts <projectId | all>");
  process.exit(1);
}

const ids = target === "all" ? listProjectIds() : [target];

for (const id of ids) {
  const score = readScore(id);
  if (!score) {
    console.log(`${id}: no tab.json, skipped`);
    continue;
  }

  fs.writeFileSync(projectFile.alphaTex(id), toAlphaTex(score));
  const issues = findBarIssues(score);
  console.log(
    `${id}: ${score.bars.length} bars rebuilt` +
      (issues.length > 0 ? ` (${issues.length} misread bar(s) squeezed to fit)` : ""),
  );
}
