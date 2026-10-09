// Installs the soundfonts used for playback.
//
// 1. MuseScore General (MIT licensed, ~38MB) as the fallback guitar: the one bundled with
//    alphaTab (sonivox, ~1MB) is a minimal General MIDI set whose nylon guitar sounds thin.
// 2. Dedicated nylon guitar soundfonts from musical-artifacts.com. Its Cloudflare check
//    blocks scripted downloads, so these are downloaded in a browser into ~/Downloads (or
//    the folder given as the first argument) and picked up from there. Each gets its preset
//    renumbered to General MIDI program 24 (nylon guitar), which is what every tab plays, its
//    samples compressed to Ogg Vorbis (SF3, ~10x smaller: Pianoteq goes from 63MB to 5MB),
//    and is written to public/sounds/ — committed, so production plays it too — and listed
//    in public/sounds/manifest.json for the player's "Guitar" menu.
import { execFileSync } from "node:child_process";
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
const nylonDir = path.join(root, "public/sounds");
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

/**
 * Re-encodes every sample as Ogg Vorbis, giving an SF3 file the way MuseScore's sftools
 * writes them: each sample's start/end become byte offsets of its Ogg stream in smpl, its
 * loop points become relative to its first frame, and its type gets the 0x10 Vorbis flag.
 * Quality 6 renders the same audio through alphaTab's synth (correlation > 0.999).
 */
function compressToSf3(buffer) {
  const chunkBytes = (chunk) => buffer.subarray(chunk.start - 8, chunk.end + (chunk.end - chunk.start) % 2);
  const riff = (id, data) => {
    const head = Buffer.alloc(8);
    head.write(id, 0, "ascii");
    head.writeUInt32LE(data.length, 4);
    // alphaTab's RIFF reader does not skip pad bytes, so every chunk must be even already.
    if (data.length % 2) throw new Error(`odd ${id} chunk`);
    return Buffer.concat([head, data]);
  };
  const list = (type, ...chunks) => riff("LIST", Buffer.concat([Buffer.from(type, "ascii"), ...chunks]));

  const info = findChunk(buffer, 12, buffer.length, "LIST", "INFO");
  const sdta = findChunk(buffer, 12, buffer.length, "LIST", "sdta");
  const pdta = findChunk(buffer, 12, buffer.length, "LIST", "pdta");
  const smpl = findChunk(buffer, sdta.start + 4, sdta.end, "smpl");
  const shdr = findChunk(buffer, pdta.start + 4, pdta.end, "shdr");
  const headers = Buffer.from(buffer.subarray(shdr.start, shdr.end));

  const streams = [];
  let offset = 0;
  // 46-byte records; the last one is the terminal "EOS" sentinel.
  for (let record = 0; record + 46 <= headers.length - 46; record += 46) {
    const [start, end, loopStart, loopEnd, rate] = [20, 24, 28, 32, 36].map((at) => headers.readUInt32LE(record + at));
    const pcm = buffer.subarray(smpl.start + start * 2, smpl.start + end * 2);
    const ogg = execFileSync(
      "ffmpeg",
      ["-v", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", "pipe:0",
        "-c:a", "libvorbis", "-q:a", "6", "-f", "ogg", "pipe:1"],
      { input: pcm, maxBuffer: 1 << 30 },
    );
    streams.push(ogg);
    headers.writeUInt32LE(offset, record + 20);
    headers.writeUInt32LE(offset + ogg.length, record + 24);
    headers.writeUInt32LE(Math.max(0, loopStart - start), record + 28);
    headers.writeUInt32LE(Math.max(0, loopEnd - start), record + 32);
    headers.writeUInt16LE(headers.readUInt16LE(record + 44) | 0x10, record + 44);
    offset += ogg.length;
  }
  if (offset % 2) streams.push(Buffer.alloc(1));

  const pdtaChunks = [];
  for (let at = pdta.start + 4; at + 8 <= pdta.end; ) {
    const id = buffer.toString("ascii", at, at + 4);
    const size = buffer.readUInt32LE(at + 4);
    pdtaChunks.push(id === "shdr" ? riff("shdr", headers) : chunkBytes({ start: at + 8, end: at + 8 + size }));
    at += 8 + size + (size % 2);
  }
  const body = Buffer.concat([
    Buffer.from("sfbk", "ascii"),
    chunkBytes(info),
    list("sdta", riff("smpl", Buffer.concat(streams))),
    list("pdta", ...pdtaChunks),
  ]);
  return riff("RIFF", body);
}

async function installNylonGuitars() {
  await mkdir(nylonDir, { recursive: true });
  const manifest = [];
  const missing = [];

  for (const guitar of NYLON_GUITARS) {
    const target = path.join(nylonDir, `${guitar.id}.sf3`);
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
        const compressed = compressToSf3(buffer);
        await writeFile(target, compressed);
        const summary = presets
          .map((preset) => `"${preset.name}" ${preset.renumbered ?? `${preset.bank}/${preset.program}`}`)
          .join(", ");
        const stereo = presets.unlinked ? `, ${presets.unlinked} stereo samples split to mono` : "";
        console.log(`[soundfont] installed ${guitar.label} (${Math.round(buffer.length / 1e6)}MB → ${(compressed.length / 1e6).toFixed(1)}MB): ${summary}${stereo}`);
      } catch (error) {
        console.error(`[soundfont] skipped ${guitar.file}: ${error.message}`);
        continue;
      }
    }

    manifest.push({ id: guitar.id, label: guitar.label, url: `/sounds/${guitar.id}.sf3` });
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
