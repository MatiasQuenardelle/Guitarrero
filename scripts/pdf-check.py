"""
Corrects a PDF project's notes against the PDF itself — no model, no image reading.

    python3 scripts/pdf-check.py <project id>

A notation + TAB PDF carries every fret number as text on its tab lines, so the string and
fret of each note are known exactly (`pdf_frames.tab_bars`). The transcriber is still needed
for the rhythm, which the PDF only draws. Where a bar has as many sounding beats as the PDF
has note columns, each beat's notes are replaced by the PDF's column, keeping the beat's
duration and each note's technique marks; a bar that doesn't line up is left alone and listed.

Writes the result beside the original as <id>-checked, like scripts/check-tab.py does for a
video, so the two can be compared by ear.
"""
import copy
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "pipeline"))
from pdf_frames import tab_bars  # noqa: E402

ROOT = os.environ.get("GUITARRERO_DATA", os.path.join(os.getcwd(), ".data"))


def correct_beat(beat, column):
    """The PDF's notes for this beat, carrying over what the transcriber marked on each."""
    old = beat["notes"]
    notes = []
    for string, fret, tied in column:
        # Same note, else the same fret read on the wrong line, else a fresh note.
        match = next((n for n in old if n["string"] == string and n["fret"] == fret), None) or next(
            (n for n in old if n["fret"] == fret), {}
        )
        note = {**match, "string": string, "fret": fret}
        note.pop("tie", None)
        # The PDF's tab prints only the main note of a trill; alphaTab would add the upper
        # note as a parenthesised "(3)" that the score never shows.
        note.pop("trill", None)
        if tied:
            note["tie"] = True
        notes.append(note)
    changed = sorted((n["string"], n["fret"]) for n in old) != sorted((n["string"], n["fret"]) for n in notes)
    beat["notes"] = notes
    return changed


def check(project, pdf, pages):
    score = json.load(open(os.path.join(project, "tab.json")))
    fixed = copy.deepcopy(score)
    printed = {bar["number"]: bar["columns"] for bar in tab_bars(pdf, *pages)}

    stats = {"verified": 0, "corrected": 0, "notes": 0}
    review = {}
    placed = set()
    for at, bar in enumerate(fixed["bars"]):
        number = bar.get("number", at + 1)
        placed.add(number)
        columns = printed.get(number)
        if columns is None:
            review[at] = f"the PDF has no bar {number}"
            continue
        beats = [b for b in bar["beats"] if b["notes"] and not b.get("rest")]
        if len(beats) != len(columns):
            review[at] = f"{len(beats)} beats with notes, the PDF shows {len(columns)} note columns"
            continue
        changed = sum(correct_beat(beat, column) for beat, column in zip(beats, columns))
        stats["notes"] += sum(len(c) for c in columns)
        stats["corrected" if changed else "verified"] += 1
    missing = sorted(set(printed) - placed)
    return fixed, stats, review, missing, len(printed)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    project_id = sys.argv[1]
    project = os.path.join(ROOT, "projects", project_id)
    meta = json.load(open(os.path.join(project, "meta.json")))
    fixed, stats, review, missing, total = check(project, os.path.join(project, "source.pdf"), meta["pages"])

    print(f"\n{project_id}: {meta['title']}")
    print(f"  {stats['verified']}/{total} bars agree with the PDF note for note; "
          f"{stats['corrected']} corrected to the PDF's strings and frets")
    if missing:
        print(f"  ⚠ the score lacks bar(s) {', '.join(map(str, missing))} of the PDF")
    if review:
        print(f"  {len(review)} bar(s) left as read, to review by eye:")
        for at, why in sorted(review.items()):
            print(f"    bar {at + 1}: {why}")

    out = os.path.join(ROOT, "projects", f"{project_id}-checked")
    os.makedirs(out, exist_ok=True)
    meta["id"] = f"{project_id}-checked"
    meta["title"] = f"{meta['title']} (checked)"
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=2)
    json.dump(fixed, open(os.path.join(out, "tab.json"), "w"), indent=2)
    json.dump({"bars": {str(at + 1): why for at, why in sorted(review.items())}, "stats": stats},
              open(os.path.join(out, "check-report.json"), "w"), indent=2)
    for name in ("frames", "source.pdf"):
        link = os.path.join(out, name)
        if not os.path.lexists(link):
            os.symlink(os.path.join("..", project_id, name), link)
    status = {"stage": "done", "message": f"{total} bars, checked against the PDF", "progress": 1}
    json.dump(status, open(os.path.join(out, "status.json"), "w"), indent=2)
    subprocess.run(["node", "scripts/rebuild-tex.ts", f"{project_id}-checked"], check=True,
                   stderr=subprocess.DEVNULL)
    print(f"  → written beside the original as project {project_id}-checked\n")


if __name__ == "__main__":
    main()
