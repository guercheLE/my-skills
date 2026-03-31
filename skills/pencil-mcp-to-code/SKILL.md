---
name: pencil-mcp-to-code
description: >
  Translate Pencil MCP (.pen file) designs into production-ready code for any platform: web (React,
  Vue, Angular, Tailwind, HTML/CSS/JS), Android (Jetpack Compose, XML), iOS (SwiftUI, UIKit),
  macOS (SwiftUI, AppKit), Windows (WPF, WinUI 3, XAML), and Linux (GTK 4, Qt).
  Use this skill whenever the user says "turn this design into code", "generate code from Pencil",
  "implement this screen", "convert to React/SwiftUI/Compose/XAML", mentions exporting a .pen file
  to any programming language, or asks to code up a UI from a Pencil design — even if they phrase it
  casually like "can you code this up?" or "make this work in Android".
  Invoke this skill proactively any time a Pencil design and code generation are both in scope.
---

# Pencil Design → Code

## Is this possible?

Yes, for all major platforms:

| Platform | Framework | Pencil support |
|----------|-----------|----------------|
| Web | React + Tailwind | ✅ Native guidelines (`get_guidelines("code")` + `get_guidelines("tailwind")`) |
| Web | Vue, Angular, Svelte, vanilla HTML/CSS/JS | ✅ Via design extraction |
| Android | Jetpack Compose, XML layouts | ✅ Via design extraction |
| iOS | SwiftUI, UIKit | ✅ Via design extraction |
| macOS | SwiftUI, AppKit | ✅ Via design extraction |
| Windows | WPF, WinUI 3, XAML | ✅ Via design extraction |
| Linux | GTK 4, Qt/QML | ✅ Via design extraction |

---

## Universal extraction workflow

Run this for every platform before writing any code.

### Step 1 — Understand the design

```
get_editor_state()                        # confirm which .pen file is open
batch_get(["*"], [])                      # discover all nodes; note IDs
snapshot_layout()                         # get x, y, width, height for every node
get_variables()                           # read colors, spacing, typography tokens
get_screenshot(rootNodeId)                # visual reference
```

### Step 2 — Extract component details

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

### Step 3 — Map to platform concepts

Apply the design data to the platform-appropriate abstractions using the reference file below.

### Step 4 — Validate

After generating code, call `get_screenshot` on the relevant node and compare visually. Any obvious mismatches in color, spacing, or layout need fixing before hand-off.

---

## Platform selection

Load the reference file that matches the target platform **before writing any code**. All files live in `references/`:

| Target | File to read |
|--------|-------------|
| React / Tailwind (preferred web) | `references/web.md` |
| Vue / Angular / HTML+CSS+JS | `references/web.md` |
| Android (Jetpack Compose or XML) | `references/android.md` |
| iOS / macOS (SwiftUI or UIKit/AppKit) | `references/ios-macos.md` |
| Windows (WPF / WinUI 3 / XAML) | `references/windows.md` |
| Linux (GTK 4 / Qt / QML) | `references/linux.md` |

If the user hasn't specified a platform, ask. If the target codebase already exists, inspect it first to detect the framework in use — always match the project's existing stack.

---

## General principles (apply everywhere)

- **Never guess IDs.** Always discover node IDs via `batch_get` or from a previous `I()`/`C()` call.
- **Never use filesystem tools on .pen files.** Content is encrypted — only Pencil MCP tools can read it.
- **Match the project.** If a codebase already exists, explore it to find the framework, styling approach, existing components, and conventions. Update existing components instead of creating duplicates.
- **Use design tokens, not hardcoded values.** Read `get_variables()` and map token names to the project's theming system.
- **Preserve content exactly.** Use the same text labels, icon names, and spacing as in the design.
- **No documentation files.** After generating code, do not create Markdown changelogs or README updates unless the user explicitly asks.
- **Validate visually.** Use `get_screenshot` to compare design vs. implementation and iterate until they match.
