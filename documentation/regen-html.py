#!/usr/bin/env python3
"""Render documentation/index.html from _viewer.template.html.

Injects the raw markdown of the contract docs into the <script type="text/markdown">
blocks so the single-file HTML viewer works offline / when deployed as a static site.
Run this whenever API_CONTRACT.md or API_CONTRACT_ANGGOTA.md changes:

    python3 documentation/regen-html.py

`index.html` is the committed, deployable output (Vercel serves it at `/`);
`_viewer.template.html` and this script are excluded from the deploy via .vercelignore.
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
TEMPLATE = HERE / "_viewer.template.html"
OUT = HERE / "index.html"
DOCS = {
    "@@UMUM@@": HERE / "API_CONTRACT.md",
    "@@ANGGOTA@@": HERE / "API_CONTRACT_ANGGOTA.md",
}

html = TEMPLATE.read_text(encoding="utf-8")
for token, path in DOCS.items():
    md = path.read_text(encoding="utf-8")
    if "</script" in md.lower():
        raise SystemExit(f"{path.name} contains a literal </script — cannot inline safely")
    html = html.replace(token, md)

OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT.relative_to(HERE.parent)} ({len(html):,} bytes)")
