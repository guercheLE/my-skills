---
name: ui-convert-writer-pencil
description: >
  Design IR to Pencil.dev writer for the ui2design pipeline. Converts IR JSON files into Pencil MCP calls
  using batch_design operations to create frames, components, text, and other design elements in .pen files.
  Use this skill when the target tool is pencil and the pipeline needs to write extracted IR to Pencil.dev.
  This skill cross-references the pencil-mcp skill for MCP tool syntax and operation format.
  Handles token-to-variable mapping, component creation, page assembly, and visual validation via screenshots.
version: 1.0.0
author: ui2design
tags: [ui-convert, writer, pencil, mcp, pen]
---

# Pencil Writer

Converts Design IR files into Pencil.dev MCP calls. Creates design artifacts in a `.pen` file
using the serialized write order: tokens → styles → components → pages.

## Non-negotiable Rules

1. **Serialized writes** — never parallelize MCP calls. One operation batch at a time.
2. **Registry updates** — after every successful write, update `registry.json` with the tool entity ID.
3. **Idempotency** — check `registry.json` before writing. Skip if hash matches.
4. **Visual validation** — call `get_screenshot()` after major design blocks.
5. **Max 25 operations per batch_design call** — keep batches manageable.
6. **Always use pencil-mcp skill** — reference it for correct MCP tool syntax.

---

## Write Order

### Phase 1: Tokens → Variables

Convert `tokens.json` entries into Pencil variables using `set_variables()`:

```
Token: c1 = #1a1a2e (name: "primary")
→ set_variables({ colors: { primary: "#1a1a2e" } })

Token: f1 = Inter 400 (name: "body")
→ set_variables({ fonts: { body: { family: "Inter", weight: 400 } } })

Token: s1 = 8 (name: "sm")
→ set_variables({ spacing: { sm: 8 } })
```

After writing variables, read them back with `get_variables()` to confirm and capture
the Pencil-assigned IDs for later reference.

### Phase 2: Styles → Reusable Patterns

No dedicated style layer in Pencil — styles are embedded in components.
Skip to Phase 3.

### Phase 3: Components → Component Origins

For each IR artifact with `category: component` (from `index.json`):

1. Read the IR file from `.ui-convert/ir/{artifact}.json`
2. Find empty space on canvas: `find_empty_space_on_canvas("right", { w, h })`
3. Create the component as a frame with children:

```
// Example: Button component
// Source IR file (.ui-convert/ir/btn-primary.json) — always two-layer format:
// {"tk":{"c":{"c1":"#6366f1","c2":"#ffffff"},"f":{"f1":{"fm":"Inter","sz":14,"wt":600}},"sp":{},"sh":{},"rd":{"r1":6}},
//  "nd":[{"t":"btn","id":"b1","n":"primary-btn","w":120,"h":40,"bg":"c1","fg":"c2","fn":"f1","txt":"Submit","br":{"w":0,"c":"c1","r":"r1"}}]}

// batch_design operations (see pencil-mcp skill for full syntax):
frame=I("canvas", {
  name: "primary-btn",
  width: 120,
  height: 40,
  fill: "$primary",          // Variable ref created in Phase 1 from token c1
  cornerRadius: 6,           // From rd.r1
  reusable: true             // Marks as Pencil component
})
label=I(frame, {
  type: "text",
  content: "Submit",         // From nd[0].txt
  fill: "$white",            // Variable ref from token c2
  fontSize: 14,              // From f1.sz
  fontWeight: 600,           // From f1.wt
  fontFamily: "Inter"        // From f1.fm
})
```

4. Update `registry.json`: `b1 → { toolId: frame, type: "component" }`

### Phase 4: Layouts → Layout Frames

For each IR artifact with `category: layout`:

1. Read IR file
2. Find empty space for the layout dimensions
3. Create layout frame with auto-layout properties (direction, padding, gap)
4. Insert placeholder slots for child pages/sections
5. Convert to component if the layout is reused across pages
6. Update `registry.json`

### Phase 5: Pages → Full Designs

For each IR artifact with `category: page`:

1. Read IR file
2. Find empty space for the page dimensions
3. Create page frame
4. For each child node in the IR tree:
   - If `t` is `"ref"` → use `cmp` to look up registry, copy with `C()` and apply `ov` overrides
   - If it's a new element → insert directly with `I()`
5. Apply layout properties (direction, gap, alignment, padding)

---

## IR-to-Pencil Property Mapping

| IR Key | Pencil Property |
|--------|----------------|
| `t` (type) | Determines element type + properties |
| `w` | `width` |
| `h` | `height` |
| `x` | `x` position |
| `y` | `y` position |
| `bg` | `fill` (color variable ref) |
| `fg` | Text `fill` |
| `fn` | `fontFamily`, `fontSize`, `fontWeight` |
| `txt` | `content` (for text nodes) |
| `p` | `paddingTop/Right/Bottom/Left` |
| `g` | `gap` |
| `d` | `flexDirection` (`"h"` → `"row"`, `"v"` → `"column"`) |
| `al` | `alignItems` |
| `jc` | `justifyContent` |
| `br` | `strokeWidth`, `stroke`, `cornerRadius` |
| `op` | `opacity` |
| `img` | Image fill or image element |

## IR Node Type → Pencil Element

| IR Type | Pencil Implementation |
|---------|----------------------|
| `pg` | Top-level frame (page size) |
| `fr` | Frame with auto-layout |
| `txt` | Text element |
| `btn` | Frame (auto-layout) + text child, reusable |
| `inp` | Frame (input appearance) + placeholder text |
| `img` | Image element or frame with image fill |
| `ico` | SVG element or icon component |
| `crd` | Frame with padding, border, shadow |
| `mdl` | Frame with overlay styling |
| `hdr` | Frame with horizontal auto-layout |
| `nav` | Frame with horizontal auto-layout + links |
| `ftr` | Frame with content |
| `sdb` | Frame with vertical auto-layout, fixed width |
| `lst` | Frame with vertical auto-layout |
| `tbl` | Frame with grid-like child frames |
| `tab` | Frame with tab header + content area |
| `ref` | Copy of component with overrides |

---

## Error Handling

- **MCP timeout** → retry once, then log error and skip artifact
- **Invalid node ID reference** → log warning, create new element instead of copy
- **Canvas space exhaustion** → start a new page/artboard
- **Variable name conflict** → append suffix (`primary_2`)

---

## Visual Validation

After creating each page or complex component:

```
get_screenshot(pageNodeId)
```

Check for:
- Elements overlapping unexpectedly
- Text overflowing containers
- Missing fills or invisible elements
- Layout direction errors

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **MCP syntax** → `pencil-mcp` skill (batch_design operations, variables)
- **Registry** → `ui-convert-state` (`registry.json`)
- **Called by** → `ui-convert-coordinator` (stage 7, when `targetTool: "pencil"`)
