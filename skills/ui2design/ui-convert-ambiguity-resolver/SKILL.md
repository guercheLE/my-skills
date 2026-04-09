---
name: ui-convert-ambiguity-resolver
description: >
  AI-powered artifact triage for the ui2design pipeline. Handles files that the deterministic scanner marked
  as "unknown" — uses semantic analysis to determine if they are visual (component/page/style/layout) or
  non-visual (irrelevant). Updates index.json with resolved classifications.
  Use this skill when the scanner produces artifacts with category "unknown". The coordinator dispatches
  to this skill automatically. Also useful for manual re-classification when scanner results seem wrong.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, classification, ai, triage]
---

# Ambiguity Resolver

An AI agent that classifies artifacts the deterministic scanner couldn't categorize. Reads the file content,
analyzes its visual relevance, and updates `index.json` with a resolved category.

## When This Runs

The scanner (`ui-convert-scanner`) classifies most files deterministically. Files that don't match any
clear pattern get `category: "unknown"`. The coordinator dispatches those to this skill for AI triage.

Typical "unknown" files:
- Utility modules that export both logic and styled components
- Files mixing data fetching with UI rendering
- Custom hooks that return JSX
- Wrapper components that are mostly logic
- Files with unconventional naming or structure

---

## Resolution Process

### Step 1: Gather Context

For each unknown artifact, read:
1. The file content (full source code)
2. Its import/export statements
3. Files that depend on it (from `index.json` deps)
4. The project technology (from `project.json`)

### Step 2: Analyze Visual Relevance

Ask these questions about the file:

1. **Does it render visual output?** (JSX, HTML, template markup, XAML elements)
2. **Does it define styles?** (CSS-in-JS, style objects, class definitions)
3. **Is it consumed as a UI component?** (imported and rendered by other components)
4. **What proportion is visual vs. logic?** (>60% visual → visual artifact)

### Step 3: Classify

| Finding | Classification |
|---------|---------------|
| Renders UI, exports component | `component` |
| Renders full page/view/screen | `page` |
| Defines layout structure, wraps children | `layout` |
| Only defines styles/themes | `style` |
| Pure logic, no visual output | `irrelevant` |
| Mixed — primarily visual with some logic | `component` |
| Mixed — primarily logic with minor UI | `irrelevant` |

### Step 4: Update index.json

Update the artifact's `category` field in `index.json`. Log the resolution to `logs/skipped.jsonl`
if classified as irrelevant, including the reason.

```json
{"ts":"2026-04-04T12:14:30Z","artifact":"a010","reason":"pure-utility","classifier":"ambiguity-resolver","detail":"File exports only helper functions, no JSX/HTML output"}
```

---

## Heuristics by Technology

### React/JSX/TSX
- Has `return (` or `return <` with JSX → visual
- Exports only functions returning non-JSX → irrelevant
- Custom hooks (`use*`) that return JSX → component
- Custom hooks that return only data → irrelevant

### Vue SFC
- Has `<template>` section → visual
- Only `<script>` with composables → irrelevant

### Angular
- Has `@Component` decorator with `template`/`templateUrl` → component
- Service files (`@Injectable`) → irrelevant
- Pipes, guards, interceptors → irrelevant

### XAML
- Defines visual elements (Grid, StackPanel, Button) → visual
- Only defines converters, behaviors → irrelevant

### Flutter/Dart
- Extends `StatelessWidget` or `StatefulWidget` with `build()` method → visual
- Provider, repository, service classes → irrelevant

---

## Batch Processing

Process unknown artifacts in batches of 5–10 to reduce per-file overhead.
For each batch:
1. Read all file contents
2. Classify all in one analysis pass
3. Update `index.json` once per batch
4. Log all resolutions

---

## Cross-references

- **Input** → `index.json` artifacts with `category: "unknown"`
- **Output** → updated `index.json` with resolved categories
- **Called by** → `ui-convert-coordinator` (after scanning)
- **Scanner** → `ui-convert-scanner` (produces the unknowns)
