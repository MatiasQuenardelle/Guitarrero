// Copies the alphaTab runtime into public/ so the browser can load it from a <script>
// tag instead of going through Turbopack (which mangles its web workers / audio worklets).
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "node_modules/@coderline/alphatab/dist");
const target = path.join(root, "public/alphatab");

if (!existsSync(dist)) {
  console.warn("[alphatab] dist not found, skipping copy");
  process.exit(0);
}

// Files are overwritten in place rather than wiping the folder, so a soundfont fetched by
// scripts/fetch-soundfont.mjs survives an npm install.
await mkdir(target, { recursive: true });

await cp(path.join(dist, "alphaTab.min.js"), path.join(target, "alphaTab.min.js"));
await cp(path.join(dist, "font"), path.join(target, "font"), { recursive: true });
await mkdir(path.join(target, "soundfont"), { recursive: true });
await cp(
  path.join(dist, "soundfont/sonivox.sf3"),
  path.join(target, "soundfont/sonivox.sf3"),
);

console.log("[alphatab] runtime copied to public/alphatab");
