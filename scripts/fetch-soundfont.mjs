// Installs the soundfonts used for playback.
//
// 1. MuseScore General (MIT licensed, ~38MB) as the fallback guitar: the one bundled with
//    alphaTab (sonivox, ~1MB) is a minimal General MIDI set whose nylon guitar sounds thin.
// 2. Dedicated nylon guitar soundfonts from musical-artifacts.com. Its Cloudflare check
//    blocks scripted downloads, so these are downloaded in a browser into ~/Downloads (or
//    the folder given as the first argument) and picked up from there. Each is copied into
//    public/ with its preset renumbered to General MIDI program 24 (nylon guitar), which is
//    what every tab plays, and listed in nylon/manifest.json for the player's "Guitar" menu.
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const MUSESCORE_SOURCE =
  "https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3";

/** Best first: the first one installed is the default sound. */
const NYLON_GUITARS = [
  {
    id: "pianoteq",
    label: "Pianoteq 8 Classical",
    file: "Pianoteq_8_Classical_Guitar.sf2",
    page: "https://musical-artifacts.com/artifacts/2879",
  },
  {
    id: "yamaha45",
    label: "Yamaha No. 45",
    file: "Yamaha_No.45_Classical_Guitar.sf2",
    page: "https://musical-artifacts.com/artifacts/1976",
  },
  {
    id: "giannini",
    label: "Giannini Trovador",
    file: "Giannini_Trovador_Classical_Guitar.sf2",
    page: "https://musical-artifacts.com/artifacts/7617",
  },
  {
    id: "realnylon",
    label: "Realistic Nylon",
    file: "Real_Nylon_Gtr.sf2",
    page: "https://musical-artifacts.com/artifacts/3673",
  },
  {
    id: "fc",
    label: "FC Classical v2",
    file: "FC_Classical_Guitar_v2.sf2",
    page: "https://musical-artifacts.com/artifacts/3079",
  },
];

const NYLON_PROGRAM = 24;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const soundfontDir = path.join(root, "public/alphatab/soundfont");
const nylonDir = path.join(soundfontDir, "nylon");
const downloads = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads"));

async function installMuseScore() {
  const target = path.join(soundfontDir, "MuseScore_General.sf3");
  const existing = await stat(target).catch(() => null);
  if (existing && existing.size > 1_000_000) {
    console.log(`[soundfont] MuseScore General present (${Math.round(existing.size / 1e6)}MB)`);
    return;
  }

  console.log("[soundfont] downloading MuseScore General…");
  const response = await fetch(MUSESCORE_SOURCE);
  if (!response.ok || !response.body) {
    console.error(`[soundfont] download failed: HTTP ${response.status}`);
    return;
  }
  await mkdir(soundfontDir, { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  const { size } = await stat(target);
  console.log(`[soundfont] saved MuseScore General (${Math.round(size / 1e6)}MB)`);
}

/** Finds a RIFF sub-chunk (or LIST of the given type) inside [start, end). */
function findChunk(buffer, start, end, id, listType) {
  let offset = start;
  while (offset + 8 <= end) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunkId === id && (!listType || buffer.toString("ascii", offset + 8, offset + 12) === listType)) {
      return { start: offset + 8, end: offset + 8 + size };
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/**
 * alphaTab's synth only plays mono samples: the left/right halves of a linked stereo pair
 * are skipped, leaving empty regions that render NaN — total silence (Pianoteq). Marking
 * each half as mono keeps both: every zone already pans its half hard left or right.
 * Sample headers are 46-byte records; sampleLink and sampleType are the last two words.
 */
function unlinkStereoSamples(buffer, pdta) {
  const shdr = findChunk(buffer, pdta.start + 4, pdta.end, "shdr");
  if (!shdr) throw new Error("no sample headers (shdr)");

  let unlinked = 0;
  for (let offset = shdr.start; offset + 46 <= shdr.end - 46; offset += 46) {
    const type = buffer.readUInt16LE(offset + 44);
    // 2 right, 4 left, 8 linked; 0x10 marks SF3's Ogg-compressed samples.
    if ((type & 0x0e) === 0) continue;
    buffer.writeUInt16LE(0, offset + 42);
    buffer.writeUInt16LE((type & 0x10) | 1, offset + 44);
    unlinked++;
  }
  return unlinked;
}

/**
 * Makes a soundfont playable by alphaTab as the nylon guitar: stereo samples split into
 * panned mono ones, and a melodic preset renumbered to bank 0 / program 24 (a
 * single-instrument soundfont usually sits at program 0, where alphaTab would never look).
 * Returns the presets, for the log.
 */
function prepareForAlphaTab(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "sfbk") {
    throw new Error("not a SoundFont 2 file");
  }
  const pdta = findChunk(buffer, 12, buffer.length, "LIST", "pdta");
  if (!pdta) throw new Error("no preset data (pdta)");
  const phdr = findChunk(buffer, pdta.start + 4, pdta.end, "phdr");
  if (!phdr) throw new Error("no preset headers (phdr)");

  // 38-byte records; the last one is the terminal "EOP" sentinel.
  const presets = [];
  for (let offset = phdr.start; offset + 38 <= phdr.end - 38; offset += 38) {
    presets.push({
      offset,
      name: buffer.toString("latin1", offset, offset + 20).replace(/\0.*$/s, ""),
      program: buffer.readUInt16LE(offset + 20),
      bank: buffer.readUInt16LE(offset + 22),
    });
  }
  presets.unlinked = unlinkStereoSamples(buffer, pdta);
  const melodic = presets.filter((preset) => preset.bank !== 128);
  if (melodic.length === 0) throw new Error("no melodic presets");

  if (!melodic.some((preset) => preset.bank === 0 && preset.program === NYLON_PROGRAM)) {
    const chosen = melodic[0];
    buffer.writeUInt16LE(NYLON_PROGRAM, chosen.offset + 20);
    buffer.writeUInt16LE(0, chosen.offset + 22);
    // Anything else already at 0/24 would shadow it; there is none, per the check above.
    chosen.renumbered = `${chosen.bank}/${chosen.program} → 0/${NYLON_PROGRAM}`;
  }
  return presets;
}

async function installNylonGuitars() {
  await mkdir(nylonDir, { recursive: true });
  const manifest = [];
  const missing = [];

  for (const guitar of NYLON_GUITARS) {
    const target = path.join(nylonDir, `${guitar.id}.sf2`);
    const installed = await stat(target).catch(() => null);

    if (!installed) {
      const source = path.join(downloads, guitar.file);
      const buffer = await readFile(source).catch(() => null);
      if (!buffer) {
        missing.push(guitar);
        continue;
      }
      try {
        const presets = prepareForAlphaTab(buffer);
        await writeFile(target, buffer);
        const summary = presets
          .map((preset) => `"${preset.name}" ${preset.renumbered ?? `${preset.bank}/${preset.program}`}`)
          .join(", ");
        const stereo = presets.unlinked ? `, ${presets.unlinked} stereo samples split to mono` : "";
        console.log(`[soundfont] installed ${guitar.label} (${Math.round(buffer.length / 1e6)}MB): ${summary}${stereo}`);
      } catch (error) {
        console.error(`[soundfont] skipped ${guitar.file}: ${error.message}`);
        continue;
      }
    }

    manifest.push({ id: guitar.id, label: guitar.label, url: `/alphatab/soundfont/nylon/${guitar.id}.sf2` });
  }

  await writeFile(path.join(nylonDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[soundfont] ${manifest.length} nylon guitar(s) available`);

  if (missing.length > 0) {
    console.log(`[soundfont] to add more, download these into ${downloads} and run again:`);
    for (const guitar of missing) console.log(`  ${guitar.label}: ${guitar.page}`);
  }
}

await installMuseScore();
await installNylonGuitars();
