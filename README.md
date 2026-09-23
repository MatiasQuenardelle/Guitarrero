# Guitarrero

A local guitar practice app: a text-tab viewer with chord diagrams (`/`), a Duolingo-style
classical guitar path (`/learn`), and **Studio** (`/studio`) — turn a YouTube tab video into
a playable Guitar Pro–style score.

```bash
npm install     # also copies the alphaTab runtime into public/alphatab/
npm run dev     # http://localhost:3000
```

## Studio

Paste a YouTube URL at `/studio` and the pipeline runs:

1. **Download** — `yt-dlp` fetches the video stream only (no audio needed).
2. **Find the tab** — Claude looks at three stills and returns the bounding box of the
   tablature staff.
3. **Screenshot** — `ffmpeg` crops that box and keeps a frame on every scene change (and at
   least every 2s), then drops copies of a page already kept. Pages are compared on their
   black ink only, so a moving playback cursor or highlighted notes don't count as a new
   page, and frames that are one view scrolled sideways are thinned to what covers the music.
4. **Read** — the frames go to Claude in small batches through the Claude Code CLI
   (`claude -p`), which returns validated JSON per bar: strings, frets, durations, and
   playing techniques (hammer-ons/pull-offs, slides, harmonics, vibrato, let ring, palm
   mute, ghost and dead notes, staccato, accents, trills, grace notes, strums, ties).
5. **Build** — the JSON is converted to alphaTex and rendered by
   [alphaTab](https://alphatab.net) as notation + tab, with a playback cursor, speed
   control from 25%, metronome, count-in and bar looping.

Everything lands in `.data/projects/<videoId>/` (gitignored): `video.mp4`, `frames/`,
`meta.json`, `tab.json`, `tab.alphatex`.

### Running the pipeline from the terminal

```bash
node scripts/ingest.ts "https://www.youtube.com/watch?v=..."
node scripts/ingest.ts <url> --crop 0,0.62,1,0.36   # skip crop detection
node scripts/ingest.ts <url> --from transcribe      # reuse the existing screenshots
node scripts/ingest.ts <url> --from transcribe --repair     # re-read only bars that don't add up
node scripts/ingest.ts <url> --from transcribe --fill-gaps  # re-read only pages with missing bars
node scripts/slug.ts [<id|slug> <new-slug>]   # readable URLs: /studio/clair-de-lune (stored in meta.json)
python3 scripts/check-tab.py <projectId>   # runs automatically at the end of ingest; no model: fix wrong strings from page geometry → <projectId>-checked
# Images go to the model through the Read tool (GUITARRERO_ATTACH=read, default), 3 pages per call:
# inlined @ mentions put ~35% of notes on the wrong string.
node scripts/validate-tex.ts .data/projects/<id>/tab.alphatex --bars
```

Environment flags: `GUITARRERO_MODEL` (default `opus`; `sonnet` is ~3x faster and less
accurate), `GUITARRERO_BATCH` (frames per call, default 3), `GUITARRERO_DATA` (default
`.data`), `GUITARRERO_YT_COOKIES=1` (use Chrome cookies for restricted videos).

Playback uses the MuseScore General soundfont — run `npm run soundfont` once to fetch it
(38MB, MIT licensed). Without it the player falls back to alphaTab's much thinner bundled
General MIDI set. The toolbar's **Sound** dropdown switches instrument for playback only.

### Fixing mistakes

Transcription gets fret numbers right far more often than rhythms. The player flags any bar
whose durations don't add up to its time signature, shows the source screenshots next to the
score, and has a built-in alphaTex editor that re-renders as you type. Notes are
`fret.string.duration` with string 1 = high E; chords are `(0.1 2.2).4`; bars end with `|`.

### Not yet

The score is not synced to the video — playback comes from alphaTab's synthesizer. Frame
timestamps are already stored, which is what a sync-point based v2 would need.
