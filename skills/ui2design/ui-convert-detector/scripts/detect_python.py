#!/usr/bin/env python3
"""
detect_python.py — Python project technology detection.

Parses requirements.txt and pyproject.toml (PEP 621 / Poetry) to identify
Django, Flask, FastAPI, Jinja2, and similar Python web frameworks.
Falls back to indicator files (manage.py, wsgi.py, asgi.py) when no
dependency files are present.  Outputs JSON to stdout for detect.ts.

Usage:
    python3 detect_python.py <project-path>
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ── Dependency parsing ────────────────────────────────────────────────────────

def _normalize_pkg(name: str) -> str:
    """Lowercase and collapse underscores/hyphens for comparison."""
    return re.sub(r"[-_]+", "-", name.strip().lower())


def _strip_version_specifier(token: str) -> str:
    """'Django>=3.2' → 'django', 'flask[async]~=2.0' → 'flask'."""
    return re.split(r"[>=<!~;\[\s]", token)[0]


def parse_requirements_txt(req_path: str) -> list[str]:
    """Return list of normalized package names from requirements.txt."""
    packages: list[str] = []
    try:
        with open(req_path, "r", encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith(("#", "-r", "--")):
                    continue
                pkg = _normalize_pkg(_strip_version_specifier(line))
                if pkg:
                    packages.append(pkg)
    except OSError:
        pass
    return packages


def parse_pyproject_toml(toml_path: str) -> list[str]:
    """Return list of normalized package names from pyproject.toml."""
    packages: list[str] = []
    data: dict = {}

    try:
        try:
            import tomllib  # Python 3.11+
            with open(toml_path, "rb") as fh:
                data = tomllib.load(fh)
        except ImportError:
            try:
                import toml  # third-party
                with open(toml_path, "r", encoding="utf-8") as fh:
                    data = toml.load(fh)
            except ImportError:
                # Last resort: naive regex extraction
                with open(toml_path, "r", encoding="utf-8") as fh:
                    content = fh.read()
                for match in re.findall(r'"([a-zA-Z][a-zA-Z0-9_\-]+)\s*[>=<!~]', content):
                    packages.append(_normalize_pkg(match))
                return packages
    except OSError:
        return packages

    # PEP 621
    for dep in data.get("project", {}).get("dependencies", []):
        if isinstance(dep, str):
            packages.append(_normalize_pkg(_strip_version_specifier(dep)))

    # Poetry
    poetry_deps = data.get("tool", {}).get("poetry", {}).get("dependencies", {})
    for dep_name in poetry_deps:
        if isinstance(dep_name, str) and dep_name.lower() != "python":
            packages.append(_normalize_pkg(dep_name))

    return packages


# ── Detection logic ───────────────────────────────────────────────────────────

# Ordered from most-specific to least-specific so meta-frameworks win.
_CHECKS: list[tuple[str, str]] = [
    ("django", "django"),
    ("flask", "flask"),
    ("fastapi", "fastapi"),
    ("starlette", "starlette"),
    ("pyramid", "pyramid"),
    ("tornado", "tornado"),
    ("bottle", "bottle"),
    ("aiohttp", "aiohttp"),
    ("jinja2", "jinja2"),
    ("mako", "mako"),
    ("chameleon", "chameleon"),
]


def detect_tech(packages: list[str]) -> dict:
    pkg_set = set(packages)
    for pkg, tech in _CHECKS:
        if pkg in pkg_set:
            return {"tech": tech, "version": None}
    return {"tech": None, "version": None}


def detect_from_indicator_files(project_path: str) -> dict:
    """Check well-known indicator files that don't require parsing."""
    indicators = [
        ("manage.py", "django"),        # Django management script
        ("wsgi.py", "flask"),           # Common in Flask projects
        ("asgi.py", "fastapi"),         # Common in FastAPI / Starlette
    ]
    for filename, tech in indicators:
        if os.path.isfile(os.path.join(project_path, filename)):
            return {"tech": tech, "version": None}

    # Look for typical Django app structure
    if os.path.isdir(os.path.join(project_path, "templates")) and any(
        os.path.isfile(os.path.join(project_path, d, "urls.py"))
        for d in os.listdir(project_path)
        if os.path.isdir(os.path.join(project_path, d))
    ):
        return {"tech": "django", "version": None}

    return {"tech": None, "version": None}


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Python project technology detection — outputs JSON to stdout"
    )
    parser.add_argument("project_path", help="Absolute or relative path to the project folder")
    args = parser.parse_args()

    project_path = os.path.realpath(args.project_path)
    if not os.path.isdir(project_path):
        print(json.dumps({"tech": None, "version": None, "error": f"Not a directory: {project_path}"}))
        sys.exit(1)

    packages: list[str] = []

    req_path = os.path.join(project_path, "requirements.txt")
    if os.path.isfile(req_path):
        packages.extend(parse_requirements_txt(req_path))

    toml_path = os.path.join(project_path, "pyproject.toml")
    if os.path.isfile(toml_path):
        packages.extend(parse_pyproject_toml(toml_path))

    if packages:
        result = detect_tech(packages)
        print(json.dumps(result))
        return

    # Fall back to indicator files
    result = detect_from_indicator_files(project_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
