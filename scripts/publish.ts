/**
 * Publishes a studio project to the library that users see.
 *
 *   npm run publish -- <project id> --slug lagrima --title "Lágrima" --composer "Francisco Tárrega"
 *
 * Options: --slug (required), --title / --title-en, --composer, --dates, --difficulty 1|2|3,
 * --about / --about-en, --tuning. Publishing the same slug again refreshes the score and keeps
 * the titles already written. Commit content/pieces/<slug>/ to ship it.
 */
import { publishProject, type PublishOptions } from "../src/lib/catalog/publish.ts";
import type { Difficulty } from "../src/lib/catalog/types.ts";

const [projectId, ...rest] = process.argv.slice(2);
const flags = new Map<string, string>();
for (let i = 0; i < rest.length; i += 2) flags.set(rest[i].replace(/^--/, ""), rest[i + 1]);

const slug = flags.get("slug");
if (!projectId || !slug) {
  console.error('usage: npm run publish -- <project id> --slug <slug> [--title "…"] …');
  process.exit(1);
}

const difficulty = flags.has("difficulty") ? (Number(flags.get("difficulty")) as Difficulty) : undefined;

const options: PublishOptions = {
  slug,
  titleEs: flags.get("title"),
  titleEn: flags.get("title-en"),
  composer: flags.get("composer"),
  composerDates: flags.get("dates"),
  difficulty,
  aboutEs: flags.get("about"),
  aboutEn: flags.get("about-en"),
  tuning: flags.get("tuning"),
};

const piece = publishProject(projectId, options);
console.log(`published ${piece.slug}: ${piece.title.es} — ${piece.composer}, ${piece.bars} bars`);
