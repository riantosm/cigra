#!/usr/bin/env python3
"""Render the deployable documentation pages from their build-only templates.

  documentation/index.html      <- _viewer.template.html   + API_CONTRACT.md
  documentation/changelog.html  <- _changelog.template.html + CHANGELOG.md

Both are single self-contained HTML files (markdown + logo inlined) so they work
offline / when deployed as a static site. Run this whenever API_CONTRACT.md or
CHANGELOG.md changes:

    python3 documentation/regen-html.py

The templates, this script, STYLE_GUIDE.md and the *.apk drops are excluded from
the Vercel deploy via .vercelignore. Both pages share one topbar with an
API Contract / Changelog nav.
"""
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

VIEWER_TEMPLATE = HERE / "_viewer.template.html"
VIEWER_OUT = HERE / "index.html"
CONTRACT = HERE / "API_CONTRACT.md"

CHANGELOG_TEMPLATE = HERE / "_changelog.template.html"
CHANGELOG_OUT = HERE / "changelog.html"
CHANGELOG = HERE / "CHANGELOG.md"

LOGO = HERE / "LogoIcon.png"
LOGO_GRAY = HERE / "LogoIcon-gray.png"
BUILD_GRADLE = ROOT / "android" / "app" / "build.gradle"

# Tanggal pengecekan terakhir — tampil di header kanan-atas viewer. Update saat sweep status berikutnya.
CHECKED = "3 September 2026"


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def guard_no_script(md, name):
    if "</script" in md.lower():
        raise SystemExit(f"{name} contains a literal </script — cannot inline safely")
    return md


def apk_name():
    """Nama file APK release terbaru, dibaca dari android/app/build.gradle."""
    try:
        g = BUILD_GRADLE.read_text(encoding="utf-8")
        vn = re.search(r'versionName\s+"([^"]+)"', g)
        vc = re.search(r"versionCode\s+(\d+)", g)
        if vn and vc:
            return f"SmartBattalion-v{vn.group(1)}({vc.group(1)})-release.apk"
    except OSError:
        pass
    return ""


LOGO_URI = data_uri(LOGO)
LOGO_GRAY_URI = data_uri(LOGO_GRAY)

# ---- index.html (API contract viewer) ----
viewer_md = guard_no_script(CONTRACT.read_text(encoding="utf-8"), CONTRACT.name)
viewer_html = (
    VIEWER_TEMPLATE.read_text(encoding="utf-8")
    .replace("@@CHECKED@@", CHECKED)
    .replace("@@LOGO_GRAY@@", LOGO_GRAY_URI)
    .replace("@@LOGO@@", LOGO_URI)
    .replace("@@DOC@@", viewer_md)
)
VIEWER_OUT.write_text(viewer_html, encoding="utf-8")
print(f"wrote {VIEWER_OUT.relative_to(ROOT)} ({len(viewer_html):,} bytes)")

# ---- changelog.html ----
changelog_md = guard_no_script(CHANGELOG.read_text(encoding="utf-8"), CHANGELOG.name)
changelog_html = (
    CHANGELOG_TEMPLATE.read_text(encoding="utf-8")
    .replace("@@APK_NAME@@", apk_name())
    .replace("@@LOGO_GRAY@@", LOGO_GRAY_URI)
    .replace("@@LOGO@@", LOGO_URI)
    .replace("@@DOC@@", changelog_md)
)
CHANGELOG_OUT.write_text(changelog_html, encoding="utf-8")
print(f"wrote {CHANGELOG_OUT.relative_to(ROOT)} ({len(changelog_html):,} bytes)")
