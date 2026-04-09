#!/usr/bin/env python3
"""
detect_dotnet.py — .NET project technology detection.

Analyzes .csproj files to disambiguate WPF / WinUI / WinForms / Blazor /
Razor Pages / WebForms.  Outputs JSON to stdout for detect.ts to consume.

Usage:
    python3 detect_dotnet.py <project-path>
"""

import argparse
import glob
import json
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def _find_csproj_files(project_path: str) -> list[str]:
    return glob.glob(os.path.join(project_path, "**", "*.csproj"), recursive=True)


def _collect_project_info(csproj_path: str) -> dict:
    """Return sdk, package refs, and boolean property flags from a .csproj."""
    sdk = ""
    package_refs: set[str] = set()
    use_wpf = False
    use_winforms = False
    output_type = ""

    try:
        tree = ET.parse(csproj_path)
        root_elem = tree.getroot()
    except ET.ParseError as exc:
        return {"error": f"XML parse error: {exc}"}

    # SDK attribute may be on the root Project element
    sdk = root_elem.get("Sdk", "")

    for elem in root_elem.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        text = (elem.text or "").strip()

        if tag == "PackageReference":
            include = elem.get("Include", "").lower()
            if include:
                package_refs.add(include)
        elif tag == "UseWPF" and text.lower() == "true":
            use_wpf = True
        elif tag == "UseWindowsForms" and text.lower() == "true":
            use_winforms = True
        elif tag == "OutputType":
            output_type = text.lower()
        elif tag == "Sdk" and text:
            sdk = sdk or text

    return {
        "sdk": sdk.lower(),
        "package_refs": package_refs,
        "use_wpf": use_wpf,
        "use_winforms": use_winforms,
        "output_type": output_type,
    }


def _detect_from_csproj(csproj_path: str) -> dict | None:
    """Return {'tech': ..., 'version': ...} or None if unrecognised."""
    info = _collect_project_info(csproj_path)

    if "error" in info:
        return None

    sdk: str = info["sdk"]
    pkg: set[str] = info["package_refs"]
    csproj_dir = os.path.dirname(csproj_path)

    # ── Explicit MSBuild properties ──────────────────────────────────────────
    if info["use_wpf"]:
        return {"tech": "wpf", "version": None}

    if info["use_winforms"]:
        return {"tech": "winforms", "version": None}

    # ── Package references ────────────────────────────────────────────────────
    has_winui = any("microsoft.winui" in p or "winui" in p for p in pkg)
    has_webforms = any("microsoft.aspnet.webforms" in p for p in pkg)
    has_blazor_pkg = any("microsoft.aspnetcore.components" in p for p in pkg)

    if has_winui:
        return {"tech": "winui", "version": None}
    if has_webforms:
        return {"tech": "webforms", "version": None}

    # ── SDK-based detection ───────────────────────────────────────────────────
    if "blazorwebassembly" in sdk or "blazor" in sdk:
        return {"tech": "blazor", "version": None}

    if sdk in ("microsoft.net.sdk.web", "microsoft.net.sdk.razor"):
        # Disambiguate by file presence
        razor_files = glob.glob(
            os.path.join(csproj_dir, "**", "*.razor"), recursive=True
        )
        razor_component = [
            f for f in razor_files if not f.endswith(".razor.cs")
        ]
        if razor_component or has_blazor_pkg:
            return {"tech": "blazor", "version": None}

        cshtml_files = glob.glob(
            os.path.join(csproj_dir, "**", "*.cshtml"), recursive=True
        )
        if cshtml_files:
            return {"tech": "razor", "version": None}

        aspx_files = glob.glob(
            os.path.join(csproj_dir, "**", "*.aspx"), recursive=True
        )
        if aspx_files:
            return {"tech": "webforms", "version": None}

        return {"tech": "razor", "version": None}

    # ── Fallback: scan file extensions in the project directory ──────────────
    if glob.glob(os.path.join(csproj_dir, "**", "*.razor"), recursive=True):
        return {"tech": "blazor", "version": None}
    if glob.glob(os.path.join(csproj_dir, "**", "*.cshtml"), recursive=True):
        return {"tech": "razor", "version": None}
    if glob.glob(os.path.join(csproj_dir, "**", "*.aspx"), recursive=True):
        return {"tech": "webforms", "version": None}

    xaml_files = glob.glob(os.path.join(csproj_dir, "**", "*.xaml"), recursive=True)
    if xaml_files:
        # Peek at the first XAML file to distinguish WPF vs WinUI
        try:
            with open(xaml_files[0], "r", encoding="utf-8", errors="replace") as fh:
                content = fh.read(4096)
            if "microsoft.ui.xaml" in content.lower():
                return {"tech": "winui", "version": None}
            if "schemas.microsoft.com/winfx/2006/xaml/presentation" in content:
                return {"tech": "wpf", "version": None}
        except OSError:
            pass
        return {"tech": "wpf", "version": None}

    if glob.glob(os.path.join(csproj_dir, "**", "*.Designer.cs"), recursive=True):
        return {"tech": "winforms", "version": None}

    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description=".NET project technology detection — outputs JSON to stdout"
    )
    parser.add_argument("project_path", help="Absolute or relative path to the project folder")
    args = parser.parse_args()

    project_path = os.path.realpath(args.project_path)
    if not os.path.isdir(project_path):
        print(json.dumps({"tech": None, "version": None, "error": f"Not a directory: {project_path}"}))
        sys.exit(1)

    csproj_files = _find_csproj_files(project_path)
    if not csproj_files:
        print(json.dumps({"tech": None, "version": None, "error": "No .csproj files found"}))
        sys.exit(0)

    for csproj in sorted(csproj_files):
        result = _detect_from_csproj(csproj)
        if result and result.get("tech"):
            print(json.dumps(result))
            return

    print(json.dumps({"tech": None, "version": None}))


if __name__ == "__main__":
    main()
