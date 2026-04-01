# Platform Guidelines for Pencil Designs

Screen sizes, layout specs, and platform-specific conventions for iOS, Android, and Web.

---

## iOS / iPadOS

### Screen sizes (points)

| Device | Screen (pt) | Safe area insets |
|--------|------------|----------------|
| iPhone SE (3rd gen) | 375×667 | Top: 20, Bottom: 0 |
| iPhone 14 / 15 | 390×844 | Top: 47, Bottom: 34 |
| iPhone 14 / 15 Pro Max | 430×932 | Top: 47, Bottom: 34 |
| iPhone 16 Pro | 402×874 | Top: 62, Bottom: 34 |
| iPad (10th gen) | 820×1180 | Top: 24, Bottom: 20 |
| iPad Pro 12.9" | 1024×1366 | Top: 24, Bottom: 20 |

### iOS layout conventions

| Element | Spec |
|---------|------|
| Navigation bar height | 44pt (+ status bar) |
| Tab bar height | 49pt (+ 34pt home indicator on modern iPhones) |
| Status bar | 47pt (Face ID), 20pt (Home button) |
| Standard padding | 16–20pt |
| List row height | 44pt minimum |
| Touch target | 44×44pt minimum |

### iOS design principles

- **Clarity** — Text is legible; icons are precise
- **Deference** — UI supports content, not the other way around
- **Depth** — Layers and motion communicate hierarchy
- Use SF Pro / SF Rounded for iOS designs (or a system equivalent)
- Follow iOS 17+ styling: rounded corners (13–16pt), subtle shadows

---

## Android / Material Design 3

### Screen sizes (dp)

| Device class | Typical width | Layout |
|-------------|--------------|--------|
| Compact (phone) | 360–412dp | Single column |
| Medium (tablet portrait) | 600–840dp | Two-pane optional |
| Expanded (tablet landscape / desktop) | 840dp+ | Two or three-pane |

### Android layout conventions

| Element | Spec |
|---------|------|
| Top app bar height | 64dp |
| Bottom navigation height | 80dp |
| Navigation rail width | 80dp |
| Navigation drawer width | 360dp (max) |
| Standard padding | 16dp |
| Touch target | 48×48dp minimum |
| FAB size | 56×56dp (regular), 40×40dp (small), 96×96dp (large) |

### Material Design 3 key concepts

- **Dynamic Color** — Extract palette from wallpaper; use `primary`, `secondary`, `tertiary` color roles
- **Elevation** — Use tonal surface colors instead of shadows for elevation levels 0–5
- **Shape** — Use the shape scale: `extra-small` (4dp) → `extra-large` (28dp) → `full` (pill)
- Typography: use Material's type scale (`displayLarge` → `bodySmall`)

---

## Web

### Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | 1 column, 16px padding |
| Tablet | 640–1024px | 2 columns, 24px padding |
| Desktop | 1024–1440px | 12-column grid, 24–32px gutter |
| Wide | > 1440px | Max-width container (1280–1440px), centered |

### Web layout conventions

| Element | Spec |
|---------|------|
| Desktop header height | 56–72px |
| Sidebar width | 220–280px |
| Content max-width | 1280–1440px |
| Column gutter | 24–32px |
| Standard section padding | 64–96px vertical |
| Line length | 60–80 characters |

### Pencil artboard sizes for web

| Purpose | Width × Height |
|---------|---------------|
| Mobile | 375×812 or 390×844 |
| Tablet | 768×1024 |
| Desktop | 1440×900 or 1440×1024 |
| Wide / hero section | 1920×1080 |

---

## Choosing Canvas Size

When using `get_guidelines(topic)`, Pencil provides opinionated sizes for each context:

| Topic | Recommended canvas |
|-------|--------------------|
| `mobile-app` | 375×812 (iPhone) |
| `web-app` | 1440×900 (Desktop) |
| `landing-page` | 1440×900 (Desktop) + 375×812 (Mobile) |
| `design-system` | Free-form component sheets |
| `slides` | 1920×1080 (16:9) |

Always create **both mobile and desktop** artboards for responsive web projects.

---

## Typography by Platform

### iOS (Human Interface Guidelines)

| Style | Size | Weight |
|-------|------|--------|
| Large Title | 34pt | Regular |
| Title 1 | 28pt | Regular |
| Title 2 | 22pt | Regular |
| Headline | 17pt | Semibold |
| Body | 17pt | Regular |
| Callout | 16pt | Regular |
| Subhead | 15pt | Regular |
| Footnote | 13pt | Regular |
| Caption 1 | 12pt | Regular |

### Android (Material Design 3)

| Style | Size | Weight |
|-------|------|--------|
| Display Large | 57sp | Regular |
| Headline Large | 32sp | Regular |
| Headline Medium | 28sp | Regular |
| Title Large | 22sp | Regular |
| Title Medium | 16sp | Medium |
| Body Large | 16sp | Regular |
| Body Medium | 14sp | Regular |
| Label Large | 14sp | Medium |
| Label Small | 11sp | Medium |

### Web (common scale)

| Level | Size | Weight |
|-------|------|--------|
| Display | 48–72px | Bold |
| H1 | 36–48px | Bold |
| H2 | 28–36px | Semibold |
| H3 | 22–28px | Semibold |
| Body | 16px | Regular |
| Small | 14px | Regular |
| Caption | 12px | Regular |

---

## Safe Areas & Notches

Always account for safe areas when designing full-bleed screens:

- **iOS notch / Dynamic Island** — Do not place interactive elements within 47pt from top on Face ID devices
- **iOS home indicator** — Keep 34pt clear at the bottom of iPhone screens
- **Android status bar** — 24dp top; navigation bar 48dp bottom (gesture nav: 0dp but add padding)

In Pencil, add the safe area as a guide frame at the top level:

```
safe = I("screenId", {
  type: "frame",
  layout: "none",
  fill: { type: "color", color: "#0000FF", opacity: 0.05 },
  y: 0, height: 47,  // iOS safe area top
  width: "fill_container",
  enabled: false      // disable before export
})
```
