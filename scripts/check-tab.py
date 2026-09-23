#!/usr/bin/env python3
"""
Checks a transcribed score against its own screenshots, without a model, and writes a
corrected copy BESIDE it. It never touches the tab being practised from.

    python3 scripts/check-tab.py <projectId>            # report + <id>-checked project
    python3 scripts/check-tab.py <projectId> --report   # report only

Strings come from the page (pipeline/page_reader.py): the tab line a number sits on is measured,
not counted. Frets, rhythm, rests, ties and technique marks stay the transcriber's. Where the two
disagree on anything else — a fret, a missing beat — the bar is listed for review: the checker
moves notes between strings and flags; it never invents or deletes a note.
"""
import collections
import copy
import difflib
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "pipeline"))
from page_reader import read_pages  # noqa: E402

ROOT = os.environ.get("GUITARRERO_DATA") or os.path.join(os.getcwd(), ".data")
MIN_BAR_MATCH = 0.6


def frets_of(notes):
    return tuple(sorted(n["fret"] for n in notes))


def ratio(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def pair_bars(model, page):
    """Monotonic assignment of the model's bars to the page's bars, maximising fret similarity."""
    flat = lambda bar: [f for beat in bar for f in beat]
    sim = [[ratio(flat(m), flat(p)) for p in page] for m in model]
    best = [[(0.0, [])] * (len(page) + 1) for _ in range(len(model) + 1)]
    for a in range(1, len(model) + 1):
        for b in range(1, len(page) + 1):
            take = best[a - 1][b - 1]
            take = (take[0] + sim[a - 1][b - 1], take[1] + [(a - 1, b - 1, sim[a - 1][b - 1])])
            best[a][b] = max(best[a - 1][b], best[a][b - 1], take, key=lambda t: t[0])
    return {m: (p, s) for m, p, s in best[len(model)][len(page)][1]}


def align_beats(model, page):
    """Needleman-Wunsch over beats: [(model index | None, page index | None)]."""
    def score(m, p):
        if m == p:
            return 1.0
        common = sum((collections.Counter(m) & collections.Counter(p)).values())
        return common / max(len(m), len(p)) - 0.35
    gap = -0.4
    n, k = len(model), len(page)
    table = [[0.0] * (k + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        table[i][0] = i * gap
    for j in range(1, k + 1):
        table[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, k + 1):
            table[i][j] = max(table[i - 1][j - 1] + score(model[i - 1], page[j - 1]),
                              table[i - 1][j] + gap, table[i][j - 1] + gap)
    pairs, i, j = [], n, k
    while i > 0 or j > 0:
        if i > 0 and j > 0 and table[i][j] == table[i - 1][j - 1] + score(model[i - 1], page[j - 1]):
            pairs.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and table[i][j] == table[i - 1][j] + gap:
            pairs.append((i - 1, None)); i -= 1
        else:
            pairs.append((None, j - 1)); j -= 1
    return pairs[::-1]


def reconcile(beat, column, stats):
    """
    Moves the beat's notes onto the strings the page shows them on. Frets stay the
    transcriber's: line geometry is exact, but digit matching confuses look-alikes (3 and 8 in
    the Clair de Lune font), so a fret the two disagree on is reported, never overwritten.
    Returns the disagreements, or None when the beat and the column are not the same notes.
    """
    sounding = [n for n in beat["notes"] if not n.get("tie")]
    seen = list(column["notes"])
    if len(sounding) != len(seen):
        # A tied note is often not re-printed; anything else is a different beat.
        sounding = beat["notes"]
        if len(sounding) != len(seen):
            return None
    pairs = []
    for note in list(sounding):
        match = next((g for g in seen if g["fret"] == note["fret"] and g["string"] == note["string"]), None) \
            or next((g for g in seen if g["fret"] == note["fret"]), None)
        if match:
            seen.remove(match)
            pairs.append((note, match))
    rest = sorted((n for n in sounding if all(n is not p[0] for p in pairs)), key=lambda n: n["string"])
    pairs += list(zip(rest, sorted(seen, key=lambda g: g["string"])))
    disagreements = []
    for note, glyph in pairs:
        if note["fret"] != glyph["fret"]:
            disagreements.append(f"fret {note['fret']} reads as {glyph['fret']} on the page")
        if note["string"] != glyph["string"]:
            note["string"] = glyph["string"]
            stats["strings corrected"] += 1
        stats["notes checked"] += 1
    return disagreements


def check(project):
    score = json.load(open(os.path.join(project, "tab.json")))
    meta = json.load(open(os.path.join(project, "meta.json")))
    fixed = copy.deepcopy(score)

    by_frame = collections.defaultdict(list)
    for at, bar in enumerate(fixed["bars"]):
        if bar.get("frame") is not None:
            by_frame[bar["frame"]].append(at)
    files = {f: os.path.join(project, "frames", meta["frames"][f]["file"]) for f in by_frame}
    pages, ocr = read_pages(files, {f: [score["bars"][at] for at in ids] for f, ids in by_frame.items()})

    stats = collections.Counter()
    review = {}
    coverage = {}
    for at, bar in enumerate(fixed["bars"]):
        if bar.get("frame") not in pages:
            review[at] = "no readable tab staff on its screenshot"
    for frame, ids in sorted(by_frame.items()):
        if frame not in pages:
            continue
        sounding = lambda at: [b for b in fixed["bars"][at]["beats"] if b["notes"]]
        model = [[frets_of(b["notes"]) for b in sounding(at)] for at in ids]
        page = [[frets_of(c["notes"]) for c in bar] for bar in pages[frame]]
        paired = pair_bars(model, page)
        # A page bar that no assembled bar accounts for: the assembly dropped it (a pickup
        # counted as bar 1, a repeat mistaken for a duplicate) — the transcriber never sees
        # this. Overlapping screenshots split one line's bars between neighbours, so the
        # page is matched against the bars taken from this frame and the two beside it.
        near = [at for f in (frame - 1, frame, frame + 1) for at in by_frame.get(f, [])]
        near_model = [[frets_of(b["notes"]) for b in sounding(at)] for at in near]
        accounted = {p for p, sim in pair_bars(near_model, page).values() if sim >= MIN_BAR_MATCH}
        whole = [i for i, bar in enumerate(pages[frame]) if len(bar) >= 2]
        dropped = [i for i in whole if i not in accounted]
        if dropped:
            coverage[frame] = (len(whole), len(whole) - len(dropped), [pages[frame][i][0]["notes"][0]["fret"] for i in dropped])
        for m, at in enumerate(ids):
            p, similarity = paired.get(m, (None, 0.0))
            if p is None or similarity < MIN_BAR_MATCH:
                review[at] = "could not find this bar on its screenshot"
                continue
            beats, columns = sounding(at), pages[frame][p]
            problems = []
            before = stats["strings corrected"]
            for i, j in align_beats(model[m], page[p]):
                if i is None:
                    problems.append(f"the page has a beat the reading lacks ({' '.join(str(n['fret']) for n in columns[j]['notes'])})")
                elif j is None:
                    if not all(n.get("tie") for n in beats[i]["notes"]):
                        problems.append(f"the reading has a beat the page lacks ({' '.join(str(n['fret']) for n in beats[i]['notes'])})")
                else:
                    found = reconcile(beats[i], columns[j], stats)
                    if found is None:
                        problems.append(f"beat {i + 1} has {len(beats[i]['notes'])} note(s), the page shows {len(columns[j]['notes'])}")
                    else:
                        problems += found
            if stats["strings corrected"] > before:
                stats["bars changed"] += 1
            if problems:
                review[at] = "; ".join(problems[:3]) + (f" (+{len(problems) - 3} more)" if len(problems) > 3 else "")
            else:
                stats["bars verified"] += 1

    return fixed, stats, review, ocr, len(score["bars"]), coverage


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    project_id = args[0]
    project = os.path.join(ROOT, "projects", project_id)
    fixed, stats, review, ocr, total, coverage = check(project)
    meta = json.load(open(os.path.join(project, "meta.json")))

    print(f"\n{project_id}: {json.load(open(os.path.join(project, 'meta.json')))['title']}")
    print(f"  page reader: digits {ocr['digits']} learned from {ocr['samples']} samples; "
          f"the transcriber agreed with the page on {ocr['model_agreed']}/{ocr['samples']} digits")
    print(f"  {stats['bars verified']}/{total} bars agree with the page note for note; "
          f"{stats['strings corrected']} of {stats['notes checked']} notes moved to the string the page shows "
          f"({stats['bars changed']} bars)")
    if coverage:
        print(f"  ⚠ {len(coverage)} screenshot(s) show a bar the score has no match for — lost in assembly, or misread:")
        for frame, (shown, took, frets) in sorted(coverage.items()):
            printed = meta["frames"][frame].get("bar")
            where = f"printed bar {printed}" if printed else f"{meta['frames'][frame]['time']:.0f}s"
            print(f"    {meta['frames'][frame]['file']} ({where}): page shows {shown} bars, {took} found in the score; "
                  f"unmatched bar(s) start with fret {', '.join(map(str, frets))}")
    if review:
        print(f"  {len(review)} bar(s) only partly checked, to review by eye:")
        for at, why in sorted(review.items()):
            print(f"    bar {at + 1}: {why}")

    if "--report" in sys.argv:
        return
    out = os.path.join(ROOT, "projects", f"{project_id}-checked")
    os.makedirs(out, exist_ok=True)
    meta["id"] = f"{project_id}-checked"
    meta["title"] = f"{meta['title']} (checked)"
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=2)
    json.dump(fixed, open(os.path.join(out, "tab.json"), "w"), indent=2)
    json.dump({"bars": {str(at + 1): why for at, why in sorted(review.items())}, "stats": stats, "ocr": ocr},
              open(os.path.join(out, "check-report.json"), "w"), indent=2)
    for name in ("frames", "video.mp4"):
        link = os.path.join(out, name)
        if not os.path.lexists(link) and os.path.exists(os.path.join(project, name)):
            os.symlink(os.path.join("..", project_id, name), link)
    status = {"stage": "done", "message": f"{total} bars, checked against the page", "progress": 1}
    json.dump(status, open(os.path.join(out, "status.json"), "w"), indent=2)
    subprocess.run(["node", "scripts/rebuild-tex.ts", f"{project_id}-checked"], check=True,
                   stderr=subprocess.DEVNULL)
    print(f"  → written beside the original as project {project_id}-checked\n")


if __name__ == "__main__":
    main()
