---
name: ui-convert-writer-figma
description: >
  Design IR to Figma writer for the ui2design pipeline. Converts IR JSON files into Figma MCP calls
  to create frames, auto-layout, components, component instances, styles, and design tokens in Figma files.
  Use this skill when the target tool is figma and the pipeline needs to write extracted IR to Figma.
  Handles Figma-specific concepts: auto-layout, component sets, variants, local styles, and variables.
  Serialized write order: tokens → styles → components → pages.
version: 1.0.0
author: ui2design
tags: [ui-convert, writer, figma, mcp, design]
---

# Figma Writer

Converts Design IR files into Figma MCP calls. Creates design artifacts in a Figma file
using the serialized write order: tokens → styles → components → pages.

## Non-negotiable Rules

1. **Serialized writes** — never parallelize MCP calls.
2. **Registry updates** — update `registry.json` after every successful write.
3. **Idempotency** — check `registry.json` before writing. Skip if hash matches.
4. **Auto-layout first** — use Figma auto-layout for all layout containers.
5. **Variables over raw values** — use Figma variables for all token references.

---

## Write Order

### Phase 1: Tokens → Figma Variables

Create a Figma variable collection for each token category:

| Token Type | Figma Variable Type | Collection |
|-----------|-------------------|------------|
| Colors (`c1`, `c2`) | Color variable | "Design Tokens" |
| Spacing (`s1`, `s2`) | Number variable | "Design Tokens" |
| Radii (`r1`, `r2`) | Number variable | "Design Tokens" |

Font tokens → create Figma text styles (not variables):
- Each font token (`f1`, `f2`) → Figma text style with family, size, weight

Shadow tokens → create Figma effect styles:
- Each shadow token (`sh1`) → Figma drop shadow effect style

### Phase 2: Styles → Figma Local Styles

Create color styles, text styles, and effect styles from tokens.
These enable consistent styling across the Figma file.

### Phase 3: Components → Figma Components

For each IR component artifact:

1. Read the IR file
2. Create a Figma frame with auto-layout
3. Add child elements
4. Convert to Figma component (set `isComponent: true`)

IR-to-Figma property mapping:

| IR Key | Figma Property |
|--------|---------------|
| `w` | `width` |
| `h` | `height` |
| `bg` | `fills` (solid paint, reference variable) |
| `fg` | Text `fills` |
| `d: "h"` | `layoutMode: "HORIZONTAL"` |
| `d: "v"` | `layoutMode: "VERTICAL"` |
| `al` | `counterAxisAlignItems` |
| `jc` | `primaryAxisAlignItems` |
| `g` | `itemSpacing` (reference variable) |
| `p` | `paddingTop/Right/Bottom/Left` (reference variables) |
| `br` | `strokes` + `cornerRadius` |
| `op` | `opacity` |
| `txt` | `characters` on text node |

### Phase 4: Layouts → Figma Layout Frames

For each layout artifact:
1. Create a Figma frame with page-level dimensions
2. Apply auto-layout (direction, padding, gap)
3. Insert placeholder slots for child pages/sections
4. Convert to component if the layout is reused across pages

### Phase 5: Pages → Figma Pages/Frames

For each page artifact:
1. Create a new Figma page or frame
2. Set page dimensions
3. For `ref` type nodes → create component instance
4. For other nodes → create elements directly
5. Apply auto-layout to containers

---

## IR Node Type → Figma Element

| IR Type | Figma Implementation |
|---------|---------------------|
| `pg` | Frame (page-sized) on a Figma page |
| `fr` | Frame with auto-layout |
| `txt` | Text node |
| `btn` | Component: frame + text, auto-layout |
| `inp` | Component: frame styled as input |
| `img` | Rectangle with image fill |
| `crd` | Frame with padding, corner radius, shadow |
| `mdl` | Frame with overlay background |
| `hdr` | Frame, horizontal auto-layout |
| `nav` | Frame, horizontal auto-layout |
| `ftr` | Frame with content |
| `sdb` | Frame, vertical auto-layout, fixed width |
| `lst` | Frame, vertical auto-layout |
| `tbl` | Frame with grid-like structure |
| `ref` | Component instance with overrides |

---

## Component Instances and Overrides

When IR has `t: "ref"` with `cmp` and `ov`:

1. Look up the component in `registry.json` to get its Figma node ID
2. Create an instance of that component
3. Apply overrides from `ov`:
   - `txt` override → update nested text content
   - `bg` override → update fill
   - Other property overrides → apply to matching child nodes

---

## Error Handling

- **Rate limiting** → respect Figma API rate limits, add delay between batches
- **Auth errors** → halt pipeline, report to user
- **Component not found** → create inline element instead of instance
- **Page limit** → handle Figma's page limits gracefully

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Registry** → `ui-convert-state` (`registry.json`)
- **Called by** → `ui-convert-coordinator` (when `targetTool: "figma"`)
- **MCP tool signatures** → [references/figma-mcp-tools.md](references/figma-mcp-tools.md)
