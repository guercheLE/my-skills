#!/usr/bin/env python3
"""
xaml-extractor.py — XAML resource dictionary design-token extractor.

Parses WPF / WinUI resource dictionaries (App.xaml, Brushes.xaml, etc.)
and extracts SolidColorBrush, FontFamily, sys:Double, and CornerRadius
resources as design tokens.  Outputs JSON to stdout for mine.ts to consume.

Usage:
    python3 xaml-extractor.py <xaml-file-path> [<xaml-file-path> ...]
    python3 xaml-extractor.py --glob "**/*.xaml" --root /path/to/project
"""

import argparse
import glob as glob_module
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


# ── XAML XML namespace helpers ────────────────────────────────────────────────

XMLNS = {
    "x":   "http://schemas.microsoft.com/winfx/2006/xaml",
    "sys": "clr-namespace:System;assembly=mscorlib",
    "sys_full": "clr-namespace:System;assembly=System.Runtime",
}

# All possible xmlns for x:Key
X_KEY_ATTRS = (
    "{http://schemas.microsoft.com/winfx/2006/xaml}Key",
    "Key",
    "x:Key",
)

def get_x_key(elem: ET.Element) -> str | None:
    for attr in X_KEY_ATTRS:
        val = elem.get(attr)
        if val:
            return val
    return None


# ── Color normalization ───────────────────────────────────────────────────────

def normalize_color(raw: str) -> str | None:
    """Normalize a WPF/WinUI color string to lowercase hex6."""
    v = raw.strip()
    if not v:
        return None

    # #AARRGGBB (WPF typical)
    m = re.match(r"^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{6})$", v)
    if m:
        return "#" + m.group(2).lower()

    # #RRGGBB
    m = re.match(r"^#([0-9A-Fa-f]{6})$", v)
    if m:
        return "#" + m.group(1).lower()

    # #RGB
    m = re.match(r"^#([0-9A-Fa-f]{3})$", v)
    if m:
        c = m.group(1)
        return "#" + "".join(ch * 2 for ch in c).lower()

    # Named WPF colors (just pass through well-known ones)
    named = {
        "White": "#ffffff", "Black": "#000000",
        "Transparent": "transparent", "Red": "#ff0000",
        "Blue": "#0000ff", "Green": "#008000",
    }
    if v in named:
        return named[v]

    return None


# ── Extraction ────────────────────────────────────────────────────────────────

def extract_tokens_from_xaml(file_path: str) -> dict:
    """Parse a single XAML file and return a token bag."""
    tokens: dict = {
        "filePath": file_path,
        "colors":   [],
        "fonts":    [],
        "spacing":  [],
        "shadows":  [],
        "radii":    [],
    }

    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
    except ET.ParseError as exc:
        tokens["_error"] = f"XML parse error: {exc}"
        return tokens

    # Normalise namespace prefix for local tag names
    def local(tag: str) -> str:
        return tag.split("}")[-1] if "}" in tag else tag

    def walk(elem: ET.Element) -> None:
        tag = local(elem.tag)
        key = get_x_key(elem)

        # SolidColorBrush: <SolidColorBrush x:Key="PrimaryBrush" Color="#1A1A2E"/>
        if tag == "SolidColorBrush":
            color_attr = elem.get("Color", "").strip()
            if color_attr:
                norm = normalize_color(color_attr)
                if norm:
                    tokens["colors"].append({
                        "value":  norm,
                        "name":   key or "brush",
                        "source": f"SolidColorBrush[@Key={key!r}]",
                    })

        # Color resource: <Color x:Key="PrimaryColor">#1A1A2E</Color>
        elif tag == "Color" and key:
            raw = (elem.text or "").strip()
            norm = normalize_color(raw)
            if norm:
                tokens["colors"].append({
                    "value":  norm,
                    "name":   key,
                    "source": f"Color[@Key={key!r}]",
                })

        # FontFamily: <FontFamily x:Key="BodyFont">Segoe UI</FontFamily>
        elif tag == "FontFamily" and key:
            family = (elem.text or "").strip().split(",")[0].strip().strip("'\"")
            if family:
                tokens["fonts"].append({
                    "family":  family,
                    "weights": [],
                    "source":  f"FontFamily[@Key={key!r}]",
                })

        # sys:Double / Double: <sys:Double x:Key="SpacingMd">16</sys:Double>
        elif tag in ("Double", "Single") and key:
            try:
                val = float((elem.text or "0").strip())
                name_lower = key.lower()
                if any(kw in name_lower for kw in ("radius", "corner", "rounded")):
                    tokens["radii"].append({"value": val, "name": key, "source": f"sys:Double[@Key={key!r}]"})
                else:
                    tokens["spacing"].append({"value": val, "name": key, "source": f"sys:Double[@Key={key!r}]"})
            except ValueError:
                pass

        # CornerRadius: <CornerRadius x:Key="SmallRadius">4</CornerRadius>
        elif tag == "CornerRadius" and key:
            # May be "4" or "4,4,4,4"
            raw = (elem.text or "").strip()
            try:
                val = float(raw.split(",")[0])
                tokens["radii"].append({"value": val, "name": key, "source": f"CornerRadius[@Key={key!r}]"})
            except ValueError:
                pass

        for child in elem:
            walk(child)

    walk(root)
    return tokens


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="XAML resource dictionary token extractor — outputs JSON to stdout"
    )
    parser.add_argument("files", nargs="*", help="XAML files to parse")
    parser.add_argument("--glob", help="Glob pattern for XAML files")
    parser.add_argument("--root", default=".", help="Project root for --glob resolution")
    args = parser.parse_args()

    xaml_files: list[str] = list(args.files)

    if args.glob:
        root = os.path.realpath(args.root)
        xaml_files.extend(
            glob_module.glob(os.path.join(root, args.glob), recursive=True)
        )

    if not xaml_files:
        print(json.dumps([]))
        return

    results = []
    for path in xaml_files:
        abs_path = os.path.realpath(path)
        if os.path.isfile(abs_path):
            results.append(extract_tokens_from_xaml(abs_path))

    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
