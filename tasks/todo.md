# Guitarrero Studio — YouTube → tab → Guitar Pro-style player

Plan: `~/.claude/plans/foamy-popping-owl.md`

## 1. Foundation
- [x] Add `@coderline/alphatab` dependency
- [x] `postinstall` copies alphaTab dist (js, font, soundfont) into `public/alphatab/`
- [x] Gitignore `.data/` and `public/alphatab/`
- [x] Shared types + project paths helper (`src/lib/studio/`)

## 2. Pipeline (plain Node TS scripts, no dev server)
- [x] `fetch-video.ts` — yt-dlp, video-only ≤1080p + metadata
- [x] `detect-crop.ts` — sample frames, Claude finds the tab bounding box
- [x] `extract-frames.ts` — ffmpeg crop + scene detect + dHash dedupe, keep timestamps
- [x] `transcribe.ts` — `claude -p` in batches of 4 frames, validated JSON out
- [x] `to-alphatex.ts` — deterministic JSON → alphaTex
- [x] `ingest.ts` — orchestrator with progress written to `status.json`
- [x] `lint.ts` — flags bars whose durations don't match the time signature

## 3. Player UI
- [x] `/studio` — URL input, project list, live pipeline progress
- [x] `/studio/[projectId]` — alphaTab score+tab, cursor, auto-scroll
- [x] Transport: play/pause, 25–100% speed, metronome, count-in, bar loop
- [x] alphaTex editor with live re-render + save to disk
- [x] Frame filmstrip with links back to the moment in the video
- [x] API routes: ingest, status, project read, tex save, frame images
- [x] Studio link in the app header

## 5. Round two (after first real use)
- [x] Visible playhead: bar highlight + vertical beat cursor + highlighted notes
- [x] Better sound: MuseScore General soundfont (`npm run soundfont`) + instrument picker
- [x] Playing techniques end to end: hammer/pull, slides, harmonics, vibrato, let ring,
      palm mute, ghost, dead, staccato, accents, trills, taps, bends, grace, strum, ties
- [x] Transcription on Opus with 3 frames per call, batches run 6-wide in parallel
- [x] Re-reading a tab no longer hides the score that's already there
- [x] Tuplet support end to end (prompt → JSON → alphaTex → linter)
- [x] Full-screen practice mode (F key, auto-hiding toolbar, ~22 bars on screen)
- [x] Overfull bars squeezed to fit so playback never skips notes
- [x] `scripts/rebuild-tex.ts` regenerates a score from tab.json with no model calls
- [x] Chopin nocturne transcribed with the new pipeline (116 bars, 7 bad bars, was 17)
- [ ] Lágrima re-transcribed with the new pipeline (still on the pre-technique read)

## 6. Cutting the transcription bill
- [x] Measure where the tokens actually go (`usage` from `claude -p --output-format json`)
- [x] Strip the agent off the vision call: own `--system-prompt`, `--tools ""`,
      `--setting-sources ""`, `--strict-mcp-config`
- [x] Attach frames as `@name` mentions instead of letting the model call `Read`
- [x] Split the transcription prompt into a constant system half and a tiny per-batch half
- [x] Drop blank frames and dedupe pages with a 256-bit dHash against every page kept
- [x] Cache batch replies on frame content hashes (`transcribe-cache.json`)
- [x] Print tokens and cost at the end of every ingest (`usageSummary()`)
- [x] Pin `--effort medium`: the CLI default spent 39.4k output tokens on one 3-frame batch
- [x] Batch 6 frames per call — deliberation is a fixed cost per call, not per frame
- [x] Cache verified: second run makes 0 model calls, $0.00, identical bars
- [~] Scroll-aware dedupe prototyped and reverted — could not prove frame coverage
- [x] Next real ingest confirms the printed bill — Clair de Lune, 51 frames, 9 calls, $6.44

## 7. Clair de Lune (lesson video, 2026-09-20)
- [x] `--start/--end` so a lesson's talking intro is never decoded or read (saved ~45% of frames)
- [x] `--stop <stage>` to inspect frames before paying for transcription
- [x] Non-standard tuning end to end — the score prints `6th=D`, detected and rendered
- [x] `bar-numbers.ts`: a cheap dedicated pass reading the printed bar number per frame
- [x] Bars ordered and deduplicated by printed number, not by reading order
- [x] `--fill-gaps` re-reads only the screenshots whose bars are missing
- [x] Tempo reads its note value: "♪ = 84" was rendering as ♩=84, twice the speed
- [x] `score-header.ts` — title, composer, tempo, time signature and tuning in one cheap call
- [x] Prompt defines simultaneity geometrically (same horizontal position, not "sounds together")
- [x] Per-call prompt states the piece's time signature so bars stop inventing changes
- [x] Re-transcribed with the hardened prompt: **72/72 bars, no gaps, no bad bars** (was 66/72
      with 6 missing and 4 that didn't add up), $6.25

## 4. Verification
- [x] End-to-end pipeline run on a real video (Lágrima, 153s → 24 bars)
- [x] alphaTex round-trip check via AlphaTexImporter (`scripts/validate-tex.ts`)
- [x] Accuracy spot check against source frames (bar 1 exact; 23/24 bars rhythmically consistent)
- [x] `npm run build` clean
- [x] Matías runs the dev server himself (port 3001) and practises from `/studio`

## Review

**What was built.** A local pipeline and player: paste a YouTube URL at `/studio`, and the
app downloads the video, finds the tab strip, extracts deduplicated screenshots, has Claude
read them, and renders the result as a real score (notation + tab) with a playback cursor,
speed control, metronome, count-in and bar looping.

**Result on the test video** (`Lagrima / F.Tarrega TAB`, 2:33):
- 10 screenshots kept from ~4 600 frames
- 24 bars transcribed in 3 Claude calls (~45s each)
- bar 1 matched the screenshot note for note; 23 of 24 bars add up to 3/4 (bar 24 is long —
  flagged in the UI)
- total ingest time ≈ 4 minutes, no API key, no per-token cost

**Design notes.**
- The pipeline is CLI-first (`node scripts/ingest.ts <url>`); API routes just spawn it. That
  keeps everything testable without a dev server.
- alphaTex is generated deterministically from validated JSON, so the model can only get
  music wrong, never syntax.
- alphaTab loads from `public/alphatab/` via a script tag, avoiding Turbopack's handling of
  its web worker and audio worklet.

**Round four: Clair de Lune, and what a wrong note costs (2026-09-20).**
Matías heard the very first bar was wrong. Two causes, and the difference between them is the
whole argument for small single-purpose passes:

- The **tempo** was ♪ = 84 and we emitted `\tempo 84`, which alphaTab counts in quarters — the
  piece played at double speed. It lives in `score-header.ts`, its own $0.03 call, so fixing it
  cost $0.03.
- The **first chord** stacked two consecutive eighths that a beam joined but a visible gap
  separated. That one is in the transcription prompt, so fixing it meant a prompt version bump
  and re-reading all 51 frames: $6.25.

The re-read was worth it beyond bar 1: adding "answer for every screenshot" and pinning the
piece's time signature took the score from 66 bars with 6 gaps and 4 bad bars to **72 bars, no
gaps, nothing that doesn't add up**, 990 notes through the importer.

**Round three: the transcription bill (2026-09-20).**
Measured per 3-frame batch, then fixed, on the Chopin frames:

| | before | after |
|---|---|---|
| input per batch | 55 590 tok (4 turns) | 4 400 tok (1 turn) |
| output per batch | 39 400 tok | 16 200 tok |
| cost per batch | ~$1.30 | $0.45 |
| frames per batch | 3 | 6 |
| **whole Chopin (60 frames)** | **20 calls, ~$26** | **10 calls, ~$5.5** |

Two independent causes. The agent session — default system prompt, every tool schema, the
user's CLAUDE.md — was 26 329 tokens re-sent on all 20 calls, and routing images through the
`Read` tool made each batch 4 turns that each re-sent the images. Then, once the input was
small, deliberation turned out to be the bigger half: `--effort medium` halves the output
with no reading errors, while `--effort low` is 7x cheaper but put a bass note on the wrong
string. Batching 6 frames instead of 3 amortises what's left.

Re-running is now free where nothing changed: batch replies are cached on the frames' content
hashes, so re-cropping, editing the prompt or retrying a failure only pays for what moved.

**Known limits (v1, by design).**
- The tab is not synced to the video; playback is the synthesizer. The frame timestamps
  needed for `applyFlatSyncPoints` are already stored for a v2.
- Continuously scrolling tab videos may produce duplicated or missing bars; page-flip style
  videos (the common case) work well. The Chopin is a scrolling one, so its frames overlap and
  roughly half the reading is paid twice — a scroll-aware selector was tried and reverted
  because it could not prove it wasn't skipping music (see `lessons.md`).
- Rhythm is the weakest part of the transcription — hence the bar-length warnings and the
  built-in editor.

## 8. Cheaper and more accurate, round two (2026-09-20)
Measured first: on Clair de Lune 22 of 51 frames were a page already kept, with only the
playback cursor moved — the dHash counts the cursor as a new page. Replaying the cached
readings with those 22 dropped still gives 72/72 bars, no gaps, nothing that doesn't add up.
- [x] Cursor-proof page dedupe: background-relative ink map (max channel, so coloured
      overlays vanish), weighted-Jaccard distance. Same page ≤0.23, different page ≥0.48 → 0.3.
      Clair de Lune 51 → 29 frames, Lágrima 10 → 7
- [x] Among copies of a page keep the one with the least colour on it (cursor off the notes)
- [x] Scroll overlap: 2D ink alignment finds the sideways offset (true scroll 0.04-0.50, no
      overlap ≥0.83, page flips ≥0.48 → 0.4). Only drops a frame whose offset was measured.
      Chopin: just 5 frames — the video jumps 0.6 of a screen at a time, so it was never 2x
- [x] Frame cap 60 → 80 and never silent: the Chopin has 64 real pages and 4 were being cut
- [x] Cache readings per frame, not per batch, written after every call — dropping or adding
      one frame no longer re-pays for the other five, and a crash keeps what was paid for
- [x] Repeated readings of a bar: keep the one that adds up, not simply the first
- [x] `--repair`: re-read only the screenshots whose bad bars reached the score, telling the
      model which bar and by how much; kept only if more bars add up; cached, so self-limiting
- [x] Clair de Lune cache migrated (backup beside it); Chopin and Lágrima predate the cache
- [x] Verify: replay from cache = byte-identical tab.json and alphaTex, 0 calls, $0.00;
      repair path driven end to end with a stub `claude`; `npm run build` and eslint clean
- [ ] `--repair` against the real model — not run, it spends. Chopin has 7 bad bars to try it on

## 9. La Paloma + Vals Venezolano No. 2 (2026-09-20)
- [x] Dedupe bug: a written-out repeat differs only by its bar number — full-resolution block
      check added; La Paloma 12 → 13 frames, bar-16 line back
- [x] La Paloma: 57/57 bars, no gaps, $1.76. Pickup bar now padded in front, not behind
- [x] `--time 3/4` for scores that print no time signature
- [x] `stitchBars`: joins unnumbered scrolling frames by fret content + measured scroll offset
- [x] Vals Venezolano No. 2: first pass only (`--end 1:30`), 31 frames, 66 bars, $2.64
- [ ] Vals: rhythm is inferred from spacing (tab only) and tempo is the default 90 — check by ear
- [ ] Vals: the model disagrees with itself on string 1 vs 2 in places — check against the video

## 10. Vals Venezolano No. 2, corner-panel video (2026-09-20)
- [x] Detail check in pixels not width fractions; 3% margin; 1 px edge tolerance
- [x] Transition frames dropped; frames without a staff dropped; sampling every 2 s
- [x] Small frames doubled in size after selection (652 → 1304 px)
- [x] Stitch rewinds up to 3 bars for a re-shown view (needs two matching bars)
- [x] 78 → 38 frames; 36 bars in 6/8, 35 add up; $3.17 + $0.30
- [ ] Bars 35-36 look like a second reading of 31-32 from the final view — check and delete
- [ ] Repeat signs / voltas are not represented; the score is one linear read-through
- [ ] Tempo is the default 90 (none printed)

## 11. String checker (2026-09-21)
- [x] `page_reader.py`: tab lines, glyphs, per-video digit templates — no model, numpy + Pillow
- [x] `check-tab.py`: align page ↔ reading, move notes to the string the page shows, flag the rest
- [x] Control: 0/187 moved on Lágrima, 2/1652 on the trusted Chopin; 6 eyeballed Moonlight bars exact
- [x] `<id>-checked` projects written for Moonlight, Clair de Lune, La Paloma, both Vals
- [ ] Matías A/Bs the checked tabs by ear before anything replaces an original
- [ ] Run the checker inside `ingest.ts` after transcription (port to TS or shell out)
- [ ] Find why the cheap method miscounts lines: `@` mention vs Read tool image resolution?
- [ ] Digit templates: 3/8 confusion on Clair de Lune inflates its review list (66 bars flagged)
- [ ] Chopin remake: page reader could drive the scrolling assembly (exact bar content per view)

## 12. Clair de Lune remake (2026-09-22)
- [x] Cause of wrong strings found: `@` mention attachments (71%/62% right) vs Read tool (95%) — `GUITARRERO_ATTACH=read`
- [x] Remake via Read, 3/batch, from scratch: 72/72 bars, all add up, 6/826 notes off-string by the page check; $2.20 + $0.30 tests
- [x] Opening frames without a printed number are stitched by content, then numbered (bar 3 was lost)
- [x] stitch: largest overlap when no scroll is measured (|k-∞| bug); removes the duplicate bar 36 on Vals (Andreina) on re-assembly
- [x] Installed as `bHSj9yxKl5k-remake`; original untouched
- [ ] Matías A/Bs the remake by ear; then decide whether to re-read Moonlight, La Paloma, both Vals via Read
- [ ] Make `read` the default attachment once he confirms
- [x] Matías approved the remake by ear (2026-09-22); it is now `bHSj9yxKl5k`, old tab in `.data/retired/`
- [x] `read` attachment + 3/batch are the defaults now

## 13. Readable studio URLs (2026-09-22)
- [x] `/studio/<slug>` (e.g. `clair-de-lune`); ids still resolve and 307 to the slug; API stays on ids
- [x] Slug stored in meta.json (`scripts/slug.ts`), auto-derived from the title otherwise, unique in creation order
- [x] Explicit slugs set for Chopin (`nocturne-op9-no1`), both Vals, and the `-checked` copies

## 14. Turkish March (2026-09-22)
- [x] Ingested with the approved method: 111 bars read, $1.86; 73-76 and 81-84 are repeats written out
- [x] Pickup + unnumbered opening numbered backwards from the printed 5 (real bar 5 was dropped) → 120 bars incl. pickup
- [x] Grace notes: prompt v5 (own beat), zero duration in bar sums; 3 pages re-read (~$0.3)
- [x] `GUITARRERO_OFFLINE=1` guard for re-assembly/regression runs
- [x] `turkish-march` (raw) and `turkish-march-checked` (47 strings moved; bass 0 on string 5 confirmed by eye)
- [x] Matías kept the checked version (2026-09-22); raw in `.data/retired/`
- [x] `check-tab.py` warns about page bars the score has no match for; `ingest.ts` runs it at the end
- [ ] Detect repeats from frame timing (line on screen ~2x + number jump) instead of patching tab.json by hand
- [ ] First frame (158 s) has the hand-diagram overlay over its right third; bar 4 read fine but worth a glance
- [ ] Bar numbers in the viewer are +1 vs the score on pieces with a pickup (alphaTab `\ac` doesn't renumber)
- [ ] Re-apply the written-out repeats automatically on re-assembly (today: manual patch of tab.json)

## Natural nylon playback (2026-09-22)
- [x] Strings ring until re-plucked / a rest / 4 s (MIDI reshaped in `midiLoad`, `naturalPlayback.ts`)
- [x] Humanised dynamics (bass + melody over inner voices, downbeat accent, deterministic jitter)
- [x] Chords rolled bass-first (6 ms/string, ≤24 ms) + ≤5 ms late-only timing jitter
- [x] Natural / Strict toggle for A/B; instrument menu removed — always nylon (program 24)
- [x] Dedicated nylon soundfonts: `npm run soundfont` installs them from ~/Downloads, renumbers to 0/24, writes manifest; "Guitar" menu when >1
- [ ] Matías downloads the candidates and picks one by ear; prune the rest

### Review
Verified offline on all 12 tabs in .data/projects: every note-on keeps its note-off, events stay
sorted, no zero-length notes, ~95% of notes mapped to their string; avg sounding length
0.55 → 1.9 quarters. `tsc`, eslint and `npm run build` clean. Audio itself not heard — needs his ears.
