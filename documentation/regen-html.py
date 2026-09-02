#!/usr/bin/env python3
"""Render documentation/index.html from _viewer.template.html.

Injects the raw markdown of API_CONTRACT.md into the <script type="text/markdown">
block so the single-file HTML viewer works offline / when deployed as a static site.
Run this whenever API_CONTRACT.md changes:

    python3 documentation/regen-html.py

`index.html` is the committed, deployable output (Vercel serves it at `/`).
`_viewer.template.html`, this script, and STYLE_GUIDE.md are excluded from the deploy
via .vercelignore. STYLE_GUIDE.md documents the format of API_CONTRACT.md itself.
"""
import base64
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
TEMPLATE = HERE / "_viewer.template.html"
OUT = HERE / "index.html"
DOC = HERE / "API_CONTRACT.md"
LOGO = HERE / "LogoIcon.png"
LOGO_GRAY = HERE / "LogoIcon-gray.png"

# Tanggal pengecekan terakhir — tampil di header kanan-atas viewer. Update saat sweep status berikutnya.
CHECKED = "3 September 2026"

md = DOC.read_text(encoding="utf-8")
if "</script" in md.lower():
    raise SystemExit(f"{DOC.name} contains a literal </script — cannot inline safely")

# Logo di-inline sebagai data-URI supaya index.html tetap satu berkas mandiri.
# `@@LOGO@@` = berwarna (header + judul intro); `@@LOGO_GRAY@@` = grayscale (favicon di <head>).
def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")

html = (
    TEMPLATE.read_text(encoding="utf-8")
    .replace("@@CHECKED@@", CHECKED)
    .replace("@@LOGO_GRAY@@", data_uri(LOGO_GRAY))
    .replace("@@LOGO@@", data_uri(LOGO))
    .replace("@@DOC@@", md)
)

OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.relative_to(HERE.parent)} ({len(html):,} bytes)")
