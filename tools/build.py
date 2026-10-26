"""Export the ProKribs design canvas into a static GitHub Pages site."""
import html
import json
import re
import shutil
import sys
from pathlib import Path

SRC = Path(sys.argv[1])          # folder holding canvas.json and *.dc.html
OUT = Path(sys.argv[2])          # site output folder
HERE = Path(__file__).parent

OUT.mkdir(parents=True, exist_ok=True)
canvas = json.loads((SRC / "canvas.json").read_text())
boards = canvas["boards"]
notes = canvas.get("notes", {})

def page_name(dc):
    return dc.replace(".dc.html", ".html")

HEAD_INJECT = """<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="frame.css">
<script src="runtime.js"></script>
<script src="frame.js" defer></script>"""

for dc, meta in boards.items():
    src = (SRC / dc).read_text()
    src = src.replace('<script src="./support.js"></script>', HEAD_INJECT)
    src = re.sub(r'([A-Za-z0-9_]+)\.dc\.html', r'\1.html', src)
    if dc == "VerifyPhone.dc.html":
        src = src.replace('<a href="SignUp.html" aria-label="Back"', '<a href="Agreements.html" aria-label="Back"', 1)
    title = meta.get("title", dc)
    bar = (f'<div class="pk-bar"><a href="index.html">All screens</a>'
           f'<span>{html.escape(title)}</span></div>')
    src = src.replace("<body>", "<body>\n" + bar, 1)
    (OUT / page_name(dc)).write_text(src)

# Group boards into rows (flows) by their y position, ordered by x.
rows = {}
for dc, meta in boards.items():
    rows.setdefault(meta["y"], []).append((meta["x"], dc, meta))
titles = {n["y"] + 300: n["text"] for n in notes.values() if n.get("kind") == "title1"}

sections = []
for y in sorted(rows):
    heading = titles.get(y, "")
    cards = []
    for _, dc, meta in sorted(rows[y]):
        p = page_name(dc)
        cards.append(
            f'<a class="card" href="{p}"><div class="thumb">'
            f'<iframe src="{p}?thumb=1" loading="lazy" tabindex="-1" aria-hidden="true" title=""></iframe>'
            f'</div><span>{html.escape(meta.get("title", dc))}</span></a>')
    sections.append(f'<section><h2>{html.escape(heading)}</h2><div class="grid">{"".join(cards)}</div></section>')

index = (HERE / "index.template.html").read_text().replace("{{SECTIONS}}", "\n".join(sections))
(OUT / "index.html").write_text(index)

for f in ["runtime.js", "frame.css", "frame.js"]:
    shutil.copy(HERE / f, OUT / f)
(OUT / ".nojekyll").write_text("")
print(f"Built {len(boards)} screens into {OUT}")
