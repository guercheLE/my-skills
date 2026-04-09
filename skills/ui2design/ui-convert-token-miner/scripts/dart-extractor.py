#!/usr/bin/env python3
"""
dart-extractor.py — Flutter / Dart design-token extractor.

Parses Dart source files looking for:
  - Color / MaterialColor / ColorScheme declarations
  - TextStyle / TextTheme fontFamily and fontSize
  - ThemeData.spacing / padding / margin constants

Outputs JSON to stdout for mine.ts to consume.

Usage:
    python3 dart-extractor.py <dart-file-path> [<dart-file-path> ...]
    python3 dart-extractor.py --glob "lib/**/*.dart" --root /path/to/project
"""

import argparse
import glob as glob_module
import json
import os
import re
import sys
from pathlib import Path


# ── Color normalization ───────────────────────────────────────────────────────

def normalize_color(raw: str) -> str | None:
    """Convert Flutter/Dart color literals to lowercase hex6."""
    raw = raw.strip()

    # Color(0xFF1A1A2E) or Color(0xFFRRGGBB)
    m = re.match(r"Color\s*\(\s*0[xX][Ff][Ff]([0-9A-Fa-f]{6})\s*\)", raw)
    if m:
        return "#" + m.group(1).lower()

    # Color(0xAARRGGBB) — extract RGB, ignore alpha
    m = re.match(r"Color\s*\(\s*0[xX]([0-9A-Fa-f]{2})([0-9A-Fa-f]{6})\s*\)", raw)
    if m:
        return "#" + m.group(2).lower()

    # Bare hex: 0xFF1A1A2E without Color()
    m = re.match(r"0[xX][Ff][Ff]([0-9A-Fa-f]{6})", raw)
    if m:
        return "#" + m.group(1).lower()

    # #RRGGBB or #RGB (less common in Flutter but valid)
    m = re.match(r"#([0-9A-Fa-f]{6})$", raw)
    if m:
        return "#" + m.group(1).lower()
    m = re.match(r"#([0-9A-Fa-f]{3})$", raw)
    if m:
        c = m.group(1)
        return "#" + "".join(ch * 2 for ch in c).lower()

    # Colors.red etc. — named Flutter colors (basic set)
    named_flutter = {
        "Colors.white": "#ffffff", "Colors.black": "#000000",
        "Colors.red": "#f44336",   "Colors.blue": "#2196f3",
        "Colors.green": "#4caf50", "Colors.yellow": "#ffeb3b",
        "Colors.orange": "#ff9800","Colors.purple": "#9c27b0",
        "Colors.transparent": "transparent",
    }
    if raw in named_flutter:
        return named_flutter[raw]

    return None


# ── Extraction patterns ───────────────────────────────────────────────────────

# Matches: static const Color primaryColor = Color(0xFF1A1A2E);
RE_CONST_COLOR = re.compile(
    r"(?:static\s+)?const\s+(?:Color\s+)?(\w+)\s*=\s*(Color\s*\([^)]+\))",
    re.MULTILINE,
)

# Matches color values in ColorScheme.fromSeed / ColorScheme(primary: Color(...))
RE_COLORSCHEME = re.compile(
    r"(\w+)\s*:\s*(Color\s*\([^)]+\)|Colors\.\w+)",
    re.MULTILINE,
)

# Matches fontFamily in TextStyle(fontFamily: 'Inter', ...)
RE_FONT_FAMILY = re.compile(r"fontFamily\s*:\s*['\"]([^'\"]+)['\"]")

# Matches fontSize in TextStyle(fontSize: 16, ...)
RE_FONT_SIZE = re.compile(r"fontSize\s*:\s*([\d.]+)")

# Matches ThemeData spacing-ish constants: static const double spacingMd = 16.0;
RE_CONST_DOUBLE = re.compile(
    r"(?:static\s+)?const\s+double\s+(\w+)\s*=\s*([\d.]+)",
    re.MULTILINE,
)

# Matches any standalone Color literal for broad extraction
RE_ANY_COLOR = re.compile(r"(Color\s*\(\s*0[xX][0-9A-Fa-f]{8}\s*\))", re.MULTILINE)


def classify_double_name(name: str) -> str:
    """Classify a const double name as spacing, radius, or unknown."""
    n = name.lower()
    if any(kw in n for kw in ("radius", "corner", "rounded")):
        return "radius"
    if any(kw in n for kw in ("spacing", "margin", "padding", "gap", "size",
                               "indent", "inset", "offset", "distance")):
        return "spacing"
    return "spacing"  # default for unlabelled doubles


# ── File-level extraction ─────────────────────────────────────────────────────

def extract_tokens_from_dart(file_path: str) -> dict:
    tokens: dict = {
        "filePath": file_path,
        "colors":   [],
        "fonts":    [],
        "spacing":  [],
        "shadows":  [],
        "radii":    [],
    }

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
            content = fh.read()
    except OSError as exc:
        tokens["_error"] = str(exc)
        return tokens

    # ── Colors from named const declarations ──────────────────────────────────
    for match in RE_CONST_COLOR.finditer(content):
        name, raw_color = match.group(1), match.group(2)
        norm = normalize_color(raw_color)
        if norm:
            tokens["colors"].append({
                "value":  norm,
                "name":   name,
                "source": f"const {name} (Dart)",
            })

    # ── Colors from ColorScheme / palette arguments ───────────────────────────
    for match in RE_COLORSCHEME.finditer(content):
        name, raw_color = match.group(1), match.group(2)
        norm = normalize_color(raw_color)
        if norm:
            tokens["colors"].append({
                "value":  norm,
                "name":   name,
                "source": f"ColorScheme.{name}",
            })

    # ── Font families ─────────────────────────────────────────────────────────
    seen_fonts: set[str] = set()
    for match in RE_FONT_FAMILY.finditer(content):
        family = match.group(1).strip()
        if family and family not in seen_fonts:
            seen_fonts.add(family)
            tokens["fonts"].append({
                "family":  family,
                "weights": [],
                "source":  "TextStyle.fontFamily",
            })

    # ── Spacing / radius constants ────────────────────────────────────────────
    for match in RE_CONST_DOUBLE.finditer(content):
        name, raw_val = match.group(1), match.group(2)
        try:
            val = float(raw_val)
        except ValueError:
            continue
        category = classify_double_name(name)
        if category == "radius":
            tokens["radii"].append({"value": val, "name": name, "source": f"const double {name}"})
        else:
            tokens["spacing"].append({"value": val, "name": name, "source": f"const double {name}"})

    return tokens


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Flutter/Dart design-token extractor — outputs JSON to stdout"
    )
    parser.add_argument("files", nargs="*", help="Dart files to parse")
    parser.add_argument("--glob", help="Glob pattern for Dart files")
    parser.add_argument("--root", default=".", help="Project root for --glob resolution")
    args = parser.parse_args()

    dart_files: list[str] = list(args.files)

    if args.glob:
        root = os.path.realpath(args.root)
        dart_files.extend(
            glob_module.glob(os.path.join(root, args.glob), recursive=True)
        )

    if not dart_files:
        print(json.dumps([]))
        return

    results = []
    for path in dart_files:
        abs_path = os.path.realpath(path)
        if os.path.isfile(abs_path):
            results.append(extract_tokens_from_dart(abs_path))

    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
