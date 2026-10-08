"""
Reads the fret numbers off a tab screenshot without a model: which string, which fret, where.

The transcriber reads frets well and rhythm well, but it miscounts tab lines: on the Moonlight
Sonata 30% of its notes sat on the wrong string, and no effort level or prompt fixed that. A
tab staff is six evenly spaced lines with digits in one fixed font, so geometry can do what
the model cannot: the line a digit sits on is its string, and the digit itself is matched
against templates. The templates are learned per video from the model's own reading — it is
right about most frets, so averaging its labels and re-voting washes its misreads out.

Needs numpy and Pillow.
"""
import collections
import difflib

import numpy as np
from PIL import Image

MAX_FRET = 24
# Template match below this is not a digit: clef letters and cursors score under 0.5, digits over 0.7.
MIN_CONF = 0.6


def tab_lines(gray):
    """Row positions of the six tab lines: the lowest run of six evenly spaced long lines."""
    height = gray.shape[0]
    paper = np.median(gray[height // 2:])
    dark = (gray < paper - 50).mean(axis=1)
    rows = np.where(dark > 0.45)[0]
    rows = rows[(rows > 4) & (rows < height - 5)]  # the crop's own edge is not a string
    lines = []
    for y in rows:
        if lines and y - lines[-1][-1] <= 2:
            lines[-1].append(y)
        else:
            lines.append([y])
    ys = [float(np.mean(line)) for line in lines]
    for i in range(len(ys) - 6, -1, -1):
        six = ys[i:i + 6]
        gaps = np.diff(six)
        if gaps.min() > 8 and gaps.max() - gaps.min() <= 0.25 * gaps.mean():
            return six
    return None


def _runs(mask, min_gap):
    """[start, end) runs of True, merging gaps narrower than min_gap."""
    out = []
    for x in np.where(mask)[0]:
        if out and x - out[-1][1] < min_gap:
            out[-1][1] = x + 1
        else:
            out.append([x, x + 1])
    return out


def find_glyphs(path):
    """Every printed number on the tab staff: x position, string, and its pixels."""
    gray = np.asarray(Image.open(path).convert("L")).astype(float)
    height, width = gray.shape
    ys = tab_lines(gray)
    if ys is None:
        return None
    gap = float(np.mean(np.diff(ys)))
    paper = np.median(gray[height // 2:])
    rgb_min = np.asarray(Image.open(path).convert('RGB')).astype(float).min(axis=2)
    ink = rgb_min < paper - 110  # near-black digits, and the green/blue digit under the playback cursor
    top, bottom = int(round(ys[0])), int(round(ys[5]))

    # Barlines: columns inked all the way from string 1 to string 6.
    column = (gray < paper - 50)[top:bottom + 1].mean(axis=0)
    barlines = [int((a + b) / 2) for a, b in _runs(column > 0.92, 3)]
    on_barline = np.zeros(width, bool)
    for x in barlines:
        on_barline[max(0, x - 3):x + 4] = True

    glyphs = []
    half = int(gap * 0.46)
    for string, y in enumerate(ys, 1):
        y = int(round(y))
        band = ink[max(0, y - half):y + half + 1].copy()
        centre = min(half, band.shape[0] - 1)
        # A column whose only ink is on the line's own rows is staff line, not digit. (Erasing
        # by ink count instead deleted every "2" of a thin font: its strokes are 1-2 px.)
        band[:, band.sum(axis=0) == band[max(0, centre - 1):centre + 2].sum(axis=0)] = False
        band[:, on_barline] = False
        for a, b in _runs(band.any(axis=0), gap * 0.5):
            if b - a > gap * 3.8:
                continue  # slur and tie arcs, text (a <12> harmonic is ~3 gaps wide)
            rows = np.where(band[:, a:b].any(axis=1))[0]
            if rows[-1] - rows[0] < gap * 0.5:
                continue
            glyphs.append({"x": (a + b) / 2, "w": b - a, "string": string,
                           "bitmap": band[rows[0]:rows[-1] + 1, a:b].copy()})
    if glyphs:
        unit = min(np.median([g["w"] for g in glyphs]), 0.6 * gap)  # one digit's width (a page of "10"s must not set it to two)
        for g in glyphs:
            g["digits"] = max(1, int(round(g["w"] / unit)))
    return {"gap": gap, "barlines": barlines, "glyphs": sorted(glyphs, key=lambda g: g["x"])}


def _digit_vectors(glyph, size=(10, 14)):
    """The glyph cut into its digits, each scaled to one small comparable vector."""
    bitmap, count = glyph["bitmap"], glyph["digits"]
    width = bitmap.shape[1]
    out = []
    for k in range(count):
        part = bitmap[:, int(round(k * width / count)):int(round((k + 1) * width / count))]
        cols = np.where(part.any(axis=0))[0]
        if len(cols) == 0:
            out.append(np.zeros(size[0] * size[1]))
            continue
        part = part[:, cols[0]:cols[-1] + 1]
        image = Image.fromarray((part * 255).astype("uint8")).resize(size, Image.BILINEAR)
        vector = np.asarray(image).astype(float).ravel()
        vector -= vector.mean()
        out.append(vector / (np.linalg.norm(vector) or 1))
    return out


def _columns(glyphs, gap, barlines):
    """Glyphs stacked at one x are one beat; barlines split the beats into bars."""
    columns = []
    for g in glyphs:
        if columns and abs(g["x"] - columns[-1]["x"]) < gap * 0.45:
            columns[-1]["notes"].append(g)
            columns[-1]["x"] = float(np.mean([n["x"] for n in columns[-1]["notes"]]))
        else:
            columns.append({"x": g["x"], "notes": [g]})
    bars = collections.defaultdict(list)
    for column in columns:
        column["notes"].sort(key=lambda n: n["string"])
        bars[sum(1 for x in barlines if x < column["x"])].append(column)
    return [bars[k] for k in sorted(bars)]


def read_pages(frame_files, model_bars_by_frame):
    """
    frame index -> bars -> columns -> notes {string, fret, conf}, for every frame given.
    `model_bars_by_frame` is the transcriber's reading, used only to label template samples.
    """
    pages = {index: find_glyphs(path) for index, path in frame_files.items()}
    pages = {index: page for index, page in pages.items() if page and page["glyphs"]}

    samples = collections.defaultdict(list)
    for index, page in pages.items():
        beats = [b for bar in model_bars_by_frame.get(index, []) for b in bar["beats"] if b["notes"]]
        columns = [c for bar in _columns(page["glyphs"], page["gap"], page["barlines"]) for c in bar]
        shape = lambda frets: tuple(sorted(2 if f >= 10 else 1 for f in frets))
        model = [shape(n["fret"] for n in b["notes"]) for b in beats]
        image = [tuple(sorted(n["digits"] for n in c["notes"])) for c in columns]
        matcher = difflib.SequenceMatcher(None, model, image, autojunk=False)
        for tag, a0, a1, b0, b1 in matcher.get_opcodes():
            if tag != "equal" or a1 - a0 < 3:
                continue  # only long runs of identical shape are trusted as training pairs
            for beat, column in zip(beats[a0:a1], columns[b0:b1]):
                for note, glyph in zip(sorted(beat["notes"], key=lambda n: n["string"]), column["notes"]):
                    if len(str(note["fret"])) != glyph["digits"]:
                        continue
                    for char, vector in zip(str(note["fret"]), _digit_vectors(glyph)):
                        samples[char].append(vector)

    templates = {c: np.mean(v, axis=0) for c, v in samples.items() if len(v) >= 3}
    nearest = lambda v: max(templates, key=lambda t: float(templates[t] @ v))
    for _ in range(2):  # re-label with the templates and re-average: votes the model's misreads out
        voted = collections.defaultdict(list)
        for vectors in samples.values():
            for v in vectors:
                voted[nearest(v)].append(v)
        templates = {c: np.mean(v, axis=0) for c, v in voted.items() if len(v) >= 3}
    total = sum(len(v) for v in samples.values())
    agreed = sum(1 for c, vectors in samples.items() for v in vectors if nearest(v) == c)

    def read(glyph):
        chars, conf = "", 1.0
        vecs = _digit_vectors(glyph)
        if len(vecs) in (3, 4):  # <n> / <nn>: judge only the digits between the angle brackets
            vecs = vecs[1:-1]
            glyph["bracketed"] = True
        for v in vecs:
            best = nearest(v)
            chars += best
            conf = min(conf, float(templates[best] @ v) / (np.linalg.norm(templates[best]) or 1))
        return chars, conf

    out = {}
    for index, page in pages.items():
        glyphs = []
        for g in page["glyphs"]:
            chars, conf = read(g)
            if conf < MIN_CONF:
                continue
            if g.get("bracketed"):
                g["harmonic"] = True
            if len(chars) == 2 and int(chars) > MAX_FRET:
                # Two small numbers side by side (grace notes), not one fret.
                w = g["w"] / 4
                glyphs.append({**g, "x": g["x"] - w, "fret": int(chars[0]), "conf": conf})
                glyphs.append({**g, "x": g["x"] + w, "fret": int(chars[1]), "conf": conf})
                continue
            if len(chars) > 2:
                continue  # clef letters, text
            glyphs.append({**g, "fret": int(chars), "conf": conf})
        out[index] = [
            [{"x": c["x"], "notes": [{"string": n["string"], "fret": n["fret"], "conf": round(n["conf"], 2),
                                      **({"harmonic": True} if n.get("harmonic") else {})} for n in c["notes"]]}
             for c in bar]
            for bar in _columns(glyphs, page["gap"], page["barlines"])
        ]
    return out, {"digits": "".join(sorted(templates)), "samples": total, "model_agreed": agreed}
