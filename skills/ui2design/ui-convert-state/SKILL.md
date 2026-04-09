---
name: ui-convert-state
description: >
  Disk state schema for the ui2design pipeline. Defines the structure and contracts for all state files stored
  in the `.ui-convert/` directory: project.json, index.json, tokens.json, registry.json, and progress.json.
  Use this skill whenever you need to read, write, validate, or understand pipeline state — including during
  detection, scanning, token mining, extraction, writing, or resume operations.
  Every skill in the pipeline reads or writes state files. If you're touching `.ui-convert/`, read this first.
version: 1.0.0
author: ui2design
tags: [ui-convert, foundation, state, schema, disk, resumability]
---

# Disk State Schema

All pipeline state lives on disk in the `.ui-convert/` directory at the project root.
State is never stored in chat context, environment variables, or memory.
This enables resumability, idempotency, and parallel extraction safety.

## Non-negotiable Rules

1. **State directory is `.ui-convert/`** at the project root being converted.
2. **JSON files only** — no YAML, no TOML, no binary formats.
3. **Atomic writes** — write to a `.tmp` file, then rename (prevents corruption on crash).
4. **Schema versioning** — every state file has a `_v` key indicating schema version.
5. **No state in chat** — skills read from disk, process, write back to disk.
6. **Append-only logs** — the `logs/` dir is append-only; never delete log entries.

---

## Directory Structure

```
.ui-convert/
├── project.json      # detected tech, chosen tool, config
├── index.json        # artifact list with classification
├── tokens.json       # extracted design tokens
├── registry.json     # design tool entity IDs (created artifacts)
├── progress.json     # checkpoint for resume
├── ir/               # one IR file per artifact
│   ├── btn-primary.json
│   ├── page-home.json
│   └── ...
└── logs/             # append-only error/skip log
    ├── errors.jsonl
    └── skipped.jsonl
```

---

## File Schemas

### project.json

Written by: `ui-convert-detector`
Read by: all pipeline skills

```json
{
  "_v": 1,
  "root": "/absolute/path/to/project",
  "tech": "react",
  "uiFramework": "tailwind",
  "techVersion": "18.2.0",
  "uiFrameworkVersion": "3.4.0",
  "targetTool": "pencil",
  "createdAt": "2026-04-04T12:00:00Z",
  "updatedAt": "2026-04-04T12:05:00Z",
  "config": {
    "excludePaths": ["node_modules", "dist", "build", ".git"],
    "includeTests": false,
    "maxDepth": 10
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_v` | `number` | yes | Schema version (currently `1`) |
| `root` | `string` | yes | Absolute path to the project being converted |
| `tech` | `string` | yes | Detected technology (see `ui-convert-tech-markers`) |
| `uiFramework` | `string\|null` | yes | Detected UI framework or `null` |
| `techVersion` | `string\|null` | no | Detected version of the technology |
| `uiFrameworkVersion` | `string\|null` | no | Detected version of the UI framework |
| `targetTool` | `string` | yes | Target design tool: `pencil`, `figma`, `penpot`, `stitch`, `paper` |
| `createdAt` | `string` | yes | ISO 8601 timestamp |
| `updatedAt` | `string` | yes | ISO 8601 timestamp |
| `config` | `object` | no | User overrides |

Valid `tech` values: `react`, `nextjs`, `remix`, `vue`, `nuxt`, `angular`, `svelte`, `sveltekit`, `html`, `blazor`, `razor`, `webforms`, `wpf`, `winui`, `winforms`, `php-blade`, `php-twig`, `php`, `jinja2`, `django`, `flask`, `lit`, `web-components`, `flutter`, `react-native`

Valid `targetTool` values: `pencil`, `figma`, `penpot`, `stitch`, `paper`

---

### index.json

Written by: `ui-convert-scanner` (initial), `ui-convert-ambiguity-resolver` (updates)
Read by: extractors, coordinator

```json
{
  "_v": 1,
  "total": 42,
  "artifacts": [
    {
      "id": "a001",
      "path": "src/components/Button.tsx",
      "category": "component",
      "name": "Button",
      "hash": "sha256:abc123...",
      "deps": ["a005", "a012"],
      "priority": 1,
      "size": 2048,
      "lastModified": "2026-03-15T10:30:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique artifact ID (e.g., `a001`) |
| `path` | `string` | Relative path from project root |
| `category` | `string` | Classification (see below) |
| `name` | `string` | Human-readable artifact name |
| `hash` | `string` | Content hash for change detection |
| `deps` | `string[]` | IDs of artifacts this depends on |
| `priority` | `number` | Extraction order priority (1 = highest) |
| `size` | `number` | File size in bytes |
| `lastModified` | `string` | ISO 8601 timestamp |

Valid `category` values:
- `style` — global styles, theme files, CSS modules
- `component` — reusable UI components
- `page` — full pages, views, screens
- `layout` — layout wrappers, shells
- `unknown` — needs AI triage (→ `ui-convert-ambiguity-resolver`)
- `irrelevant` — non-visual (utils, hooks, API, types, tests)

---

### tokens.json

Written by: `ui-convert-token-miner`
Read by: extractors (for referencing global tokens in IR)

```json
{
  "_v": 1,
  "source": "tailwind.config.js",
  "colors": {
    "c1": { "value": "#1a1a2e", "name": "primary", "source": "colors.primary" },
    "c2": { "value": "#16213e", "name": "secondary", "source": "colors.secondary" },
    "c3": { "value": "#e94560", "name": "accent", "source": "colors.accent" }
  },
  "fonts": {
    "f1": { "family": "Inter", "weights": [400, 500, 600, 700], "source": "fontFamily.sans" },
    "f2": { "family": "JetBrains Mono", "weights": [400, 700], "source": "fontFamily.mono" }
  },
  "spacing": {
    "s1": { "value": 4, "name": "xs", "source": "spacing.1" },
    "s2": { "value": 8, "name": "sm", "source": "spacing.2" },
    "s3": { "value": 16, "name": "md", "source": "spacing.4" },
    "s4": { "value": 24, "name": "lg", "source": "spacing.6" },
    "s5": { "value": 32, "name": "xl", "source": "spacing.8" }
  },
  "shadows": {
    "sh1": { "value": "0 1px 3px rgba(0,0,0,0.1)", "name": "sm", "source": "boxShadow.sm" }
  },
  "radii": {
    "r1": { "value": 4, "name": "sm", "source": "borderRadius.sm" },
    "r2": { "value": 8, "name": "md", "source": "borderRadius.md" }
  }
}
```

Token IDs (`c1`, `f1`, `s1`, etc.) match the short-key convention in `ui-convert-ir-schema`.

---

### registry.json

Written by: writer skills (`ui-convert-writer-*`)
Read by: coordinator, writers (for idempotency)

```json
{
  "_v": 1,
  "tool": "pencil",
  "entities": {
    "c1": { "toolId": "pen_node_abc123", "type": "variable", "createdAt": "2026-04-04T12:10:00Z" },
    "b1": { "toolId": "pen_node_def456", "type": "component", "createdAt": "2026-04-04T12:11:00Z", "hash": "sha256:xyz..." }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tool` | `string` | Target design tool name |
| `entities` | `object` | Map of IR ID → tool entity info |
| `entities[id].toolId` | `string` | The ID assigned by the design tool |
| `entities[id].type` | `string` | Entity type: `variable`, `style`, `component`, `page`, `frame` |
| `entities[id].createdAt` | `string` | ISO 8601 timestamp |
| `entities[id].hash` | `string` | Content hash at time of creation (for change detection) |

Writers check `registry.json` before creating entities. If an entity with the same IR ID exists and its hash matches, skip it (idempotent). If the hash differs, update it.

---

### progress.json

Written by: coordinator, extractors, writers
Read by: coordinator (for resume)

```json
{
  "_v": 1,
  "stage": "extract",
  "phase": "components",
  "lastArtifact": "a015",
  "completed": ["a001", "a002", "a003", "a004", "a005"],
  "failed": ["a007"],
  "skipped": ["a010"],
  "startedAt": "2026-04-04T12:00:00Z",
  "updatedAt": "2026-04-04T12:15:00Z",
  "stats": {
    "totalArtifacts": 42,
    "extracted": 5,
    "written": 0,
    "failed": 1,
    "skipped": 1
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stage` | `string` | Current pipeline stage: `detect`, `scan`, `mine`, `extract`, `write`, `done` |
| `phase` | `string` | Current batch phase: `tokens`, `styles`, `components`, `layouts`, `pages` |
| `lastArtifact` | `string\|null` | ID of last processed artifact |
| `completed` | `string[]` | IDs of successfully processed artifacts |
| `failed` | `string[]` | IDs of artifacts that failed |
| `skipped` | `string[]` | IDs of skipped artifacts |
| `startedAt` | `string` | ISO 8601 pipeline start time |
| `updatedAt` | `string` | ISO 8601 last update time |
| `stats` | `object` | Summary counters |

---

## Log Files

### errors.jsonl

Append-only, one JSON object per line:

```json
{"ts":"2026-04-04T12:14:00Z","artifact":"a007","stage":"extract","error":"ParseError: Unexpected token","stack":"..."}
```

### skipped.jsonl

```json
{"ts":"2026-04-04T12:14:30Z","artifact":"a010","reason":"irrelevant","classifier":"scanner"}
```

---

## State Transitions

```
(empty)
  → detect   → project.json created
  → scan     → index.json created
  → mine     → tokens.json created
  → extract  → ir/*.json files created, progress.json updated per artifact
  → write    → registry.json created/updated, progress.json updated per entity
  → done     → progress.json stage="done"
```

On resume: read `progress.json`, skip completed artifacts, continue from `lastArtifact`.

---

## Cross-references

- **IR files** conform to `ui-convert-ir-schema`
- **Token IDs** in `tokens.json` use the same short-key convention as IR
- **project.json tech values** map to `ui-convert-tech-markers` detection results
- **Coordinator** manages state transitions → see `ui-convert-coordinator`
