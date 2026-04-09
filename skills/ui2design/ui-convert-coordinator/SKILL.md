---
name: ui-convert-coordinator
description: >
  Orchestrator agent for the ui2design pipeline. Manages the full conversion lifecycle: input gating (folder +
  target tool selection), MCP preflight, batch sequencing (tokens → styles → components → pages), stop rules,
  resume from checkpoint, and subagent dispatch for extraction and writing.
  Use this skill whenever you want to convert a UI project to a design tool — it is the entry point.
  Invoke it when the user says "convert this project", "turn this into Figma/Pencil/Penpot", or any variant.
  This skill orchestrates all other ui-convert-* skills. Start here, always.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, orchestrator, pipeline, coordinator]
---

# Pipeline Coordinator

The coordinator is the single entry point for all UI-to-design-tool conversions. It orchestrates the full
pipeline by dispatching to specialized skills and managing state transitions on disk.

## Non-negotiable Rules

1. **Never skip preflight** — always verify MCP connectivity before any write.
2. **Batch order is sacred** — tokens → styles → components → pages. Never scramble.
3. **Resume, don't restart** — always check `progress.json` before beginning.
4. **One writer at a time** — MCP writes are serialized. Never parallelize writes.
5. **Stop on critical failure** — if detection or MCP validation fails, halt and report.
6. **State on disk only** — never store pipeline state in chat context.

---

## Entry Flow

```
User: "Convert this project to Pencil.dev"
          │
          ▼
┌─────────────────────────┐
│ 1. Input Gating         │  ← Confirm folder path + target tool
│    - Validate folder    │
│    - Confirm target     │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 2. MCP Preflight        │  ← ui-convert-mcp-validator
│    - Server reachable?  │
│    - Required tools?    │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 3. Detection            │  ← ui-convert-detector
│    → project.json       │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 4. Scanning             │  ← ui-convert-scanner
│    → index.json         │
│    → ambiguity-resolver │
│      (if unknowns)      │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 5. Token Mining         │  ← ui-convert-token-miner
│    → tokens.json        │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 6. Extraction           │  ← ui-convert-extractor-{tech}
│    → ir/*.json          │  Batch: styles → components → pages
│    (parallelizable)     │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 7. Writing              │  ← ui-convert-writer-{tool}
│    → registry.json      │  Serialized: tokens → styles →
│    (serialized)         │    components → pages
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 8. Completion           │  ← progress.json stage="done"
│    - Summary report     │
│    - Error/skip summary │
└─────────────────────────┘
```

---

## Input Gating

Before starting, confirm two things:

1. **Source folder** — the project directory to convert. Must exist, must contain source files.
2. **Target tool** — one of: `pencil`, `figma`, `penpot`, `stitch`, `paper`.

If the user provides both in their message (e.g., "convert ~/myapp to Figma"), proceed immediately.
If either is missing, ask. Do not guess the target tool.

Validate the folder:
- Must be a directory (not a file)
- Must not be empty
- Must not be inside `node_modules`, `.git`, `dist`, or `build`

---

## Resume Logic

On every pipeline start:

1. Check if `.ui-convert/progress.json` exists in the target folder.
2. If it exists, read it:
   - If `stage` is `done`, ask: "This project was already converted. Re-run from scratch or skip?"
   - Otherwise, report: "Found checkpoint at stage={stage}, artifact={lastArtifact}. Resuming."
3. Skip all `completed` artifacts. Retry `failed` artifacts (max 2 retries).

---

## Batch Sequencing

Extraction and writing follow a strict batch order.
Phase names here must match the `phase` field in `progress.json` exactly (see `ui-convert-state`).

| Phase | Category (progress.json `phase`) | Why first |
|-------|----------------------------------|-----------|
| 1 | `tokens` | Global design tokens → variables/styles in tool |
| 2 | `styles` | Style artifacts (CSS/SCSS/theme) → token references |
| 3 | `components` | Reusable components → component origins |
| 4 | `layouts` | Layout wrappers → frames/pages |
| 5 | `pages` | Full pages → assemble components into layouts |

Within each phase, artifacts are processed by `priority` from `index.json` (1 = highest).

---

## Stop Rules

Halt the pipeline immediately when:

- MCP server is unreachable or missing required tools
- Detection fails (no recognized technology)
- Scan produces 0 visual artifacts
- 5+ consecutive extraction failures
- Writer receives an authentication/permission error

On halt: update `progress.json`, write error to `logs/errors.jsonl`, report to user.

---

## Extractor Routing

Based on `project.json` `tech` field, dispatch to the appropriate extractor:

| Tech | Extractor Skill |
|------|----------------|
| `react`, `nextjs`, `remix` | `ui-convert-extractor-react` |
| `vue`, `nuxt` | `ui-convert-extractor-vue` |
| `angular` | `ui-convert-extractor-angular` |
| `html` | `ui-convert-extractor-html` |
| `svelte`, `sveltekit` | `ui-convert-extractor-svelte` |
| `blazor` | `ui-convert-extractor-blazor` |
| `razor` | `ui-convert-extractor-razor` |
| `webforms` | `ui-convert-extractor-webforms` |
| `wpf` | `ui-convert-extractor-wpf` |
| `winui` | `ui-convert-extractor-winui` |
| `winforms` | `ui-convert-extractor-winforms` |
| `php`, `php-blade`, `php-twig` | `ui-convert-extractor-php` |
| `jinja2`, `django`, `flask` | `ui-convert-extractor-python-templates` |
| `lit`, `web-components` | `ui-convert-extractor-web-components` |
| `flutter` | `ui-convert-extractor-flutter` |
| `react-native` | `ui-convert-extractor-react-native` |

---

## Writer Routing

Based on `project.json` `targetTool` field:

| Tool | Writer Skill |
|------|-------------|
| `pencil` | `ui-convert-writer-pencil` |
| `figma` | `ui-convert-writer-figma` |
| `penpot` | `ui-convert-writer-penpot` |
| `stitch` | `ui-convert-writer-stitch` |
| `paper` | `ui-convert-writer-paper` |

---

## Completion Report

When all artifacts are processed, generate a summary:

```
✅ Conversion complete: ~/myapp → Pencil.dev

Detected: React 18 + Tailwind CSS
Artifacts: 42 total
  - Extracted: 38
  - Written: 38
  - Failed: 3 (see .ui-convert/logs/errors.jsonl)
  - Skipped: 1 (non-visual)

Design tokens: 24 colors, 8 fonts, 12 spacing values
Components: 15 created
Pages: 5 created

Registry: .ui-convert/registry.json
```

---

## Cross-references

- **MCP validation** → `ui-convert-mcp-validator`
- **Detection** → `ui-convert-detector` (uses `ui-convert-tech-markers`)
- **Scanning** → `ui-convert-scanner`
- **Token mining** → `ui-convert-token-miner`
- **Ambiguity** → `ui-convert-ambiguity-resolver`
- **State schemas** → `ui-convert-state`
- **IR format** → `ui-convert-ir-schema`
