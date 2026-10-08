# Lessons

## yt-dlp: HTTP 403 on download means "update yt-dlp" (2026-09-19)
Metadata (`--dump-json`) succeeded while the actual download failed with
`ERROR: unable to download video data: HTTP Error 403: Forbidden`. Alternate extractor
clients (`--extractor-args "youtube:player_client=tv"`) made it worse
("The page needs to be reloaded"). The fix was simply `python3 -m pip install -U yt-dlp`
(2026.07.04 → 2026.08.19).

**Rule:** on a yt-dlp 403, update the tool first, before trying cookies or extractor args.
Chrome's cookie database is not readable from this sandbox anyway
(`~/Library/Application Support/Google/Chrome` reads as empty), so
`--cookies-from-browser chrome` is not a fallback here — it only works when Matías runs it
himself in a terminal with Full Disk Access.

## alphaTab: verify alphaTex syntax with the importer, don't guess (2026-09-19)
Running `AlphaTexImporter` in Node on a five-line sample confirmed the whole syntax
(`\staff{score tabs}`, `\tuning`, `\ts`, `fret.string.duration`, `(…).4` chords, `r.4`
rests, `{d}` dots, `-` ties) in one shot, and revealed that alphaTab's internal
`note.string` numbering is the reverse of alphaTex's (tex string 1 = high E = internal 6).
Cost: one 20-line script. `scripts/validate-tex.ts` is the permanent version.

## TypeScript target blocks BigInt literals (2026-09-19)
`0n` in a script failed `next build` with "BigInt literals are not available when targeting
lower than ES2020" — the Next default `tsconfig` target was ES2017. Bumping to ES2020 is
safe (tsconfig target only affects type checking; SWC handles the actual transpile).

## Image reads are expensive — measure quality with code instead (2026-09-19)
Instead of reading dozens of frames to judge transcription accuracy, two checks did the job
for almost nothing: pairwise dHash distances to reveal duplicate/repeated lines, and
`findBarIssues()` to count bars whose durations don't add up to the time signature
(23 of 24 bars were consistent). Read one or two frames to confirm, not twenty.

## alphaTab: cursor needs CSS, and it must not depend on the CSS pipeline (2026-09-19)
alphaTab creates `.at-cursor-bar` / `.at-cursor-beat` elements but ships no styles, so the
playhead is invisible until you style them. Worse, when the rules were added to
`globals.css` the running Turbopack dev server kept serving a **stale CSS chunk** — the
rules were in the file and compiled fine through Tailwind directly, but never reached the
browser (`touch` didn't help; only a restart would). Moving the rules into a `<style>` tag
inside the component fixed it instantly and keeps them with the code that needs them.

**Rule:** when CSS "doesn't apply", check the *served* stylesheet
(`curl <page> | grep -o '/_next/static/.*\.css'` then curl it) before touching selectors.

## alphaTex: note effects go before the duration, beat effects after (2026-09-19)
`3.3.8{h}` fails; `3.3{h}.8` works. Note properties (h, sl, ss, nh, ah, v, g, lr, pm, st,
ac, hac, tr, t, b) attach to the note; beat properties (d, gr, su, sd, tu) attach after the
duration. Several tokens share one brace: `5.2{lr st ac}.4`. A few names exist in both
sets (`v`), which is why one guess appeared to work and the rest failed. The token list
lives in `AlphaTex1LanguageDefinitions.noteProperties` / `.beatProperties` in the dist
bundle — read it there instead of hunting docs.

## Transcription batches are independent — run them in parallel (2026-09-19)
Chaining each batch to the previous one's bars (for context) forced sequential calls: on
Opus that's ~3 min per batch, an hour for a 7-minute video. Dropping the chaining and
telling the model "consecutive screenshots often show the same line — transcribe it once"
made batches independent, so 6 run concurrently (~4x faster). Sequence only when the later
call genuinely cannot be written without the earlier result.

## An overfull bar doesn't stretch — it collides with the next one (2026-09-19)
Matías reported playback "skipping about 5 notes" when crossing a barline. Cause: alphaTab
places each master bar at a fixed tick from the time signature, so a bar holding more than
its capacity has its surplus beats land *on top of* the following bar. Proved it in Node:
with 9 quarters in a 6/4 bar, the last three beats reported `absolutePlaybackStart`
11520/12480/13440 — exactly the next bar's start ticks. The cursor follows the master-bar
timeline, so it jumps ahead and those notes are lost.

**Rule:** never ship generated notation that can overflow a bar. `fitBarToSignature()` in
`scripts/pipeline/to-alphatex.ts` squeezes an overfull bar into one generalized tuplet
(e.g. 17:12 — every note still sounds, just quicker) and pads a short bar with rests, so a
misread duration degrades into "sounds rushed" instead of "notes disappear". Verify by
counting beats whose `playbackStart + playbackDuration` exceeds their bar duration; the
answer must be 0.

## Teaching the model about tuplets fixed most rhythm errors (2026-09-19)
17 of 115 bars didn't add up on the Chopin nocturne. The source frames had `11:12` and
`22:24` brackets over fast runs, which the prompt never mentioned, so the model counted 11
sixteenths as 11 sixteenths. Adding a tuplet field (`{tu n m}` in alphaTex, verified through
the importer) plus one prompt paragraph took it to 7 of 116, and it found 174 tuplet groups.
Look at what the *source notation* contains before blaming the model's reading.

## `claude -p` as a vision API: the agent session and the thinking were the bill (2026-09-20)
The Chopin ingest burned a big slice of the usage limit. Measured it instead of guessing, by
reading `usage` and `total_cost_usd` out of `--output-format json`. Two separate problems,
and the second one only became visible once the first was fixed.

**Input — the agent session, paid 20 times over.**
- An **empty** prompt through `claude -p --allowed-tools Read` costs **26 329 input tokens**:
  the agent system prompt, every built-in tool schema, and the user's CLAUDE.md.
- Passing image *paths* and letting the model call `Read` turned each 3-frame batch into **4
  turns**. Every turn re-sends the whole context, so the first image of a batch got billed
  three times: **55 590 input tokens per batch**.
- Fix: strip the agent off it — `--system-prompt <own>` `--tools ""` `--setting-sources ""`
  `--strict-mcp-config` — and attach images as `@name` mentions, which inlines them with no
  extra turn. **4 400 input tokens per batch, 1 turn. 12.6x.**

**Output — deliberation, which turned out to cost more than the input ever did.**
At the CLI default one 3-frame batch emitted **39 400 output tokens** (the JSON was ~1 500 of
them) and took **488 seconds**: $1.04. `--effort` controls this directly.

| effort | out | time | cost | reading |
|---|---|---|---|---|
| default | 39.4k | 488s | $1.04 | baseline |
| medium | 16.2k | 193s | $0.45 | same bars, bass on string 5 (correct) |
| low | 4.2k | 45s | $0.15 | same bars, bass on string 6 (**wrong**) |

`low` is 7x cheaper and reads the frets right, but puts the bass an octave off. Checked it
against a 3x zoom of the source frame — the bottom tab line is empty, so `medium` is the
floor for music worth practising from.

**Batch size then matters because thinking is a fixed cost per call**, not per frame. At
medium effort: 3 frames $0.45 (1.67 bars read per frame), 6 frames $0.55 (1.67), 12 frames
$1.03 (1.25 — it starts skipping bars). Six.

**Rules:**
- When the CLI is a plain vision call, strip the agent off it and inline the images.
- A mention with a space in it is **silently dropped** and the model then answers from
  nothing — so mention basenames and run the CLI from the images' folder.
- Set `--effort` explicitly for any repeated call. The default is tuned for hard agentic work
  and it is the single biggest line on a vision pipeline's bill.
- Batch until bars-per-frame starts falling, not until the context is full.
- Put the invariant half of a repeated prompt in `--system-prompt` so it is byte-identical
  across calls and eligible for the prompt cache.
- Cache replies on a hash of **what the model sees** (frame content + model + effort + prompt
  version), not on file paths — then re-cropping or retrying costs nothing. Verified: second
  run, 0 calls, $0.00, identical output.
- Always print the run's token/cost total (`usageSummary()`); an invisible bill never gets fixed.

## Scroll-aware frame dedupe: measured, tried, reverted (2026-09-20)
The Chopin video **scrolls continuously**, so consecutive frames show the same staff slid a
little sideways. A difference hash cannot see that — shifting an image sideways changes every
bit of it — so 60 frames were kept where ~34 would have covered the music, and the model was
paid to read the overlap twice.

Sliding one "ink per column" profile over the next to find the scroll offset cut 126
candidates to 34 in a prototype, and to 20 in the real pipeline. **The coverage check killed
it**: of 19 consecutive kept pairs, 14 could not be shown to overlap at all (best correlation
0.24-0.59). A sparse tab strip does not give the profile enough structure — a true scroll
scores ~0.5, indistinguishable from a spurious alignment, so the selector was silently
skipping music.

**Rule:** a frame selector must prove its coverage before it ships. The test is free and
needs no model: every consecutive pair of *kept* frames must demonstrably overlap. Reverted to
the 256-bit dHash, which keeps more frames but is honest about what it can tell apart. The
overlap waste is still there and still worth ~2x — it needs a better signal than column ink.

## Bar numbers: ask for them alone, never alongside the music (2026-09-20)
Lesson videos teach sections out of order, so neither reading order nor video order is the
order the music is played in. The bar numbers printed on the staff settle it — but only if
they are read properly.

Asking for `"bar"` inside the transcription prompt **does not work**. On the Clair de Lune
lesson the model returned bars 24-35 for screenshots printed 4 and 10, and 45-48 for ones
printed 10 and 22 — drifting roughly with the batch index, which the prompt helpfully ended
with ("Batch 2."). Merging on numbers like that silently deleted real bars as "duplicates".

A pass of its own, doing nothing else, got all four check frames exactly right for $0.05:
`{"numbers": [4, 10, 10, 22]}` — 21 output tokens, `--effort low`, because reading a printed
number is not work that deliberation improves. Whole video: 51 frames, $0.56.

**Rules:**
- One job per call. A cheap single-purpose pass beats a field bolted onto an expensive one.
- Never end a prompt with something the model can mistake for an answer ("Batch 2.").
- Cache the cheap pass too (`FrameInfo.bar` in meta.json). Re-assembling a score from cached
  readings must cost exactly nothing, or every fix to the assembly logic costs money.
- Verify against ground truth you already hold before trusting a new signal. Four frames read
  by eye were enough to catch this; without them the score looked plausible and was wrong.

## A transcription batch can under-read in silence (2026-09-20)
One six-frame call on the Clair de Lune answered for only its last two screenshots: 4 bars
back for 6 pages, no error, no warning. Bars 36-44 simply vanished. With batches of 6 there is
no per-frame accounting, so nothing catches it.

The printed bar numbers do. A missing bar belongs to the screenshot with the highest printed
number at or below it, so `--fill-gaps` re-reads exactly those pages and nothing else — 6
frames, one call, $0.79, and 60 bars became 66. It is opt-in because it is the only place the
pipeline spends without being asked, and it is self-limiting: a second run hits the cache.

**Rule:** a pipeline that reads N things must be able to say which of the N it actually read.
Report coverage, don't assume it.

## A tempo mark is a note value AND a number (2026-09-20)
Clair de Lune is marked **♪ = 84** — eighth notes. The prompt asked for `"tempo": 90` with no
unit, the model returned 84, and alphaTab counts quarter notes, so the piece played at exactly
twice its speed. Matías heard it in the first bar.

**Rule:** never read a tempo without its note value. `score-header.ts` asks for
`{"note": "eighth", "bpm": 84}` and converts: eighth → ×0.5, dotted-quarter → ×1.5, half → ×2.
Same trap for any unit the model isn't asked to name.

Fixing it cost $0.03 because it lives in its own cheap pass — a field on the transcription
prompt would have meant a version bump and a $6.44 re-read. **Put the global facts of a score
(title, composer, tempo, time signature, tuning) in a small pass of their own**: they are read
once, they are cheap, and they are the things most likely to need correcting later.

## "Merge notes that sound together" is not a definition (2026-09-20)
The prompt said to merge two notated voices into one beat when they "sound together". In bar 1
of Clair de Lune the bass chord and the melody note are consecutive eighths joined by one beam
— visibly apart on the page — and the model stacked them into a single chord. The very first
attack of the piece was wrong.

**Rule:** define simultaneity geometrically, because that is what the model can actually see:
*same horizontal position = same beat; a visible gap = separate beats, even under one beam.*
A beam groups notes that follow one another; it never stacks them.

Also pin what shouldn't vary. The same read invented 3/4 and 4/4 bars inside a 9/8 piece, so
the per-call prompt now states the piece's time signature (known from the heading pass) and
says only a printed change on the staff overrides it.

## The playback cursor was half the bill (2026-09-20)
Asked to make the pipeline cheaper after the agent/effort/batching work was already done, the
win was not in the model call at all. `meta.json` already held the printed bar number of every
frame, and just printing them in a row showed it: `4 4 4 4 7 7 7 7 … 61 61 61 61 61`. One image
read of the five "61" frames confirmed they were one page with the blue cursor in five places.
A grayscale dHash sees a cursor as a new page; 22 of 51 frames, ~43% of $6.25, were re-reads.

Fix: compare pages on the **brightest colour channel**, relative to the background. A coloured
overlay is nearly as bright as paper on its brightest channel, black notation is not, so the
cursor drops out. Scored against the bar numbers as labels: same page ≤0.11, different ≥0.51.
Then proved coverage for free by replaying the cached readings with only the kept frames:
still 72/72 bars, no gaps.

**Rules:**
- Look at the data you already paid for before designing anything. Labels for a free
  evaluation were sitting in meta.json.
- Prove a frame selector by replaying cached readings through the merge, not by eye.
- Cache per unit of work (frame), not per call (batch). A per-batch key turns "drop one frame"
  into "re-pay for everything after it", which makes every improvement to selection cost money.
- An estimate is not a measurement: the Chopin's "~2x scroll overlap" was really 8%, because
  the video jumps 0.6 of a screen at a time. 2D ink alignment did find the offsets where the
  1D column profile could not (true 0.04-0.50 vs ≥0.83), so the selector is kept — it is safe
  by construction — but it was not the win it was assumed to be.
- A cap that drops input must say so. `maxFrames: 60` was silently cutting 4 pages of Chopin.
- Test a paid code path with a stub binary on PATH: a fake `claude` that records its stdin
  and returns a canned envelope exercised `--repair` end to end for $0.

## Music repeats — a page dedupe must see the bar number (2026-09-20)
First real ingest after the cursor-proof dedupe (La Paloma) lost a whole line: bars 16-20 are
bars 6-10 again note for note, so the page differs only by the printed "16" and the thumbnail
distance called it a copy. Caught only because the contact sheet's line numbers read
1, 6, 11, **21**. The old dHash had the same hole. Fix: a copy must also pass a full-resolution
block test with coloured pixels masked (copies ≤35 differing px per block, "6"→"16" alone 82).

**Rule:** after extracting frames, glance at the printed bar numbers on one contact sheet
before paying for transcription. A gap there is free to find and expensive to find later.

## Tab-only scrolling videos: stitch by frets, note by note (2026-09-20)
Vals Venezolano No. 2 prints no staff, no bar numbers, no time signature, and plays the piece
twice (normal, then slow — `--end` halves the bill). With no numbers, overlapping frames are
joined by content (`stitchBars`), with the measured scroll offset choosing between overlaps
when a bar repeats back to back. Matching on string+fret per beat failed in real data twice:
the model put the same bar on string 1 in one frame and string 2 in the next, and stacked a
bass note under the melody in one reading but before it in the other. Matching on the flat
sequence of **frets only** fixed both: 74 bars with duplicates → 66 clean, for $0 from cache.

**Rule:** match readings on what the model reads most reliably (fret digits), not on
everything it returns. And pass `--time` when the score prints no time signature.

## Player controls should speak musician, not software (2026-09-20)
The first speed control showed percentages (25%–200%); Matías asked for something "more
musician like". It now shows the tempo as `♩ = 96`, steps in 5 BPM like a metronome, and
marks the written tempo.

**Rule:** in Studio / player UI, express values in musical units (BPM, bars, note values)
by default — percentages and ratios stay internal.

## Corner-panel Vals: four extraction bugs, and one wrong diagnosis (2026-09-20)
A small tab panel in the corner of a lesson video (652×454, notation + tab, views that hop
every ~3 s, each section played twice, a talking interlude in the middle). 78 frames kept
where 38 were distinct. What was actually wrong, each found by measuring, not guessing:
- **Thresholds scaled to frame width.** The detail check's block size and threshold were
  fractions of the width, so a narrow crop got 13 px blocks and a threshold of 10 and noise
  kept every copy. Glyphs are as big as the video drew them — use pixels.
- **The crop box is an estimate.** A sliver of the guitar video sat inside it and never stopped
  changing. Ignore a 3% margin when comparing pages.
- **Tint drift between play-throughs** made glyph edges flicker across the ink threshold. A
  differing pixel now only counts if the other frame has no ink next to it (copies 0-6,
  "6"→"16" still 63+).
- **Scene-change samples land on transitions.** A frame caught mid-jump nearly matches a page,
  fails the detail test and is kept as new. Tell: the very next sample is a clean copy of the
  page it nearly matched, and nothing ever matched the sample itself.
- Junk frames (title cards, hands, fades) have 0-4 full-width lines; every real page of all six
  videos has 9-12. `STAFF_LINES = 6` dropped 47 frames that used to be sent to the model.
  Count the lines at full resolution — downscaled to 640 px, thin grey staff lines vanish and
  two videos lost every frame. Run the six-video regression after every extraction change.

**The wrong diagnosis:** I compared section B against the *other* video's transcription,
concluded three bars were missing, blamed the dedupe and built a `--linear` mode. One look at
the frames showed this edition simply has three arpeggio bars, not six. Removed the flag.
**Rule:** ground truth is the source frames, never another transcription. Look before building.

The stitch also learned to rewind: a view re-shown after an interlude overlaps the score a few
bars *before* its end. Only accepted when at least two consecutive bars match — with one, fuzzy
matching swallowed six real bars of repeated music.

## Don't ship a native `<select>` as visible UI (2026-09-20)
The first tab switcher was a styled native `<select>`; Matías: "quedó bastante feo". The OS
popup ignores the app's dark theme and can't show thumbnails or status. Replaced with
`TabSwitcher` (title button + popover with thumbnails, filter, keyboard nav).

**Rule:** for any user-facing picker in this app, build a themed component from the start
and check it with a screenshot before presenting — a green typecheck says nothing about looks.

## alphaTab cursors paint over page-level popovers (2026-09-20)
alphaTab gives its cursor layer a high z-index, so the amber bar highlight showed through
the switcher menu. Fix: `isolate` on the ScorePlayer shell to contain its stacking context,
rather than an arms race of z-index values on every menu.

## Turbopack dev server can serve a stale *server* module too (2026-09-20)
After adding `markOpened` to `src/lib/studio/server.ts`, the new API route kept failing with
`markOpened is not a function` while another route already saw the file's other changes
(`openedAt` in the list). `touch` didn't help. Same family as the stale-CSS lesson above.

**Rule:** when a new export "is not a function" in dev but `tsc` passes, don't debug the
code — verify the logic directly (`node --experimental-strip-types -e 'import(...)'`) and
ask Matías to restart the dev server.

## Scrolling score with printed numbers: read the number with each bar (2026-09-20)
Remaking the Chopin nocturne went wrong twice before it went right, all on the same 60 frames:

| assembly | bars (truth: 70) | what broke |
|---|---|---|
| left-edge number per frame (`bar-numbers.ts`) | 102, 53 "unplaced" | a scrolling window starts mid-bar, so the number "at the left edge" belongs to a later bar; low effort also misread ~10% of the tiny grey digits (22, 24, 31 out of sequence) |
| `stitchBars` by content | 88 | the middle section repeats the same bar 3-4 times, and the model often returned 1 bar for a window showing 3, so overlaps neither matched nor could be told from real repeats |
| **number read with each bar** | **70, no gaps** | — |

This does not contradict "ask for bar numbers alone". That failure was a *counting* task: a
paged score prints one number per line and the model had to infer the rest. Here a number is
printed at every barline, so it is a label sitting next to the thing being read. The rule is
about inference, not about the field.

What made it work (`numbered` mode in `transcribe.ts`, scrolling + numbers detected only):
- per-call prompt: number = the one printed at the bar's start, never counted; skip bars cut by
  the window edge (a neighbour shows them whole); transcribe bars again even if already seen.
- merge by number — fitting reading wins, then the fuller. Gaps come out *by number*
  (`MISSING 58`), and `--fill-gaps` re-reads only views that read bar n-1 or n+1: 1 call, $0.42.
- skip frames with `scroll < 0.15`: the view holds still while the cursor crosses it, so those
  are the same view again (60 frames -> 46 views).
- the last screenshot's final printed number is free ground truth for the bar count. Look at it
  before trusting any assembly.

**Remake safely:** `GUITARRERO_DATA=<scratch>` + `cp -c video.mp4` runs a whole re-ingest beside
the live project; swap files in only once it beats the old one (old kept as `tab.prev.*`).
Cost of the remake: $6.96 (wasted first read) + $5.99 + $0.42.

## "70 bars, all add up" is not "better" — Matías reverted the Chopin remake (2026-09-21)
I swapped the numbered-mode remake in because it matched the printed bar count and every bar
fitted 6/4. Matías played it and said it was **much worse**; the old 116-bar tab went back.
Both of my metrics are structural: they say nothing about whether the notes and rhythm inside a
bar are right. A merge that prefers "the reading that adds up" can even select *for* a wrong
reading that happens to sum to 6/4 over a right one that is a sixteenth off, and "skip bars cut
by the window edge" plus one-reading-per-number throws away the redundancy the old tab had.
I had also seen a string discrepancy in bar 15 on my one spot check and shipped anyway.

**Rules:**
- A remake replaces a tab Matías practises from only after *he* has compared them. Put the new
  one beside the old (its own project id / folder) and let him A/B — never swap on my metrics.
- Structural checks (count, gaps, bar sums) gate a score *out*, they never prove it *in*. Before
  claiming note accuracy, diff the new reading against the old bar by bar and eyeball the bars
  where they disagree against the frame.
- A discrepancy found in a spot check is a finding, not a footnote.
The remake is kept in `.data/projects/RrwT4NkEJsg/remake-2026-09-20/` for that diff.

## Why the Chopin remake was terrible: strings, and mostly my prompt (2026-09-21)
Matías: "if this tab was so bad then the other tabs we did with this cheaper method are likely
very bad as well". Measured instead of guessing, using his old Chopin tab as ground truth
(verified by eye on bar 44: old right, remake wrong) — match bars on fret sequence, then score
`(fret, string)` agreement. Frets (median 0.94) and rhythm (1.0) agreed; **strings did not**.
Same 6 pages (remake frames 40-45), bars with >=0.9 string agreement:

| reading | bars >=0.9 | median |
|---|---|---|
| plain prompt, medium, 6/batch (the "cheap" method) | 5/10 | 0.93 |
| **numbered-window prompt** (what I shipped) | **0/16** | **0.50** |
| plain + red 1-6 labels drawn on the tab lines | 5/9 | 0.93 |
| plain, **high** effort, 3/batch ($1.88 vs ~$0.55) | 6/16 | 0.85 |

- The remake was wrecked by the extra paragraph in the numbered prompt, not by medium effort.
  Piling a second job onto the transcription call degraded the first — the very rule the
  bar-number lesson already stated. Numbered mode is now behind `GUITARRERO_NUMBERED=1`.
- Effort is **not** the lever for strings: high effort at 3.4x the price scored the same.
- String placement is the pipeline's weak spot everywhere. Moonlight bars 33-35 (cheap method)
  are all one string too low, checked by eye. Line labels fixed those (5/6 bars right vs 2/6),
  and the model follows labels faithfully — a mislabelled page came back shifted by exactly one
  — so the detector must be right (`scratchpad/label.py`: drop rows at the crop edge).
- Whole-file string agreement vs the old tab was only 29% of bars >=0.9 for the plain cheap
  read, so two independent readings disagree on strings a lot; the old tab is not perfect either.

**Rule:** string is the field to verify, and it is checkable without a model: pitch from the
notation staff + fret determines the string. No structural metric (count, sums) sees this.
Experiments cost $3.83 on top of the $13.37 remake.

## The string checker, and a conclusion I got wrong (2026-09-21)
`scripts/check-tab.py` + `scripts/pipeline/page_reader.py` read the tab staff **without a model**:
six evenly spaced lines -> the line a digit sits on is its string; digits are matched against
templates learned per video from the transcriber's own (mostly right) fret labels. Verified by
eye on 72 Moonlight notes and two dense Chopin pages: exact.

It is its own control group — it changes nothing on the tabs known to be good:

| tab | method | notes moved to another string |
|---|---|---|
| Lágrima | old (default effort, Read tool, 3/batch) | 0 of 187 |
| Chopin (the one Matías trusts) | old | 2 of 1652 |
| Moonlight | cheap (medium, @-inlined, 6/batch) | **183 of 880** |
| Clair de Lune | cheap | 97 of 644 |
| La Paloma | cheap | 59 of 346 |
| Vals (eAzH…) / Vals (KziW…) | cheap | 88 of 437 / 20 of 222 |

**So Matías was right and my previous entry was wrong**: I wrote that the cheap method "isn't
the cause" from a 6-page test scored with a fuzzy bar-matching metric against another model
reading. The old pipeline put 0.1% of notes on the wrong string; the cheap one 10-20%. What I
had not varied is *how the image reaches the model* (Read tool vs `@` mention — possibly a
different resolution) — untested, the first thing to measure before any re-read.

**Rules:**
- A noisy metric over a small sample does not license "X isn't the cause". Say "not shown".
- When a field can be measured from pixels, measure it; keep the model for what needs judgment
  (rhythm, voices, technique marks).
- Page geometry decides strings only. Digit templates confuse look-alikes (3/8 on Clair de
  Lune), so a fret disagreement is *flagged*, never overwritten; the checker never adds or
  deletes a note. Glyphs with template match < 0.6 are clef letters/cursors and are dropped.
- Thin fonts: erase staff line by "column's ink lies only on the line rows", not by ink count —
  the count rule deleted every "2" on the Chopin.
- Output goes to a sibling project `<id>-checked` (frames/video symlinked) so Matías A/Bs by ear.
Known gaps: one tab system per screenshot (lowest six lines); grace-note pairs and `<12>`
harmonics handled by rule; multi-voice beats the model split/merged differently are only flagged.

## Found it: `@` mentions lose the strings, the Read tool keeps them (2026-09-22)
The one variable I had never isolated. Same 3 pages, same model (Opus), same effort (medium),
scored against page geometry (`scratchpad/score_strings.py` → `page_reader`):

| pages | `@` mention (cheap path) | `--tools Read`, model reads the paths |
|---|---|---|
| Clair de Lune 019-021 | 57/80 strings right (71%) | 73/77 (**95%**), $0.14 |
| Moonlight 010-012 | 68/109 (62%) | 104/109 (**95%**), $0.16 |

And the Read path was *cheaper* per page (4-6k output tokens vs ~16k), so the 12.6x input
saving that motivated mentions bought nothing. Probably the mention path downsizes the image;
what matters is that the good early tabs (Lágrima, Chopin) were all read through Read.

`GUITARRERO_ATTACH=read` selects it (`claude-cli.ts`); the cache key includes it only when
set, so old caches stay valid. Side effect seen once: through Read the model split two bars
of one page across two near-identical frames instead of repeating them — the printed-number
merge can then lose a bar, so run with `--fill-gaps`.

**Rule:** when two pipelines differ in accuracy, list *every* difference between them and test
each alone before concluding. I tested effort and batch size, said "not the cause", and was
wrong for a day.

## "(0)" in the tab is a tie across the barline, not a note (2026-09-22)
Matías: many `(0)`/`(2)` notes "that shouldn't even be there". They were not ghost notes and
not model errors: the score has 70 ties, and alphaTab's TabBarRenderer already hides a tie
destination in the tab — except in `NotationMode.GuitarPro` (default) when the tied note is the
first beat of a bar, where it prints `(fret)`. Engraved classical tabs never print it.
`notation.notationMode = SongBook` in `useAlphaTab.ts` hides those too; `setSongBookModeSettings`
also flips `smallGraceTabNotes` off, so it is set back after construction. Verified headless
(Playwright + the existing `chromium_headless_shell-1243`, pinned via `executablePath`): 0
parenthesised numbers on the page. Playback is unchanged (ties still sustain).

**Rule:** before touching the data, check whether the complaint is a rendering convention.
`grep` the alphaTab bundle for the glyph text (`(${...})`) — it took one grep to find the rule.

## A printed-number jump with no frame between it is a repeat, not a lost page (2026-09-22)
Turkish March: bars 73-76 and 81-84 "missing", `--fill-gaps` found nothing, and the raw video
at 318 s / 336 s still shows the lines 69-72 and 77-80 with the cursor on their last bar. Those
lines stay on screen twice as long as the others (17 s vs 9 s): they are played twice, and the
engraver numbers the repeat. Nothing to re-read — the bars are copies (`repeatOf` in tab.json,
written out because the pipeline has no repeat signs).

**Rule:** when a gap survives `--fill-gaps`, check the frame *times* around it before spending:
a line shown ~2x as long as its neighbours plus a number jump of exactly its length is a repeat.
Worth automating in `mergeBars` (todo §14).

## Turkish March: the missing "third figure" was an unnumbered pickup (2026-09-22)
Matías: the `5~7` figure appears three times in the video and twice in our tab. The page that
prints "5" reads correctly as 5, 6, 7 + chord. The two opening frames have no printed number,
and the opening line is a pickup + four bars, which the stitch numbered 1-5; the false "5"
then beat the real bar 5 on the tie-break. Fix: number an unnumbered opening *backwards* from
the first printed number (`start = printed - stitched.length`, pickup = bar 0); a short opening
now leaves a gap at 1 instead of shifting everything. Regression on the other five: identical.

Two more things the same piece exposed:
- **Grace notes.** "`grace: true` on the beat" made the model mark the *main* beat as grace in
  bars 13-15, 31, 93 (the small note's pitch vanished; the main chord became a timeless
  ornament), while in bars 6-7 the same model did it right. Prompt v5 spells out "a beat of its
  own before the beat it leads into". And `barLength`/`beatUnits` now count a grace beat as 0:
  counted as a 32nd it made bars 6-7 overfull and they were squeezed into `17:16` tuplets.
- **A prompt bump must not re-bill.** `LEGACY_PROMPT_VERSIONS` carries v4 readings into v5;
  only the frames whose v4 entries I deleted were re-read (3 pages, one call).

**And a rule I broke:** the regression harness re-assembled four mention-era projects under the
new `read` default → cache miss → real model calls on frames that weren't even copied (~35
image-less calls, ~$1-2, all `[]`). `GUITARRERO_OFFLINE=1` now makes any call throw; every
re-assembly and regression run sets it. Cost-free must be enforced, not assumed.

## The assembly can lose a bar the transcriber read perfectly — check coverage from the page (2026-09-22)
Every check so far looked at the *reading*; the Turkish March lost bar 5 in the *merge*, after
a correct reading, and nothing said so. `check-tab.py` now matches each screenshot's bars
(page geometry) against the bars assembled from that frame and its two neighbours; a page bar
with no match ≥ 0.6 is reported ("page shows 4 bars, 3 found in the score"). Proven on a copy
with bar 5 removed. `ingest.ts` runs the check at the end of every run, so the report is in
front of whoever ingests. Remaining false positives are honest: an overlay covering a bar, or
a bar read very differently from the page — both worth a look.

## alphaTab: SongBook notation mode silently disables "let ring" playback (2026-09-22)
`MidiFileGenerator._getNoteDuration` only honours `note.isLetRing` when
`notationMode === GuitarPro`, so in SongBook mode every note is cut at its written value.
Playback shaping belongs in `api.midiLoad`: it fires synchronously after `api.tickCache` is
built and before the synth gets the file, and edits to `midi.tracks[0].events` (ticks,
velocities) are what plays — re-sort afterwards, note-offs before note-ons at equal ticks.

## alphaTab: stereo soundfonts play as silence (2026-09-22)
`TinySoundFont.loadPresets` only decodes samples whose `sampleType & 1` (mono); linked
left/right halves (types 4/2) get an empty Float32Array and the voice renders NaN — the
Pianoteq guitar was completely silent with no error. Offline check that caught it: load
the file with `new alphaTab.synth.AlphaSynth(fakeOutput)`, `synthesizer.loadPresets`,
`channelNoteOn`, `synthesize`, and look for NaN/peak. Fix (in `npm run soundfont`): rewrite
each shdr's sampleType to mono and sampleLink to 0 — the zones already pan each half.
**Rule:** render a note offline before offering a new soundfont; "it loads" proves nothing.

## Don't stop after the plan on big tasks (2026-09-23)
Asked for a full redesign + landing + login, I wrote the plan, asked three questions and
stopped. Matías wanted to leave it running all night. **Rule:** on a large task, write the
plan and keep going in the same turn. Decide open questions with sensible defaults and
record them in `tasks/todo.md`. Only stop for destructive, paid or public actions.

## A notation + TAB PDF is its own ground truth — read the vector layer, not pixels (2026-09-26)
Mozart K. 545 came as a LAGA PDF (TCPDF export). Every tab fret number is real text, so
PyMuPDF gives each one's exact string (nearest of the six tab lines) and bar (vertical lines
crossing the whole tab). `scripts/pipeline/pdf_frames.py` cuts one frame per system for the
usual Opus read (rhythm), and `scripts/pdf-check.py` then replaces every beat's notes with the
PDF's column wherever the counts line up: 94.4% raw → 100% of 1171 notes, one bar fixed by hand.
Three traps in the text extraction, each found by a note count that didn't add up:
- `get_text("words")` joins digits of a chord **stacked on neighbouring lines** into one word,
  and a space into "0 1 3" — read `rawdict` chars and join only touching digits.
- A grace note sits **1pt** before its main note ("8" + "10" → "810"): join gap must be < 0.5pt.
- Where two voices share a note the PDF draws the **same glyph twice** — dedupe identical chars.
- A repeat barline is two vertical lines ~3pt apart, and after a clef it makes a narrow empty
  "bar" — merge lines < 5pt apart and drop empty spans < 40pt.

**Rule:** before paying a model to read a PDF, run `pdftotext -layout` on one page. If the tab
digits come out as text, the notes are free and exact; only the rhythm needs the model.

## Published tabs: diff them against the page, don't eyeball (2026-10-07)
Matías caught La Paloma bar 3 by ear (open A and the 2nd-string note struck together; they should
be bass first, then the tied triplet) and then Moonlight bar 23 (an extra `7`). Both were
transcription errors the cheap method left in, and my first "review" of La Paloma missed the
same pattern in bars 8, 13 and 18 because I matched digits to notes by eye instead of by column.
- A **half note tied into the next bar's first triplet note** prints no number there: the page
  has the bass alone on beat 1, then the next notes. The score must be `(-.2 0.5).8{tu 3 2} …`.
  Likewise a bass whole note tied across bars (Moonlight 36-37, 52, 54) is `-.6` / `-.5`, not a
  fresh attack.
- What works: read every column off the frames with `page_reader.read_pages` (no model, no cost),
  parse the *published* `.alphatex` with alphaTab (`string = 7 - n.string`), drop tie
  destinations and diff beat by beat. Moonlight went from 23 differing bars to 0.
- The reader's blind spots (so a diff isn't gospel): it can't read a slide glyph `5—7`, has no
  template for digits missing from the model's output (6, 8 → read as 0), and drops the green
  playback-cursor digit. Eyeball only the bars it flags.
- Last beat with an ornament (dotted 8th + 16th over three eighths) is `(a b).8 c.8 d.16 e.16`.
- Auditing every published piece (2026-10-07) turned up, besides Moonlight/La Paloma: Clair de Lune
  4 wrong strings (bars 38, 43, 44, 56), Marcha Turca 5 bars missing their `10→9` / `9→7`
  pull-off graces and a stale copy in written-out repeat bar 74, Chopin one missing grace (bar 11).
  Lágrima and Adelita were clean. Vals Venezolano 2 (Andreina) was wrong in a different way: no
  opening bar (the 5-eighth pickup `0 2 4 0 2`, lost because frame extraction started at the end
  of the black title card), bar 25 merged two beats, the stacked-chord bars between the two
  harmonic bars were written 5 times instead of 3, and one harmonic bar ran its strings backwards.
- **My first read of the Vals ("66 score bars, ~45 in the video") was wrong.** I matched frames by
  *bar position*, but this piece repeats the same 8 bars written out, so identical bars looked like
  duplicates. The reliable way: align consecutive frames by voting on equal (string, fret) pairs'
  x-offsets (the winning offset has 10-30 votes, runner-up 2-3), chain the offsets into one global
  strip, merge barlines within 40 px, and read each bar once from there. That gave 64 bars + pickup,
  every note checked against the page. Do this *before* concluding anything about bar counts.
- `page_reader` fixes now in the repo: RGB-min ink (the cursor digit is green/blue), digit width
  `min(median, 0.6 × gap)` (pages full of `10`/`12`), bracketed `<12>` harmonics judged by the digits
  inside, and glyphs up to 3.8 gaps wide kept (`<12>` is ~3). On the Chopin it verifies 89/116 bars
  instead of 82/116. It still misses harmonic notes in some places, so harmonic bars need an eye.
- A "frame diff" can't tell rhythm; in tab-only videos it comes only from column spacing
  (a quarter-first bar is 5 columns, a 6/8-feel bar is 6 even columns).
- Hammer/pull-off arcs on the Vals come from the transcriber and were only spot-checked (bars
  1-5, 7, 15 against the frames); my automatic arc detector found none, so treat them as unverified.
