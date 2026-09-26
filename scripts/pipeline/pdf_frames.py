"""
Cuts a notation + TAB PDF into one screenshot per system, the way a video's frames look.

    python3 scripts/pipeline/pdf_frames.py <score.pdf> <frames dir> <first page> <last page>

Prints the frames as JSON: [{"file", "time", "bar"}]. "time" is the frame's index — a PDF
has no clock, and the pipeline only uses it to keep frames in order. "bar" is the number
printed at the start of the system, taken from the PDF's own text rather than read by a model;
the first system of the piece prints none and is bar 1.

Systems are found from the vector drawing: every long horizontal line is a staff or tab line,
a 5-line group is the notation staff and the 6-line group under it is its tab.

`tab_bars()` reads the tab itself off the same vector layer — every fret number with its exact
string, bar by bar — which is what `scripts/pdf-check.py` corrects a transcription against.
"""
import json
import os
import sys

import fitz

SCALE = 3  # 216 dpi: tab digits come out ~20px tall, as sharp as a 1080p video frame


def line_rows(page):
    """y of every long horizontal line on the page, sorted, near-duplicates merged."""
    ys = []
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            if item[0] == "l" and abs(item[1].y - item[2].y) < 0.3 and abs(item[2].x - item[1].x) > 150:
                ys.append(item[1].y)
            elif item[0] == "re" and item[1].height < 1.2 and item[1].width > 150:
                ys.append(item[1].y0)
    rows = []
    for y in sorted(ys):
        if not rows or y - rows[-1] > 1:
            rows.append(y)
    return rows


def systems(rows):
    """(staff top, tab top, tab bottom) for each 5 + 6 line group."""
    groups, current = [], [rows[0]]
    for y in rows[1:]:
        if y - current[-1] < 10:
            current.append(y)
        else:
            groups.append(current)
            current = [y]
    groups.append(current)
    found = []
    for staff, tab in zip(groups, groups[1:]):
        if len(staff) == 5 and len(tab) == 6:
            found.append((staff[0], tab[0], tab[-1]))
    return found


def printed_bar(page, staff_top):
    """The bar number printed at the left end of a system, just above its staff."""
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        if word.isdigit() and x0 < 70 and staff_top - 30 < y1 <= staff_top + 2:
            return int(word)
    return None


def barlines(page, tab_top, tab_bottom):
    """x of every vertical line crossing the whole tab; a double or repeat barline counts once."""
    xs = []
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            if item[0] == "l" and abs(item[1].x - item[2].x) < 0.3:
                x, y0, y1 = item[1].x, min(item[1].y, item[2].y), max(item[1].y, item[2].y)
            elif item[0] == "re" and item[1].width < 1.5 and item[1].height > 20:
                x, y0, y1 = item[1].x0, item[1].y0, item[1].y1
            else:
                continue
            if y0 <= tab_top + 1 and y1 >= tab_bottom - 1:
                xs.append(x)
    merged = []
    for x in sorted(xs):
        if not merged or x - merged[-1] > 5:
            merged.append(x)
    return merged


def fret_numbers(page, tab_lines):
    """(x, string, fret, tied) for every fret number printed on one tab staff."""
    top, bottom = tab_lines[0] - 3, tab_lines[-1] + 3
    # A set: where two voices share a note the PDF draws the same glyph twice.
    chars = sorted({
        (c["origin"][1], c["origin"][0], c["c"], tuple(c["bbox"]))
        for block in page.get_text("rawdict")["blocks"]
        for line in block.get("lines", [])
        for span in line["spans"]
        for c in span["chars"]
        if (c["c"].isdigit() or c["c"] in "()") and top < (c["bbox"][1] + c["bbox"][3]) / 2 < bottom
    })
    # Digits of one number touch ("10"); a grace note sits 1pt before its main note, so the
    # threshold has to be tighter than that. get_text("words") can't be used: it also joins
    # the digits of a chord stacked on neighbouring lines, and a space into "0 1 3".
    runs = []
    for y, _, ch, box in chars:
        if runs and abs(runs[-1]["y"] - y) < 0.5 and box[0] - runs[-1]["x1"] < 0.5:
            runs[-1]["text"] += ch
            runs[-1]["x1"] = box[2]
        else:
            runs.append({"y": y, "x0": box[0], "x1": box[2], "text": ch, "cy": (box[1] + box[3]) / 2})
    notes = []
    for run in runs:
        digits = run["text"].strip("()")
        if digits.isdigit():
            string = min(range(6), key=lambda k: abs(tab_lines[k] - run["cy"])) + 1
            notes.append(((run["x0"] + run["x1"]) / 2, string, int(digits), run["text"].startswith("(")))
    return notes


def tab_bars(pdf, first, last):
    """Every bar of the TAB score: {"number", "columns": [[[string, fret, tied], ...], ...]}."""
    doc = fitz.open(pdf)
    bars, number = [], 1
    for page_number in range(first, last + 1):
        page = doc[page_number - 1]
        rows = line_rows(page)
        for staff_top, tab_top, tab_bottom in systems(rows):
            tab_lines = [y for y in rows if tab_top - 0.5 <= y <= tab_bottom + 0.5]
            notes = fret_numbers(page, tab_lines)
            number = printed_bar(page, staff_top) or number
            lines = barlines(page, tab_top, tab_bottom)
            for left, right in zip(lines, lines[1:]):
                inside = sorted(n for n in notes if left < n[0] < right)
                if not inside and right - left < 40:
                    continue  # the clef and a repeat sign, not a bar
                columns = []
                for x, string, fret, tied in inside:
                    if columns and x - columns[-1][0] < 4:
                        columns[-1][1].append([string, fret, tied])
                    else:
                        columns.append([x, [[string, fret, tied]]])
                bars.append({"number": number, "columns": [sorted(c[1]) for c in columns]})
                number += 1
    return bars


def main():
    pdf, out, first, last = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    os.makedirs(out, exist_ok=True)
    doc = fitz.open(pdf)
    frames = []
    for number in range(first, last + 1):
        page = doc[number - 1]
        found = systems(line_rows(page))
        for i, (staff_top, _, tab_bottom) in enumerate(found):
            # Cut halfway between systems, so fingerings above and rhythm stems below stay in.
            top = (found[i - 1][2] + staff_top) / 2 if i else max(0, staff_top - 60)
            bottom = (tab_bottom + found[i + 1][0]) / 2 if i + 1 < len(found) else tab_bottom + 35
            if not frames:
                top = 0  # the heading: title, tempo mark, time signature
            clip = fitz.Rect(0, top, page.rect.width, bottom)
            file = f"{len(frames):03d}.png"
            page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip).save(os.path.join(out, file))
            bar = printed_bar(page, staff_top)
            frames.append({"file": file, "time": len(frames), "bar": 1 if not frames and bar is None else bar})
    print(json.dumps(frames))


if __name__ == "__main__":
    main()
