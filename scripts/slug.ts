/**
 * Names a studio project's URL: /studio/<slug> instead of /studio/<youtube id>.
 *
 *   node scripts/slug.ts                       # list every project with its slug
 *   node scripts/slug.ts <id | slug> <new-slug>
 *
 * Slugs live in meta.json; a project without one gets a name derived from its title.
 */
import { readMeta, writeMeta } from "../src/lib/studio/paths.ts";
import { projectSlugs, resolveProjectId, slugify } from "../src/lib/studio/server.ts";

const [target, wanted] = process.argv.slice(2);

if (!target) {
  for (const [id, slug] of projectSlugs()) {
    const meta = readMeta(id);
    console.log(`${slug.padEnd(28)} ${id.padEnd(14)} ${meta?.slug ? "" : "(auto)  "}${meta?.title ?? ""}`);
  }
  process.exit(0);
}

const id = resolveProjectId(target);
if (!id) {
  console.error(`no project named ${target}`);
  process.exit(1);
}
const slug = slugify(wanted ?? "");
if (!slug) {
  console.error("usage: node scripts/slug.ts <id | slug> <new-slug>");
  process.exit(1);
}
const owner = [...projectSlugs()].find(([other, s]) => s === slug && other !== id);
if (owner) {
  console.error(`"${slug}" is already ${owner[0]}'s`);
  process.exit(1);
}
const meta = readMeta(id)!;
meta.slug = slug;
writeMeta(id, meta);
console.log(`/studio/${slug}  →  ${id}  (${meta.title})`);
