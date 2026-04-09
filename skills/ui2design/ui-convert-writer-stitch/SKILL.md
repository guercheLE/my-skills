---
name: ui-convert-writer-stitch
description: >
  Design IR to Stitch writer for the ui2design pipeline. Converts IR JSON files into Stitch MCP calls
  to create design elements, components, tokens, and pages in Stitch projects.
  Use this skill when the target tool is stitch and the pipeline needs to write extracted IR to Stitch.
  Serialized write order: tokens → styles → components → pages. Follows the same writer pattern as
  all other ui-convert-writer-* skills: registry updates, hash-based idempotency, serialized MCP calls.
version: 1.0.0
author: ui2design
tags: [ui-convert, writer, stitch, mcp, design]
---

# Stitch Writer

Converts Design IR files into Stitch MCP calls. Creates design artifacts in a Stitch project
using the serialized write order: tokens → styles → components → pages.

## Non-negotiable Rules

1. **Serialized writes** — never parallelize MCP calls.
2. **Registry updates** — update `registry.json` after every successful write.
3. **Idempotency** — check `registry.json` before writing. Skip if hash matches.
4. **Follow Stitch API conventions** — use Stitch-native element types and properties.

---

## Write Order

### Phase 1: Tokens → Stitch Design Tokens

Map IR tokens to Stitch's token/variable system:

| Token Type | Stitch Equivalent |
|-----------|------------------|
| Colors | Color variables |
| Spacing | Spacing variables |
| Radii | Radius variables |
| Fonts | Typography definitions |
| Shadows | Effect definitions |

### Phase 2: Styles → Stitch Shared Styles

Create reusable style definitions from token combinations.

### Phase 3: Components → Stitch Components

For each IR component:
1. Read IR file from `.ui-convert/ir/`
2. Create Stitch element with appropriate type
3. Add child elements
4. Mark as reusable component
5. Update `registry.json`

IR-to-Stitch property mapping follows the standard pattern:

| IR Key | Stitch Property |
|--------|----------------|
| `w`, `h` | Width, height |
| `x`, `y` | Position |
| `bg` | Background fill (token reference) |
| `fg` | Text color |
| `d` | Layout direction |
| `al`, `jc` | Alignment, justification |
| `g` | Gap |
| `p` | Padding |
| `br` | Border + radius |
| `op` | Opacity |
| `txt` | Text content |

### Phase 4: Layouts → Stitch Layout Containers

For each layout artifact:
1. Create a container with page-level dimensions
2. Apply layout properties (direction, padding, gap)
3. Insert placeholder slots for child pages/sections
4. Convert to component if the layout is reused across pages

### Phase 5: Pages → Stitch Pages/Artboards

For each page artifact:
1. Create page/artboard
2. Create elements from IR node tree
3. Use component instances for `ref` nodes
4. Apply layout properties

---

## IR Node Type → Stitch Element

| IR Type | Stitch Implementation |
|---------|----------------------|
| `pg` | Page/artboard |
| `fr` | Container with layout |
| `txt` | Text element |
| `btn` | Component: container + text |
| `inp` | Styled input element |
| `img` | Image element |
| `crd` | Container with styling |
| `mdl` | Overlay container |
| `hdr`, `nav`, `ftr`, `sdb` | Semantic containers |
| `lst`, `tbl` | List/table containers |
| `ref` | Component instance |

---

## MCP Tool Signatures

This writer uses the concrete tool signatures defined in [references/stitch-mcp-tools.md](references/stitch-mcp-tools.md).
All MCP calls must match those signatures. If the Stitch MCP server does not expose a required tool,
the `ui-convert-mcp-validator` preflight will catch and report it before any writes begin.

---

## Error Handling

- **MCP tool not found** → halt and report; Stitch MCP may not be configured
- **Token conflicts** → append suffix
- **Rate limits** → add delay between batches
- **Auth errors** → halt pipeline

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Registry** → `ui-convert-state` (`registry.json`)
- **Called by** → `ui-convert-coordinator` (when `targetTool: "stitch"`)
- **Writer pattern** → same as `ui-convert-writer-pencil`, `ui-convert-writer-figma`
- **MCP tool signatures** → [references/stitch-mcp-tools.md](references/stitch-mcp-tools.md)
