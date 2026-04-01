# Accessibility Guidelines for Pencil Designs

Apply these standards to every screen. Meeting WCAG 2.1 AA is the minimum bar for most products.

---

## Color Contrast

| Element | Minimum ratio | WCAG level |
|---------|--------------|-----------|
| Body text (< 18px regular or < 14px bold) | 4.5:1 | AA |
| Large text (≥ 18px regular or ≥ 14px bold) | 3:1 | AA |
| UI components and graphical objects | 3:1 | AA |

### How to verify in Pencil

1. `get_screenshot(nodeId)` — visually inspect the rendered output
2. For precise ratios, use a contrast checker tool with the hex values from `get_variables()`

### Common contrast mistakes

| Issue | Fix |
|-------|-----|
| Light gray text on white background | Use at least `#767676` on `#FFFFFF` (4.5:1) |
| White text on light brand color | Darken the background or switch to dark text |
| Placeholder text too light | #6B7280 on white = 4.6:1 ✅; #9CA3AF on white = 2.7:1 ❌ |
| Disabled state unreadable | Disabled items are exempt from contrast requirements (WCAG exception) |

---

## Touch & Click Targets

| Platform | Minimum size |
|----------|-------------|
| iOS / iPadOS | 44×44pt |
| Android | 48×48dp |
| Web | 44×44px recommended (WCAG 2.5.5 AAA: 44×44px; AA target: 24×24px) |

- Provide invisible tap area padding if the visible element is smaller than the minimum
- Space clickable elements at least 8px apart to avoid mis-taps

---

## Focus States

Every interactive element must have a visible focus indicator for keyboard navigation:

- **Recommended:** 2–3px solid outline in a high-contrast color (brand or #3B82F6)
- **Offset:** 2px from the element boundary to avoid overlap with the element
- **Do not:** Remove focus rings without providing an equivalent custom style

In Pencil, design the focused state as a separate component variant or frame annotation:

```
focused-input = I("annotationsId", {
  type: "frame",
  cornerRadius: 6,
  stroke: { align: "outside", thickness: 2, fill: "$color.primary" },
  // ... same dimensions as the regular input
})
```

---

## Typography Legibility

| Criterion | Recommendation |
|-----------|---------------|
| Minimum body font size | 16px (14px for secondary/caption only) |
| Line height | 1.4–1.6× font size for body text |
| Maximum line length | 60–80 characters per line |
| Letter spacing | Avoid very tight tracking (below -0.5px) |
| All-caps | Use sparingly; never for body text |

---

## Color Independence

Never rely on color alone to convey information:

| Context | Color-only ❌ | Accessible ✅ |
|---------|-------------|--------------|
| Form error | Red border | Red border + error icon + error message text |
| Status badges | Green/red background | Background + icon + label text |
| Charts | Different fill colors | Colors + patterns or labels |
| Required fields | Red asterisk color | Red asterisk + "Required" label or legend |

---

## Images and Icons

- **Decorative images** — mark as decorative (no alternative description needed in design annotations)
- **Informative images** — add an `alt` text annotation in the design (`context` property in `.pen`)
- **Icon-only buttons** — must have an accessible label annotation; always pair with visible text or tooltip

Use the `context` property to annotate accessibility intent:

```json
{ "id": "close-btn", "type": "frame", "context": "Close dialog", ... }
```

---

## Heading Hierarchy

Designs should map to a logical heading structure:

| Level | Usage |
|-------|-------|
| H1 | Page title (one per page) |
| H2 | Major section headers |
| H3 | Subsections within H2 sections |
| H4+ | Use sparingly for deep nesting |

Do not skip heading levels (e.g., H1 → H3 without an H2).

---

## Cognitive & Motion Accessibility

- **Animations:** Provide a reduced-motion variant; avoid flashing content (> 3 times/sec)
- **Timeouts:** Never auto-expire sessions in designs without a warning indicator
- **Error recovery:** Always show what went wrong and how to fix it — not just "Error occurred"
- **Plain language:** Use clear, simple vocabulary; avoid jargon
- **Consistent navigation:** Keep menus and controls in the same position across screens

---

## Accessibility Design Checklist

Before finalizing any screen:

- [ ] All text meets color contrast requirements (4.5:1 for body, 3:1 for large)
- [ ] All UI components meet 3:1 contrast against background
- [ ] All interactive elements have minimum 44×44px touch target
- [ ] Focus states are visible and distinct
- [ ] Color is never the sole indicator of state or meaning
- [ ] Images have descriptive `context` annotations
- [ ] Icon-only controls have accessible label annotations
- [ ] Heading hierarchy is logical (H1→H2→H3)
- [ ] Form errors show text messages, not just color
- [ ] Loading/empty/error states are clearly communicated
