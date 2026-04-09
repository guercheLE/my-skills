---
name: ui-convert-writer-penpot
description: >
  Design IR to Penpot writer for the ui2design pipeline. Converts IR JSON files into Penpot MCP calls
  to create frames, components, design tokens, and pages in Penpot projects.
  Use this skill when the target tool is penpot and the pipeline needs to write extracted IR to Penpot.
  Handles Penpot-specific concepts: flex layout, components, design tokens, pages, and libraries.
  Serialized write order: tokens → styles → components → pages.
version: 1.0.0
author: ui2design
tags: [ui-convert, writer, penpot, mcp, design, open-source]
---

# Penpot Writer

Converts Design IR files into Penpot MCP calls. Creates design artifacts in a Penpot project
using the serialized write order: tokens → styles → components → pages.

## Non-negotiable Rules

1. **Serialized writes** — never parallelize MCP calls.
2. **Registry updates** — update `registry.json` after every successful write.
3. **Idempotency** — check `registry.json` before writing. Skip if hash matches.
4. **Use Penpot design tokens** — map IR tokens to Penpot's token system.
5. **Flex layout for containers** — use Penpot flex layout for all directional containers.

---

## Write Order

### Phase 1: Tokens → Penpot Design Tokens

Penpot supports design tokens natively. Create token sets:

| Token Type | Penpot Token Type |
|-----------|------------------|
| Colors | Color tokens |
| Spacing | Dimension tokens |
| Radii | Dimension tokens |
| Fonts | Typography tokens |
| Shadows | Custom tokens |

### Phase 2: Styles → Penpot Shared Styles

Create shared color styles, text styles from tokens.

### Phase 3: Components → Penpot Components

For each IR component:
1. Create a frame with flex layout
2. Add child elements
3. Mark as component (add to library)

IR-to-Penpot property mapping:

| IR Key | Penpot Property |
|--------|----------------|
| `w` | Width |
| `h` | Height |
| `x`, `y` | Position |
| `bg` | Fill (solid color, token reference) |
| `fg` | Text fill |
| `d: "h"` | Flex layout, direction: row |
| `d: "v"` | Flex layout, direction: column |
| `al` | Align items |
| `jc` | Justify content |
| `g` | Gap |
| `p` | Padding |
| `br` | Stroke + border radius |
| `op` | Opacity |
| `txt` | Text content |

### Phase 4: Layouts → Penpot Layout Frames

For each layout artifact:
1. Create a frame with page-level dimensions
2. Apply flex layout (direction, padding, gap)
3. Insert placeholder slots for child pages/sections
4. Convert to component if the layout is reused across pages

### Phase 5: Pages → Penpot Pages

For each page artifact:
1. Create a new Penpot page
2. Create root frame with page dimensions
3. For `ref` nodes → create component instances
4. For other nodes → create elements
5. Apply flex layout to containers

---

## IR Node Type → Penpot Element

| IR Type | Penpot Implementation |
|---------|----------------------|
| `pg` | Page with root frame |
| `fr` | Frame with flex layout |
| `txt` | Text element |
| `btn` | Component: frame + text |
| `inp` | Frame styled as input field |
| `img` | Image or rectangle with image fill |
| `crd` | Frame with padding, radius, shadow |
| `mdl` | Frame with overlay |
| `hdr` | Frame, row layout |
| `nav` | Frame, row layout |
| `sdb` | Frame, column layout |
| `lst` | Frame, column layout |
| `tbl` | Grid frame |
| `ref` | Component instance with overrides |

---

## Penpot-Specific Features

- **Open source** — Penpot is self-hostable; MCP server may be local or remote
- **SVG-based** — all elements are SVG under the hood
- **CSS grid** — Penpot supports CSS grid in addition to flex; use flex for consistency with IR
- **Design tokens v2** — Penpot's token system supports sets, groups, and references

---

## Error Handling

- **Server connection** → Penpot MCP may point to cloud or self-hosted instance
- **Permission errors** → check project access rights
- **Component library** → verify library is writable
- **Token conflicts** → append suffix for duplicate names

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Registry** → `ui-convert-state` (`registry.json`)
- **Called by** → `ui-convert-coordinator` (when `targetTool: "penpot"`)
- **MCP tool signatures** → [references/penpot-mcp-tools.md](references/penpot-mcp-tools.md)
