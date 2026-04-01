---
name: pencil-mcp
description: >
  Expert guide for creating, editing, and validating UI designs in .pen files using the Pencil MCP server.
  Use this skill whenever the user wants to design screens, mockups, dashboards, landing pages, mobile apps,
  components, or any visual layout in Pencil — even if they just say "design this", "make a mockup", "add a
  section", "update the layout", "open Pencil", or mention a .pen file. Also use it for tasks like applying a
  style guide, changing colors/fonts globally, exporting assets, or exploring what's already in a design.
  This skill is essential any time the Pencil MCP server is involved — invoke it proactively for ALL design
  tasks, including those that seem simple, to avoid mistakes with node IDs and operation syntax.
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
