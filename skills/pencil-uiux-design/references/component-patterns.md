# Pencil Component Patterns

UI component design specifications and `batch_design` patterns for Pencil.

---

## Buttons

### Primary button

```
btn = I("parentId", {
  type: "frame",
  layout: "horizontal",
  padding: [12, 24],
  cornerRadius: 8,
  fill: "$color.primary",
  alignItems: "center",
  justifyContent: "center"
})
I(btn, { type: "text", content: "Get Started", fill: "#ffffff", fontSize: 16, fontWeight: 600 })
```

**Specs:**
- Minimum height: 44px (touch target)
- Padding: 12px vertical, 20–24px horizontal
- Font: 14–16px, semibold
- Corner radius: 6–8px (or `9999` for pill shape)
- States: default, hover (lighten 10%), active (darken 10%), disabled (40% opacity)

### Button variants

| Variant | Fill | Text color | Border |
|---------|------|-----------|--------|
| Primary | Brand color | White | — |
| Secondary | Transparent | Brand color | 1.5px brand color |
| Destructive | #EF4444 | White | — |
| Ghost | Transparent | Brand color | — |
| Disabled | #94A3B8 | White | — |

---

## Form Inputs

### Text input

```
field = I("formId", {
  type: "frame",
  layout: "vertical",
  gap: 6,
  width: "fill_container"
})
I(field, { type: "text", content: "Email address", fontSize: 14, fontWeight: 500, fill: "#374151" })
input = I(field, {
  type: "frame",
  layout: "horizontal",
  padding: [10, 14],
  cornerRadius: 6,
  fill: "#ffffff",
  stroke: { align: "inside", thickness: 1.5, fill: "#D1D5DB" },
  width: "fill_container",
  height: 42
})
I(input, { type: "text", content: "name@example.com", fontSize: 14, fill: "#9CA3AF" })
```

**Specs:**
- Label: 14px, medium weight, above the input
- Input height: 40–44px
- Padding: 10–12px vertical, 12–16px horizontal
- Border: 1–1.5px, neutral color; focus: brand color
- Error border: #EF4444; error message: 12px red text below input

### Input states

| State | Border color | Background |
|-------|-------------|-----------|
| Default | #D1D5DB | #FFFFFF |
| Focus | Brand color | #FFFFFF |
| Error | #EF4444 | #FEF2F2 |
| Disabled | #E5E7EB | #F9FAFB |

### Checkbox / Radio

- Touch target: minimum 44×44px
- Visual indicator: 18–20px checkbox or radio
- Label to the right, aligned to center
- Checked state: brand fill color with white checkmark

---

## Navigation

### Top navigation bar (web)

```
nav = I("pageId", {
  type: "frame",
  layout: "horizontal",
  padding: [0, 24],
  height: 64,
  width: "fill_container",
  alignItems: "center",
  justifyContent: "space_between",
  fill: "#ffffff",
  stroke: { align: "outside", thickness: 1, fill: "#E5E7EB" }
})
```

**Specs:**
- Height: 56–64px (desktop), 44–56px (mobile)
- Logo area: left-aligned
- Nav items: center or right-aligned
- Active item: brand color underline or fill
- Mobile: hamburger menu or bottom tab bar

### Bottom tab bar (mobile)

- Height: 84px (includes iOS safe area) or 56px (content area)
- 3–5 tabs; icons 24px with 4px label below
- Active tab: brand color icon + label
- Inactive: neutral gray

### Sidebar (dashboard)

- Width: 220–280px (desktop), collapsible
- Nav items: 40–44px height, 16px padding
- Active item: brand color background (10% opacity) + brand text
- Section dividers: 1px separator, 24px gap

---

## Cards

### Content card

```
card = I("gridId", {
  type: "frame",
  layout: "vertical",
  gap: 0,
  cornerRadius: 12,
  fill: "#ffffff",
  effect: { type: "shadow", offset: { x: 0, y: 2 }, blur: 8, color: "#0000001A" },
  width: 320
})
// Image area
I(card, { type: "rectangle", width: "fill_container", height: 180, fill: "#F3F4F6" })
// Content area
content = I(card, { type: "frame", layout: "vertical", gap: 8, padding: 16, width: "fill_container" })
I(content, { type: "text", content: "Card Title", fontSize: 16, fontWeight: 600 })
I(content, { type: "text", content: "Supporting description text goes here.", fontSize: 14, fill: "#6B7280" })
```

**Specs:**
- Corner radius: 8–16px
- Shadow: subtle (0 2px 8px rgba(0,0,0,0.1))
- Padding: 16–24px
- Image aspect ratio: 16:9 or 4:3

---

## Hero Section

### Landing page hero

```
hero = I("pageId", {
  type: "frame",
  layout: "vertical",
  gap: 24,
  padding: [80, 40],
  alignItems: "center",
  justifyContent: "center",
  width: "fill_container"
})
I(hero, { type: "text", content: "Your powerful headline here", fontSize: 56, fontWeight: 800, textAlign: "center" })
I(hero, { type: "text", content: "A clear, concise value proposition in 1–2 sentences.", fontSize: 20, fill: "#6B7280", textAlign: "center" })
// CTA row
cta = I(hero, { type: "frame", layout: "horizontal", gap: 16, alignItems: "center" })
// Primary and secondary buttons inside cta
```

**Specs:**
- Headline: 40–72px, bold
- Subheading: 18–24px, regular, muted color
- Vertical padding: 64–120px
- CTA buttons below the subheading; gap: 16px

---

## Tables & Data

- Header row: semibold labels, slightly elevated background (#F9FAFB)
- Row height: 48–56px
- Alternating rows: optional subtle stripe (#FAFAFA)
- Padding: 12–16px per cell
- Right-align numeric columns; left-align text
- Hover state: light highlight row

---

## Modal / Dialog

```
overlay = I("pageId", {
  type: "rectangle",
  width: "fill_container", height: "fill_container",
  fill: { type: "color", color: "#000000", opacity: 0.5 }
})
modal = I("pageId", {
  type: "frame",
  layout: "vertical",
  gap: 16,
  padding: 24,
  cornerRadius: 12,
  fill: "#ffffff",
  width: 480
})
```

**Specs:**
- Width: 400–560px (small), 560–720px (medium)
- Corner radius: 12–16px
- Overlay: 40–50% black
- Header: title + close button row
- Footer: action buttons (cancel left, confirm right)

---

## Empty & Loading States

### Empty state

```
empty = I("contentId", {
  type: "frame",
  layout: "vertical",
  gap: 12,
  alignItems: "center",
  padding: [48, 24]
})
// Icon (48–64px), heading, description, optional CTA
```

### Skeleton / loading

- Use rectangles with low-opacity neutral fill (#E5E7EB)
- Match the shape and size of the real content
- Add subtle shimmer effect (use `effect: { type: "blur" }` for approximation)

---

## Spacing Quick Reference

Use multiples of 8px for all spacing:

| Token | px | Use case |
|-------|----|---------|
| `spacing.xs` | 4 | Icon/label gap, tight inline |
| `spacing.sm` | 8 | Between related items |
| `spacing.md` | 16 | Default padding, card gap |
| `spacing.lg` | 24 | Section gap, form gap |
| `spacing.xl` | 32 | Page-level padding |
| `spacing.2xl` | 48–64 | Hero/section vertical padding |
