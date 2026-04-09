---
name: ui-convert-ir-schema
description: >
  Design IR (Intermediate Representation) specification for the ui2design pipeline. Defines the minified JSON
  format with short keys used to represent visual UI elements, the two-layer structure (token table + node tree),
  supported node types, style references, and component deduplication rules.
  Use this skill whenever you need to understand, validate, produce, or consume Design IR — including during
  extraction (source code → IR), writing (IR → design tool), ambiguity resolution, or debugging IR files.
  This is the contract that all extractors output and all writers consume. If you're touching IR, read this first.
version: 1.0.0
author: ui2design
tags: [ui-convert, foundation, ir, schema, specification]
---

# Design IR Schema

The Design IR is the universal intermediate format that sits between source-code extractors and design-tool writers.
Every extractor produces IR; every writer consumes it. This document is the single source of truth for the format.

## Non-negotiable Rules

1. **IR is always minified JSON** — no pretty-printing, no comments, no trailing commas.
2. **Short keys only** — use the key map below. Never use full property names.
3. **Two-layer format** — every IR file has exactly two top-level keys: `tk` (token table) and `nd` (node tree).
4. **Style by reference** — nodes reference tokens by ID, never by raw value (no inline `#ff0000`).
5. **IR lives on disk** — stored in `.ui-convert/ir/`, never passed through chat context.
6. **One file per artifact** — each component/page/view gets its own IR file.

---

## Key Map

### Top-level keys

| Key | Full Name | Type | Description |
|-----|-----------|------|-------------|
| `tk` | tokens | `object` | Token table — colors, fonts, spacing |
| `nd` | nodes | `array` | Node tree — visual element hierarchy |

### Token table keys (`tk`)

| Key | Full Name | Type | Description |
|-----|-----------|------|-------------|
| `c` | colors | `object` | Color tokens: `{ "c1": "#1a1a2e", "c2": "#16213e" }` |
| `f` | fonts | `object` | Font tokens: `{ "f1": {"fm":"Inter","sz":16,"wt":400} }` |
| `sp` | spacing | `object` | Spacing tokens: `{ "s1": 8, "s2": 16, "s3": 24 }` |
| `sh` | shadows | `object` | Shadow tokens: `{ "sh1": {"x":0,"y":2,"b":4,"c":"c1","o":0.1} }` |
| `rd` | radii | `object` | Border-radius tokens: `{ "r1": 4, "r2": 8 }` |

### Node keys

| Key | Full Name | Type | Description |
|-----|-----------|------|-------------|
| `t` | type | `string` | Node type (see Node Types below) |
| `id` | id | `string` | Unique node identifier |
| `n` | name | `string` | Human-readable name |
| `w` | width | `number` | Width in px |
| `h` | height | `number` | Height in px |
| `x` | x | `number` | X position relative to parent |
| `y` | y | `number` | Y position relative to parent |
| `s` | style | `string` | Style reference (token ID or composite style ID) |
| `bg` | background | `string` | Background color token ref |
| `fg` | foreground | `string` | Text/foreground color token ref |
| `fn` | font | `string` | Font token ref |
| `txt` | text | `string` | Text content |
| `ch` | children | `array` | Child nodes |
| `p` | padding | `string\|array` | Padding token ref(s) — single or `[top,right,bottom,left]` |
| `g` | gap | `string` | Gap/spacing token ref |
| `d` | direction | `string` | Layout direction: `"h"` (horizontal) or `"v"` (vertical) |
| `al` | align | `string` | Alignment: `"s"` (start), `"c"` (center), `"e"` (end), `"st"` (stretch) |
| `jc` | justify | `string` | Justify: `"s"` (start), `"c"` (center), `"e"` (end), `"sb"` (space-between) |
| `br` | border | `object` | Border: `{"w":1,"c":"c1","r":"r1"}` (width, color ref, radius ref) |
| `op` | opacity | `number` | Opacity 0–1 |
| `vs` | visible | `boolean` | Visibility |
| `cmp` | component | `string` | Component reference ID (for instances) |
| `ov` | overrides | `object` | Property overrides on a component instance |
| `img` | image | `string` | Image source path or URL |
| `ico` | icon | `string` | Icon identifier |
| `lnk` | link | `string` | Navigation/link target |
| `ar` | aspectRatio | `number` | Aspect ratio constraint |

---

## Node Types

| Type value | Description | Typical children |
|------------|-------------|------------------|
| `fr` | Frame / container | Any |
| `txt` | Text node | None |
| `btn` | Button | Text, icon |
| `inp` | Input field | None |
| `img` | Image | None |
| `ico` | Icon | None |
| `svg` | SVG / vector | None |
| `lst` | List container | List items |
| `li` | List item | Any |
| `tbl` | Table | Table rows |
| `tr` | Table row | Table cells |
| `td` | Table cell | Any |
| `nav` | Navigation | Links, buttons |
| `hdr` | Header/app bar | Any |
| `ftr` | Footer | Any |
| `sdb` | Sidebar | Any |
| `crd` | Card | Any |
| `mdl` | Modal/dialog | Any |
| `tab` | Tab container | Tab items |
| `acc` | Accordion | Accordion items |
| `pg` | Page/screen (root) | Any |
| `sec` | Section | Any |
| `div` | Generic divider/spacer | None |
| `ref` | Component instance | Overrides only |

---

## Two-Layer Format

Every IR file follows this exact structure:

```json
{"tk":{"c":{},"f":{},"sp":{},"sh":{},"rd":{}},"nd":[]}
```

### Token table (`tk`)

Defines all design tokens used by nodes in this file. Token IDs are short, prefixed by type:
- Colors: `c1`, `c2`, `c3`...
- Fonts: `f1`, `f2`...
- Spacing: `s1`, `s2`...
- Shadows: `sh1`, `sh2`...
- Radii: `r1`, `r2`...

If a project-wide `tokens.json` exists (from `ui-convert-token-miner`), IR files should reference those token IDs.
File-local tokens are allowed for one-off values not in the global set.

### Node tree (`nd`)

A flat or nested array of node objects. The root node is typically type `pg` (page) or `fr` (frame).

```json
{"tk":{"c":{"c1":"#1a1a2e","c2":"#e94560"},"f":{"f1":{"fm":"Inter","sz":16,"wt":400}},"sp":{"s1":8,"s2":16},"rd":{"r1":8}},"nd":[{"t":"pg","id":"p1","n":"Home","w":1440,"h":900,"bg":"c1","ch":[{"t":"btn","id":"b1","n":"Submit","w":120,"h":40,"x":20,"y":60,"bg":"c2","fg":"c1","fn":"f1","txt":"Submit","p":"s1","br":{"w":0,"c":"c1","r":"r1"}}]}]}
```

---

## Component Deduplication

When the same UI pattern appears multiple times (e.g., a button used across pages):

1. **First occurrence** → full node definition with all properties.
2. **Subsequent occurrences** → use `ref` type with `cmp` pointing to the first occurrence's ID, plus any `ov` (overrides).

```json
{"t":"ref","id":"b2","cmp":"b1","ov":{"txt":"Cancel","bg":"c3"}}
```

This mirrors the component/instance model in design tools and reduces IR file size.

---

## Validation Rules

An IR file is valid when:

1. Top-level has exactly `tk` and `nd` keys.
2. Every token referenced by a node exists in `tk` (or in global `tokens.json`).
3. Every node has `t` (type) and `id` (unique within file).
4. All `cmp` references point to a valid node ID (same file or registered component).
5. Node types are from the defined set above.
6. Numeric values (`w`, `h`, `x`, `y`, `op`) are numbers, not strings.
7. `ch` (children) is always an array when present.
8. No circular references in `ch` or `cmp`.

---

## Sample IR Documents

### Minimal button

```json
{"tk":{"c":{"c1":"#6366f1","c2":"#ffffff"},"f":{"f1":{"fm":"Inter","sz":14,"wt":600}},"sp":{"s1":12,"s2":8},"rd":{"r1":6}},"nd":[{"t":"btn","id":"b1","n":"primary-btn","w":120,"h":40,"bg":"c1","fg":"c2","fn":"f1","txt":"Submit","p":["s2","s1","s2","s1"],"br":{"w":0,"c":"c1","r":"r1"}}]}
```

### Form with inputs

```json
{"tk":{"c":{"c1":"#f8fafc","c2":"#0f172a","c3":"#e2e8f0","c4":"#6366f1","c5":"#ffffff"},"f":{"f1":{"fm":"Inter","sz":14,"wt":400},"f2":{"fm":"Inter","sz":12,"wt":500},"f3":{"fm":"Inter","sz":16,"wt":600}},"sp":{"s1":8,"s2":16,"s3":24},"rd":{"r1":6,"r2":8}},"nd":[{"t":"fr","id":"form1","n":"login-form","w":400,"h":320,"bg":"c5","p":"s3","d":"v","g":"s2","br":{"w":1,"c":"c3","r":"r2"},"ch":[{"t":"txt","id":"t1","n":"title","fn":"f3","fg":"c2","txt":"Sign In"},{"t":"fr","id":"fg1","n":"email-group","d":"v","g":"s1","ch":[{"t":"txt","id":"l1","n":"email-label","fn":"f2","fg":"c2","txt":"Email"},{"t":"inp","id":"i1","n":"email-input","w":352,"h":40,"bg":"c1","fn":"f1","fg":"c2","p":"s1","br":{"w":1,"c":"c3","r":"r1"}}]},{"t":"fr","id":"fg2","n":"password-group","d":"v","g":"s1","ch":[{"t":"txt","id":"l2","n":"password-label","fn":"f2","fg":"c2","txt":"Password"},{"t":"inp","id":"i2","n":"password-input","w":352,"h":40,"bg":"c1","fn":"f1","fg":"c2","p":"s1","br":{"w":1,"c":"c3","r":"r1"}}]},{"t":"btn","id":"b1","n":"submit-btn","w":352,"h":44,"bg":"c4","fg":"c5","fn":"f3","txt":"Sign In","br":{"w":0,"c":"c4","r":"r1"}}]}]}
```

### Full page (simplified)

```json
{"tk":{"c":{"c1":"#ffffff","c2":"#0f172a","c3":"#6366f1","c4":"#f1f5f9","c5":"#64748b"},"f":{"f1":{"fm":"Inter","sz":14,"wt":400},"f2":{"fm":"Inter","sz":32,"wt":700},"f3":{"fm":"Inter","sz":18,"wt":400}},"sp":{"s1":8,"s2":16,"s3":24,"s4":48,"s5":64},"rd":{"r1":8,"r2":12}},"nd":[{"t":"pg","id":"p1","n":"landing-page","w":1440,"h":900,"bg":"c1","ch":[{"t":"hdr","id":"h1","n":"header","w":1440,"h":64,"bg":"c1","d":"h","al":"c","jc":"sb","p":["s1","s4","s1","s4"],"ch":[{"t":"txt","id":"logo","fn":"f2","fg":"c2","txt":"Acme"},{"t":"nav","id":"n1","d":"h","g":"s3","ch":[{"t":"txt","id":"nl1","fn":"f1","fg":"c5","txt":"Features"},{"t":"txt","id":"nl2","fn":"f1","fg":"c5","txt":"Pricing"},{"t":"btn","id":"nb1","w":100,"h":36,"bg":"c3","fg":"c1","fn":"f1","txt":"Get Started","br":{"w":0,"c":"c3","r":"r1"}}]}]},{"t":"sec","id":"hero","n":"hero-section","w":1440,"h":500,"bg":"c4","d":"v","al":"c","jc":"c","g":"s3","p":"s5","ch":[{"t":"txt","id":"ht","fn":"f2","fg":"c2","txt":"Build faster with Acme"},{"t":"txt","id":"hs","fn":"f3","fg":"c5","txt":"The modern platform for teams"},{"t":"btn","id":"hb","w":180,"h":48,"bg":"c3","fg":"c1","fn":"f1","txt":"Start Free Trial","br":{"w":0,"c":"c3","r":"r1"}}]}]}]}
```

---

## Cross-references

- **Extractors** produce IR files conforming to this schema → see `ui-convert-extractor-*` skills
- **Writers** consume IR files in this format → see `ui-convert-writer-*` skills
- **Token miner** produces `tokens.json` that IR files reference → see `ui-convert-token-miner`
- **State schema** defines where IR files live on disk → see `ui-convert-state`
