---
name: pencil-uiux-design
description: >
  Comprehensive guide for creating professional UI/UX designs in Pencil (pencil.dev) using MCP tools.
  Use this skill when: (1) Creating new UI/UX designs for web, mobile, or desktop applications,
  (2) Building design systems with reusable components and variables, (3) Designing dashboards, forms,
  navigation, hero sections, or landing pages, (4) Applying accessibility standards and best practices,
  (5) Following platform guidelines (iOS, Android, web), (6) Reviewing or improving existing Pencil
  designs for usability, (7) Setting up or managing design tokens and themes.
  Triggers: "design a UI", "create interface", "build layout", "design dashboard", "create form",
  "design landing page", "make it accessible", "design system", "component library", "vibe design".
---

# Pencil UI/UX Design Guide

Create professional, user-centered designs in Pencil using the Pencil MCP server tools and proven UI/UX principles.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `get_editor_state` | Get current file, selection, and canvas context |
| `open_document` | Open or create a `.pen` file |
| `batch_get` | Find and read nodes by name pattern or ID |
| `snapshot_layout` | Get bounding boxes for every node |
| `find_empty_space_on_canvas` | Locate free canvas areas for new screens |
| `get_guidelines` | Load platform-specific design guidelines |
| `get_style_guide_tags` | See available style guide tags |
| `get_style_guide` | Load a style guide (colors, fonts, components) |
| `batch_design` | Create, update, copy, move, or delete nodes |
| `get_screenshot` | Render and inspect the visual result |
| `get_variables` | Read design tokens and theme values |
| `set_variables` | Add or update design tokens |
| `search_all_unique_properties` | Find all distinct property values |
| `replace_all_matching_properties` | Bulk-update properties across the design |
| `export_nodes` | Export nodes as PNG, JPEG, WEBP, or PDF |

## Quick Reference

| Task | Reference File |
|------|---------------|
| Component specs (buttons, forms, nav, cards) | [references/component-patterns.md](references/component-patterns.md) |
| Accessibility (contrast, touch targets, focus) | [references/accessibility.md](references/accessibility.md) |
| Screen sizes & platform specs | [references/platform-guidelines.md](references/platform-guidelines.md) |

## Setup

**Before checking setup:** Try calling `get_editor_state` — if it succeeds, Pencil is connected. No setup needed.

If Pencil is not connected, see [pencil-mcp/references/setup-troubleshooting.md](../pencil-mcp/references/setup-troubleshooting.md) for installation and authentication instructions.

## Core Design Principles

### The Golden Rules

1. **Clarity over cleverness** — Every element must have a purpose
2. **Consistency builds trust** — Reuse components, colors, and spacing
3. **User goals first** — Design for tasks, not features
4. **Accessibility is not optional** — Design for everyone
5. **Validate visually** — Use `get_screenshot` after significant changes

### Visual Hierarchy (Priority Order)

1. **Size** — Larger = more important
2. **Color/Contrast** — High contrast draws attention
3. **Position** — Top-left (LTR) is seen first
4. **Whitespace** — Isolation emphasizes importance
5. **Weight** — Bold text stands out

## Design Workflow

1. **Check for an existing design system first** — Ask the user if they have tokens or specs, or read the current `.pen` file with `get_variables()` and `batch_get(["*"])`
2. **Get context** — `get_editor_state()` → `batch_get(["*"])` → `snapshot_layout()`
3. **Load guidelines** — `get_guidelines(topic)` where topic is `web-app`, `mobile-app`, `landing-page`, `design-system`, `code`, or `tailwind`
4. **Load style guide** — `get_style_guide_tags()` → `get_style_guide(tags, name)` for colors, fonts, component patterns
5. **Design** — `find_empty_space_on_canvas()` → `batch_design(operations)`
6. **Validate** — `get_screenshot(nodeId)` after every significant block of changes

## Design System Handling

**Before creating designs, determine if the user has an existing design system:**

1. Ask: "Do you have a design system or brand guidelines to follow?"
2. Discover from the open file with `get_variables()` and `batch_get(["*color*", "*token*", "*style*"])`

**If the user HAS a design system:**
- Use their specified colors, spacing, and typography tokens
- Match existing component patterns found via `batch_get`
- Follow their naming conventions

**If the user has NO design system:**
- Load a matching style guide via `get_style_guide_tags()` → `get_style_guide()`
- Use the default tokens below as a starting point
- Use `set_variables()` to establish consistent tokens before building

## Default Design Tokens

**Use only when no design system is available. Always prefer the user's tokens.**

### Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.xs` | 4px | Tight inline elements |
| `spacing.sm` | 8px | Related elements |
| `spacing.md` | 16px | Default padding |
| `spacing.lg` | 24px | Section spacing |
| `spacing.xl` | 32px | Major sections |
| `spacing.2xl` | 48px | Page-level spacing |

### Typography Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 48–64px | Bold | Hero headlines |
| H1 | 32–40px | Bold | Page titles |
| H2 | 24–28px | Semibold | Section headers |
| H3 | 20–22px | Semibold | Subsections |
| Body | 16px | Regular | Main content |
| Small | 14px | Regular | Secondary text |
| Caption | 12px | Regular | Labels, hints |

### Color Usage

| Purpose | Recommendation |
|---------|---------------|
| Primary | Main brand color, CTAs |
| Secondary | Supporting actions |
| Success | #22C55E range |
| Warning | #F59E0B range |
| Error | #EF4444 range |
| Neutral | Gray scale for text/borders |

## Common Screen Layouts

### Mobile (375×812)

```
┌─────────────────────────────┐
│ Status Bar (44px)           │
├─────────────────────────────┤
│ Header/Nav (56px)           │
├─────────────────────────────┤
│                             │
│ Content Area (scrollable)   │
│ Padding: 16px horizontal    │
│                             │
├─────────────────────────────┤
│ Bottom Nav/CTA (84px)       │
└─────────────────────────────┘
```

### Desktop Dashboard (1440×900)

```
┌──────┬───────────────────────────────────┐
│      │ Header (64px)                     │
│ Side │───────────────────────────────────│
│ bar  │ Page Title + Actions              │
│      │───────────────────────────────────│
│ 240  │ Content Grid                      │
│ px   │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│      │ │Card │ │Card │ │Card │ │Card │  │
│      │ └─────┘ └─────┘ └─────┘ └─────┘  │
└──────┴───────────────────────────────────┘
```

## Component Checklist

### Buttons
- [ ] Clear, action-oriented label (2–3 words)
- [ ] Minimum touch target: 44×44px
- [ ] Visual states: default, hover, active, disabled
- [ ] Sufficient contrast (3:1 against background)
- [ ] Consistent corner radius

### Forms
- [ ] Labels above inputs (not just placeholders)
- [ ] Required field indicators
- [ ] Error messages adjacent to fields
- [ ] Logical tab order
- [ ] Input types match content (email, tel, etc.)

### Navigation
- [ ] Current location clearly indicated
- [ ] Consistent position across screens
- [ ] Maximum 7±2 top-level items
- [ ] Touch-friendly on mobile (48px targets)

## Accessibility Quick Checks

1. **Color contrast** — Text 4.5:1, large text 3:1
2. **Touch targets** — Minimum 44×44px
3. **Focus states** — Visible keyboard focus indicators
4. **Hierarchy** — Proper heading levels (H1→H2→H3)
5. **Color independence** — Never rely solely on color to convey information

## Positioning New Screens

Always check existing boards before placing new ones to avoid overlap:

```
1. batch_get(["*"], [])            # find all nodes, note rightmost x+width
2. find_empty_space_on_canvas()    # let Pencil calculate a free area
3. batch_design(...)               # place the new screen there
```

**Spacing guidelines:**
- 100px gap between related screens (same flow)
- 200px+ gap between different sections or flows
- Align boards to the same `y` for visual organization

## Design Review Checklist

Before finalizing any design:

- [ ] Visual hierarchy is clear
- [ ] Consistent spacing and alignment
- [ ] Typography is readable (16px+ body text)
- [ ] Color contrast meets WCAG AA
- [ ] Interactive elements are visually obvious
- [ ] Mobile-friendly touch targets
- [ ] Loading/empty/error states considered
- [ ] Design tokens used (no hardcoded hex values)

## Tips for Great Designs

1. **Start with content** — Real content reveals layout needs
2. **Design mobile-first** — Constraints breed creativity
3. **Use an 8px grid** — Everything snaps to multiples of 8
4. **Limit colors** — 1 primary + 1 secondary + neutrals
5. **Limit fonts** — 1–2 typefaces maximum
6. **Embrace whitespace** — Breathing room improves comprehension
7. **Be consistent** — Same action = same appearance everywhere
8. **Provide feedback** — Every action needs a visual response
