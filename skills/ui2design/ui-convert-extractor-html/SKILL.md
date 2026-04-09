---
name: ui-convert-extractor-html
description: >
  Plain HTML/CSS/JS to Design IR extractor for the ui2design pipeline. Converts static HTML pages with
  CSS stylesheets and optional JavaScript into the Design IR format.
  Use this skill when the detected technology is html (plain HTML/CSS/JS projects with no framework) and
  the pipeline needs to extract visual structure into IR JSON files.
  Handles Bootstrap, Tailwind (CDN), jQuery UI patterns, inline styles, embedded styles, and external
  stylesheets. Works with multi-page static sites.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, html, css, javascript, bootstrap, static]
---

# HTML Extractor

Converts plain HTML/CSS/JS pages into Design IR. No framework required — works with
static sites, Bootstrap pages, Tailwind CDN sites, and vanilla HTML.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<div>`, `<section>`, `<main>` | Frame/section nodes (`fr`, `sec`) |
| `<header>`, `<nav>` | Header/nav nodes (`hdr`, `nav`) |
| `<footer>` | Footer node (`ftr`) |
| `<aside>` | Sidebar node (`sdb`) |
| `<button>`, `<a class="btn">` | Button node (`btn`) |
| `<input>`, `<textarea>`, `<select>` | Input node (`inp`) |
| `<img>` | Image node (`img`) |
| `<h1>`–`<h6>`, `<p>`, `<span>`, `<label>` | Text node (`txt`) |
| `<ul>/<ol>` + `<li>` | List nodes (`lst` + `li`) |
| `<table>` + `<tr>` + `<td>` | Table nodes (`tbl` + `tr` + `td`) |
| `<form>` | Frame node (`fr`) with form semantics |
| `<dialog>` | Modal node (`mdl`) |

---

## Extraction Process

### Step 1: Parse HTML

Parse the HTML document. Handle:
- Full HTML documents (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
- HTML fragments (partial templates)
- Multiple HTML files (multi-page sites)

Extract the `<body>` content as the node tree root.

### Step 2: Collect All Styles

Gather CSS from all sources in cascade order:

1. **External stylesheets** (`<link rel="stylesheet" href="...">`) → read the file
2. **Embedded styles** (`<style>...</style>`) → parse inline
3. **Inline styles** (`style="..."`) → per-element
4. **Tailwind CDN** (if `<script src="cdn.tailwindcss.com">`) → parse utility classes
5. **Bootstrap** (if Bootstrap CSS is linked) → use Bootstrap defaults

### Step 3: Resolve Computed Styles

For each HTML element:
1. Collect all matching CSS selectors
2. Apply cascade/specificity rules
3. Compute the final style declarations
4. Map to IR token references

```css
/* Example resolution */
.container { max-width: 1200px; padding: 0 24px; }
.hero { background: #1a1a2e; color: white; text-align: center; padding: 64px 0; }
.hero h1 { font-size: 48px; font-weight: 700; }
```

### Step 4: Map Semantic HTML to IR Types

Use HTML5 semantic elements for better node type mapping:

| HTML Element | IR Type | Notes |
|-------------|---------|-------|
| `<header>` | `hdr` | Page header |
| `<nav>` | `nav` | Navigation |
| `<main>` | `sec` | Main content area |
| `<section>` | `sec` | Content section |
| `<article>` | `crd` | Self-contained content |
| `<aside>` | `sdb` | Sidebar content |
| `<footer>` | `ftr` | Page footer |
| `<figure>` | `fr` | Figure with caption |
| `<details>` | `acc` | Accordion/disclosure |
| `<dialog>` | `mdl` | Modal dialog |
| Non-semantic `<div>` | `fr` | Generic container |

### Step 5: Handle Bootstrap Patterns

When Bootstrap is detected, map Bootstrap components:

```html
<div class="card">
  <div class="card-body">
    <h5 class="card-title">Title</h5>
    <p class="card-text">Content</p>
    <a href="#" class="btn btn-primary">Go</a>
  </div>
</div>
```

| Bootstrap Class | IR Mapping |
|----------------|------------|
| `btn btn-*` | `btn` with color from variant |
| `card` | `crd` |
| `modal` | `mdl` |
| `navbar` | `hdr` + `nav` |
| `nav-tabs` | `tab` |
| `accordion` | `acc` |
| `table` | `tbl` |
| `list-group` | `lst` |
| `form-control` | `inp` |
| `container` / `row` / `col-*` | `fr` with layout properties |

### Step 6: Estimate Dimensions

HTML doesn't declare explicit dimensions normally. Estimate from:
- CSS `width`/`height`/`max-width`/`min-height`
- Bootstrap grid columns (col-6 = 50% of container)
- Viewport-relative units (`100vw` → 1440, `100vh` → 900)
- Default browser sizing for elements without explicit CSS

### Step 7: Write IR File

One IR per HTML page. The page root is `pg` type.

---

## Multi-page Sites

For sites with multiple HTML files:
- Each `.html` file → one IR file
- Shared components (repeated `<nav>`, `<footer>`) → identify via DOM similarity
- First occurrence → full definition; subsequent → `ref` type

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Input** → `index.json` artifacts with `category: component|page|layout`
- **Output** → `.ui-convert/ir/*.json`
- **Called by** → `ui-convert-coordinator` (when `tech: "html"`)
