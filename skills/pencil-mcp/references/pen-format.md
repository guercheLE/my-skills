# The .pen File Format

`.pen` files are JSON documents that describe an object tree on Pencil's infinite two-dimensional canvas. They are version-control friendly and can be diffed, branched, and merged like any source file. This reference covers the key concepts you need when reading or reasoning about `.pen` file structure.

> **Authoritative source:** https://docs.pencil.dev/for-developers/the-pen-format

---

## Overview

- Each object is a graphical entity with a unique `id` and a `type` (e.g., `rectangle`, `frame`, `text`, `ref`, …).
- Top-level objects are positioned on an infinite canvas via `x` and `y` (top-left corner).
- Nested objects are positioned **relative** to their parent's top-left corner.
- `id` values must be unique within the document and **must not contain `/`**.

---

## Object Types (summary)

| Type | Description |
|------|-------------|
| `rectangle` | A rectangle with optional corner radius |
| `ellipse` | An ellipse; supports `innerRadius` for ring shapes |
| `frame` | A container; supports flex layout and children |
| `text` | A text element |
| `icon_font` | An icon from a built-in icon set (Material Symbols, Lucide, Feather, Phosphor) |
| `image` | An image |
| `path` | An SVG path |
| `ref` | An instance of a reusable component |
| `group` | A logical grouping (no layout by default) |

See the [TypeScript schema](#typescript-schema-highlights) section for full property details.

---

## Layout

Frames support a flexbox-style layout via the `layout` property:

```json
{
  "id": "container",
  "type": "frame",
  "layout": "horizontal",
  "gap": 16,
  "padding": [16, 24],
  "justifyContent": "start",
  "alignItems": "center",
  "children": []
}
```

| Property | Values | Notes |
|----------|--------|-------|
| `layout` | `"none"` \| `"horizontal"` \| `"vertical"` | `none` = absolute positioning for children |
| `gap` | number | Space between children on main axis |
| `padding` | number \| [h,v] \| [t,r,b,l] | Inside padding |
| `justifyContent` | `"start"` \| `"center"` \| `"end"` \| `"space_between"` \| `"space_around"` | Main axis alignment |
| `alignItems` | `"start"` \| `"center"` \| `"end"` | Cross axis alignment |

Child sizing via `width`/`height`:

```json
{ "width": "fill_container" }    // expand to fill parent
{ "width": "fit_content" }       // shrink to content size
{ "width": "fit_content(200)" }  // shrink to content, fallback 200px
{ "width": 120 }                 // fixed value
```

> **Note:** `x` and `y` are **ignored** for children inside a flex layout parent.

---

## Graphics

Objects support `fill`, `stroke`, and `effect` properties. Multiple fills are stacked in array order.

### Fill types

```jsonc
// Solid color
"fill": "#3b82f6"

// Color with options
"fill": { "type": "color", "color": "#3b82f6", "blendMode": "multiply" }

// Linear gradient
"fill": {
  "type": "gradient",
  "gradientType": "linear",
  "rotation": 90,
  "colors": [
    { "color": "#ffffff", "position": 0 },
    { "color": "#3b82f6", "position": 1 }
  ]
}

// Image fill
"fill": { "type": "image", "url": "./assets/hero.png", "mode": "fill" }
```

### Stroke

```json
{
  "stroke": {
    "align": "inside",
    "thickness": 2,
    "fill": "#1e293b"
  }
}
```

### Effects

```jsonc
// Drop shadow
{ "type": "shadow", "offset": { "x": 0, "y": 4 }, "blur": 16, "color": "#00000033" }

// Background blur
{ "type": "background_blur", "radius": 12 }

// Layer blur
{ "type": "blur", "radius": 8 }
```

---

## Components & Instances

### Reusable component

Mark any object with `reusable: true` to make it a component:

```json
{
  "id": "btn-primary",
  "type": "frame",
  "reusable": true,
  "cornerRadius": 8,
  "fill": "#3b82f6",
  "children": [
    { "id": "label", "type": "text", "content": "Button", "fill": "#ffffff" }
  ]
}
```

### Instance (`ref`)

Use `type: "ref"` to place an instance:

```json
{
  "id": "btn-1",
  "type": "ref",
  "ref": "btn-primary",
  "x": 100, "y": 200
}
```

### Overrides

Instances can override any property:

```json
{
  "id": "btn-danger",
  "type": "ref",
  "ref": "btn-primary",
  "fill": "#ef4444",
  "descendants": {
    "label": { "content": "Delete" }
  }
}
```

Override deeply nested descendants using slash paths:

```json
"descendants": {
  "card/header/title": { "content": "New title" }
}
```

Replace a descendant entirely (include `type` in the override):

```json
"descendants": {
  "label": {
    "id": "icon",
    "type": "icon_font",
    "iconFontFamily": "lucide",
    "icon": "check"
  }
}
```

### Slots

Mark a container frame as a slot to let Pencil suggest insertable components:

```json
{
  "id": "nav",
  "type": "frame",
  "reusable": true,
  "children": [
    {
      "id": "items",
      "type": "frame",
      "slot": ["nav-item", "nav-divider"]
    }
  ]
}
```

---

## Variables & Themes

Define document-wide design tokens:

```json
{
  "variables": {
    "color.primary": { "type": "color", "value": "#3b82f6" },
    "spacing.md":    { "type": "number", "value": 16 }
  }
}
```

Reference a variable with a `$` prefix:

```json
{ "fill": "$color.primary", "padding": "$spacing.md" }
```

### Multi-value variables (themes)

```json
{
  "variables": {
    "color.background": {
      "type": "color",
      "value": [
        { "value": "#ffffff", "theme": { "mode": "light" } },
        { "value": "#0f172a", "theme": { "mode": "dark" } }
      ]
    }
  },
  "themes": {
    "mode": ["light", "dark"]
  }
}
```

Apply a theme to a subtree via the `theme` property on any frame:

```json
{
  "id": "dark-screen",
  "type": "frame",
  "theme": { "mode": "dark" },
  "children": []
}
```

---

## TypeScript Schema Highlights

Key interfaces from the official schema:

```typescript
interface Entity {
  id: string;              // unique, no "/" allowed
  name?: string;
  type: string;
  x?: number;              // ignored in flex layout children
  y?: number;              // ignored in flex layout children
  rotation?: number;       // degrees, counter-clockwise
  reusable?: boolean;
  theme?: { [axis: string]: string };
  enabled?: boolean | Variable;
  opacity?: number | Variable;
  layoutPosition?: "auto" | "absolute";
}

interface Layout {
  layout?: "none" | "vertical" | "horizontal";
  gap?: number | Variable;
  padding?: number | [number,number] | [number,number,number,number] | Variable;
  justifyContent?: "start"|"center"|"end"|"space_between"|"space_around";
  alignItems?: "start"|"center"|"end";
}

// SizingBehavior: "fill_container", "fit_content", "fit_content(N)"
type SizingBehavior = string;
```

Full TypeScript schema: https://docs.pencil.dev/for-developers/the-pen-format#typescript-schema

---

## Icon Fonts

Built-in icon families available for `icon_font` objects:

| Family key | Library |
|-----------|---------|
| `material-symbols-outlined` | Material Symbols Outlined |
| `material-symbols-rounded` | Material Symbols Rounded |
| `material-symbols-sharp` | Material Symbols Sharp |
| `lucide` | Lucide Icons |
| `feather` | Feather |
| `phosphor` | Phosphor |

```json
{
  "id": "check-icon",
  "type": "icon_font",
  "iconFontFamily": "lucide",
  "icon": "check",
  "fill": "#22c55e",
  "width": 24, "height": 24
}
```
