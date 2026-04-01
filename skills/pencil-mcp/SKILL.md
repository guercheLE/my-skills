---
name: pencil-mcp
description: >
  Expert guide for creating, editing, and validating UI designs in .pen files using the Pencil MCP server,
  AND for translating those designs into production-ready code for any platform.
  Use this skill whenever the user wants to design screens, mockups, dashboards, landing pages, mobile apps,
  components, or any visual layout in Pencil — even if they just say "design this", "make a mockup", "add a
  section", "update the layout", "open Pencil", or mention a .pen file. Also use it for tasks like applying a
  style guide, changing colors/fonts globally, exporting assets, or exploring what's already in a design.
  Additionally, use this skill whenever the user says "turn this design into code", "generate code from Pencil",
  "implement this screen", "convert to React/SwiftUI/Compose/XAML", mentions exporting a .pen file to any
  programming language, or asks to code up a UI from a Pencil design — even casually like "can you code this
  up?" or "make this work in Android".
  This skill is essential any time the Pencil MCP server is involved — invoke it proactively for ALL design
  and design-to-code tasks, including those that seem simple, to avoid mistakes with node IDs and operation syntax.
---

# Working with the Pencil MCP Server

## Non-negotiable rules

- `.pen` files are **JSON-based** and readable with regular filesystem tools. However, always use Pencil MCP tools (`batch_get`, `batch_design`, etc.) for design operations — they handle IDs correctly, apply layout calculations, and prevent format-breaking manual edits.
- Never hand-edit a `.pen` file directly. Even though the format is JSON, manual edits can easily break internal references, component linkages, or variable bindings.
- When in doubt about a node's ID or structure, **look it up** — never guess node IDs.

---

## Starting every task

Begin with **`get_editor_state()`** unless the user has given you an explicit file path. This tells you:
- Which `.pen` file is currently open and active
- The current user selection (selected node IDs)
- Other essential context (canvas state, viewport)

If no document is open, call `open_document("new")` to create a blank canvas, or `open_document("<path>")` to open a specific file.

---

## Core workflow

### 1. Understand the canvas

Before placing anything, understand what's already there:

- **`batch_get(patterns, nodeIds)`** — discover nodes by name patterns (e.g., `["*header*", "*nav*"]`) or by specific IDs. This is your primary exploration tool.
- **`snapshot_layout()`** — get computed bounding rectangles for every node. Use this to understand spatial relationships and decide where to insert new content.
- **`find_empty_space_on_canvas(direction, size)`** — find open areas on the canvas when you need to add new screens or components without overlap.

### 2. Get design direction

When building screens from scratch or styling existing content, orient yourself with guidelines and a style guide:

```
get_guidelines(topic)   # topic: code | table | tailwind | landing-page | slides |
                         #         design-system | mobile-app | web-app
```

After guidelines, use `get_style_guide_tags()` to see available tags, then `get_style_guide(tags, name)` to load a matching style guide. Style guides provide color palettes, typography, and component patterns that make designs cohesive.

### 3. Design or edit

All mutations go through **`batch_design(operations)`**. This accepts a script of operations — aim for up to 25 per call. Make operations meaningful and group logically related changes together.

### 4. Validate visually

After significant changes, call **`get_screenshot(nodeId?)`** to see the result. Use this to catch layout issues, misaligned elements, or off-palette colors before moving on. Don't skip this step after major design blocks.

---

## batch_design operation syntax

Every line is a single operation. Variables assigned in one line are usable in subsequent lines of the same call.

### Insert — create a new node

```
foo = I("parentId", { ...properties })
```

### Copy — clone an existing node into a new parent

```
bar = C("sourceNodeId", "parentId", { ...overrides })
```

### Replace — swap out one or more nodes with new content

```
R("nodeId1/nodeId2", { ...properties })
```

### Update — mutate properties of an existing node

```
U("nodeId", { ...properties })
U(foo + "/childId", { ...properties })   # combine with variable from earlier line
```

### Delete

```
D("nodeId")
```

### Move — reorder or reparent a node

```
M("nodeId", "newParentId", insertionIndex)
```

### Generate image with AI

```
G("nodeId", "ai", "descriptive prompt for the image")
```

**Tip**: Assign results to variables (`foo = I(...)`) whenever you'll reference those nodes later in the same batch. String concatenation with `/` navigates into children.

---

## Variables and themes

- `get_variables()` — read all design tokens (colors, spacing, font sizes) and themes currently defined in the file.
- `set_variables(variables)` — add or update tokens. Changing a token here propagates to every node that references it — this is the right way to do global rebranding.

Always read variables before touching colors or typography, so you use the proper token names rather than raw hex values.

---

## Bulk find-and-replace

When you need to change a property everywhere (e.g., swap a font family across the whole design):

1. **`search_all_unique_properties(parentIds)`** — discover every distinct property value present under those parents. Shows you what you're working with.
2. **`replace_all_matching_properties(parentIds, matchProps, newProps)`** — replace all nodes that match a property pattern with new values. Far more reliable than identifying and updating each node individually.

---

## Exporting

```
export_nodes(nodeIds, format, outputFolder)
# format: "PNG" | "JPEG" | "WEBP" | "PDF"
```

Always confirm node IDs via `batch_get` before exporting — exporting the wrong node is a common mistake.

---

## Design quality principles

- **Use the style guide.** Don't hardcode colors or fonts unless the user explicitly provides them. Load a style guide that matches the context (landing-page, mobile-app, etc.) and use its tokens.
- **Respect existing structure.** Read the canvas with `batch_get` and `snapshot_layout` before adding things — inserting into the wrong parent or overlapping existing content wastes iterations.
- **Validate after big changes.** `get_screenshot` is cheap. Use it to catch problems early rather than building several more layers on top of a broken foundation.
- **Keep batches focused.** Grouping 25 tightly related operations is good. Cramming unrelated sections into one giant call makes it hard to debug if something goes wrong.
- **Avoid guessing IDs.** Node IDs look like `dfFAeg2`. Always discover them via `batch_get` or from the result of a previous `I()` or `C()` call. Random strings will silently target the wrong node or fail.

---

## Common task patterns

### Add a new screen to an existing file

```
1. get_editor_state()                          # learn active file
2. find_empty_space_on_canvas(direction, size) # find where to put it
3. get_guidelines("web-app")                   # or mobile-app, landing-page, etc.
4. get_style_guide_tags() → get_style_guide()  # visual direction
5. batch_design(...)                           # build the screen
6. get_screenshot(newRootNodeId)               # validate
```

### Restyle globally (e.g., change brand colors)

```
1. get_variables()                             # see existing tokens
2. set_variables({ primaryColor: "#new" })     # update the token
3. search_all_unique_properties([rootId])      # verify propagation
4. get_screenshot()                            # confirm visually
```

### Explore an unfamiliar design

```
1. get_editor_state()
2. batch_get(["*"], [])                        # broad pattern match
3. snapshot_layout()                           # spatial context
```

### Export assets for handoff

```
1. batch_get(["*icon*", "*logo*"])             # find the right nodes
2. export_nodes([id1, id2], "PNG", "~/Desktop/assets")
```

---

## Quick reference — tool checklist

| Goal | Tool |
|------|------|
| Understand current state | `get_editor_state` |
| Open / create file | `open_document` |
| Find nodes by name | `batch_get(patterns)` |
| Find nodes by ID | `batch_get([], nodeIds)` |
| Understand layout & positions | `snapshot_layout` |
| Find free canvas space | `find_empty_space_on_canvas` |
| Load design guidelines | `get_guidelines(topic)` |
| Load visual style | `get_style_guide_tags` → `get_style_guide` |
| Create / edit / delete nodes | `batch_design` |
| See the result | `get_screenshot` |
| Read design tokens | `get_variables` |
| Change design tokens | `set_variables` |
| Find all property values | `search_all_unique_properties` |
| Bulk property replacement | `replace_all_matching_properties` |
| Export to image/pdf | `export_nodes` |

---

## Reference files

| Topic | File |
|-------|------|
| .pen file format & TypeScript schema | [references/pen-format.md](references/pen-format.md) |
| Installation, authentication & troubleshooting | [references/setup-troubleshooting.md](references/setup-troubleshooting.md) |
| Design → Code: Web (React, Tailwind, Vue, Angular, HTML/CSS) | [references/web.md](references/web.md) |
| Design → Code: Android (Jetpack Compose, XML) | [references/android.md](references/android.md) |
| Design → Code: iOS / macOS (SwiftUI, UIKit, AppKit) | [references/ios-macos.md](references/ios-macos.md) |
| Design → Code: Windows (WinUI 3, WPF, MAUI, XAML) | [references/windows.md](references/windows.md) |
| Design → Code: Linux (GTK 4, Qt, QML) | [references/linux.md](references/linux.md) |

---

## Design → Code

Pencil designs can be translated into production-ready code for all major platforms:

| Platform | Framework | Pencil support |
|----------|-----------|----------------|
| Web | React + Tailwind | ✅ Native guidelines (`get_guidelines("code")` + `get_guidelines("tailwind")`) |
| Web | Vue, Angular, Svelte, vanilla HTML/CSS/JS | ✅ Via design extraction |
| Android | Jetpack Compose, XML layouts | ✅ Via design extraction |
| iOS | SwiftUI, UIKit | ✅ Via design extraction |
| macOS | SwiftUI, AppKit | ✅ Via design extraction |
| Windows | WPF, WinUI 3, XAML | ✅ Via design extraction |
| Linux | GTK 4, Qt/QML | ✅ Via design extraction |

### Extraction workflow

Run this for every platform before writing any code.

**Step 1 — Understand the design**

```
get_editor_state()                        # confirm which .pen file is open
batch_get(["*"], [])                      # discover all nodes; note IDs
snapshot_layout()                         # get x, y, width, height for every node
get_variables()                           # read colors, spacing, typography tokens
get_screenshot(rootNodeId)                # visual reference
```

**Step 2 — Extract component details**

For each component you need to implement:

```
batch_get([], ["nodeId"], { maxDepth: 10, includePathGeometry: true })
```

Key properties to record:
- `type` — frame, text, image, shape, component_ref, etc.
- `fill`, `stroke`, `cornerRadius`, `opacity` — appearance
- `fontFamily`, `fontSize`, `fontWeight`, `textAlign`, `lineHeight` — typography
- `layoutMode` (horizontal/vertical), `padding*`, `itemSpacing` — layout
- `width`, `height`, `x`, `y` (from `snapshot_layout`) — size & position
- `sizing` (`fill_container` / `fit_content` / fixed) — how to size the node
- `children` — nested structure
- `geometry` — SVG paths (icons, logos)

**Step 3 — Map to platform concepts**

Load the reference file that matches the target platform **before writing any code**:

| Target | File to read |
|--------|-------------|
| React / Tailwind (preferred web) | [references/web.md](references/web.md) |
| Vue / Angular / HTML+CSS+JS | [references/web.md](references/web.md) |
| Android (Jetpack Compose or XML) | [references/android.md](references/android.md) |
| iOS / macOS (SwiftUI or UIKit/AppKit) | [references/ios-macos.md](references/ios-macos.md) |
| Windows (WPF / WinUI 3 / XAML) | [references/windows.md](references/windows.md) |
| Linux (GTK 4 / Qt / QML) | [references/linux.md](references/linux.md) |

If the user hasn't specified a platform, ask. If the target codebase already exists, inspect it first to detect the framework in use — always match the project's existing stack.

**Step 4 — Validate**

After generating code, call `get_screenshot` on the relevant node and compare visually. Any obvious mismatches in color, spacing, or layout need fixing before hand-off.

### Design-to-code principles

- **Match the project.** If a codebase already exists, explore it to find the framework, styling approach, existing components, and conventions. Update existing components instead of creating duplicates.
- **Use design tokens, not hardcoded values.** Read `get_variables()` and map token names to the project's theming system.
- **Preserve content exactly.** Use the same text labels, icon names, and spacing as in the design.
- **No documentation files.** After generating code, do not create Markdown changelogs or README updates unless the user explicitly asks.
- **Validate visually.** Use `get_screenshot` to compare design vs. implementation and iterate until they match.
