---
name: ui-convert-token-miner
description: >
  Design token extraction for the ui2design pipeline. Uses deterministic scripts (Node.js + Python) to extract
  colors, typography, spacing, shadows, and border-radius values from CSS, SCSS, Tailwind config, XAML resource
  dictionaries, and other style sources. Writes results to tokens.json.
  Use this skill after scanning to build the global token table that IR files will reference.
  Also useful when debugging token mismatches between source code and generated IR.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, tokens, mining, scripts, styles]
---

# Token Miner

Extracts design tokens (colors, fonts, spacing, shadows, radii) from project style sources.
Produces `tokens.json` with normalized, deduplicated token values using short-key IDs.

## Non-negotiable Rules

1. **Deduplicate** — same hex color appearing in 3 files = 1 color token.
2. **Normalize** — all colors to lowercase hex6 (`#1a1a2e`), all spacing to px numbers.
3. **Short IDs** — colors: `c1`, `c2`..., fonts: `f1`, `f2`..., spacing: `s1`, `s2`...
4. **Trace source** — every token records where it was found (file + property).
5. **Token table is additive** — re-running adds new tokens, never removes existing ones.

---

## Extraction Sources

### CSS / SCSS / LESS

```css
/* Extract from custom properties */
:root {
  --primary: #1a1a2e;        /* → color token */
  --font-size-base: 16px;    /* → font size */
  --spacing-md: 16px;        /* → spacing token */
  --radius-sm: 4px;          /* → radius token */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1); /* → shadow token */
}

/* Extract from declarations */
body { font-family: 'Inter', sans-serif; }  /* → font token */
.card { border-radius: 8px; }               /* → radius token */
```

### Tailwind CSS Config

```javascript
// tailwind.config.js → richest token source for Tailwind projects
module.exports = {
  theme: {
    colors: { primary: '#1a1a2e', ... },     // → color tokens
    fontFamily: { sans: ['Inter', ...] },     // → font tokens
    spacing: { 1: '4px', 2: '8px', ... },    // → spacing tokens
    borderRadius: { sm: '4px', ... },         // → radius tokens
    boxShadow: { sm: '0 1px 3px ...' },       // → shadow tokens
  }
};
```

### XAML Resource Dictionaries (WPF/WinUI)

```xml
<SolidColorBrush x:Key="PrimaryBrush" Color="#1A1A2E"/>
<FontFamily x:Key="BodyFont">Segoe UI</FontFamily>
<sys:Double x:Key="SpacingMd">16</sys:Double>
<CornerRadius x:Key="SmallRadius">4</CornerRadius>
```

### Theme Files (MUI, Chakra, Vuetify, etc.)

```javascript
// MUI theme
const theme = createTheme({
  palette: { primary: { main: '#1a1a2e' } },
  typography: { fontFamily: 'Inter' },
  spacing: 8,
});
```

### Flutter (Dart)

```dart
const primaryColor = Color(0xFF1A1A2E);
const bodyFont = TextStyle(fontFamily: 'Inter', fontSize: 16);
```

---

## Token Normalization

| Raw Value | Normalized | Type |
|-----------|-----------|------|
| `#1A1A2E` | `#1a1a2e` | color |
| `rgb(26, 26, 46)` | `#1a1a2e` | color |
| `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.1)` | color (kept as rgba) |
| `16px` | `16` | spacing/size (number) |
| `1rem` | `16` | spacing (assuming 16px base) |
| `0.5rem` | `8` | spacing |
| `'Inter', sans-serif` | `Inter` | font family (first value) |
| `600` | `600` | font weight |
| `0 1px 3px rgba(0,0,0,0.1)` | `{"x":0,"y":1,"b":3,"c":"rgba(0,0,0,0.1)"}` | shadow |

---

## Deduplication Strategy

1. **Colors**: Compare normalized hex values. Same hex = same token.
2. **Fonts**: Compare family name (case-insensitive). Merge weight lists.
3. **Spacing**: Compare numeric values. Same number = same token.
4. **Shadows**: Compare all components (x, y, blur, spread, color).
5. **Radii**: Compare numeric values.

When duplicates are found, keep the most semantically named source:
- `--color-primary` wins over `--heading-color` if they're the same hex
- `spacing.md` wins over an anonymous `16px` in a random CSS rule

---

## Output Format

See `ui-convert-state` for the full `tokens.json` schema. Example:

```json
{
  "_v": 1,
  "source": "tailwind.config.js",
  "colors": {
    "c1": { "value": "#1a1a2e", "name": "primary", "source": "colors.primary" }
  },
  "fonts": {
    "f1": { "family": "Inter", "weights": [400, 500, 600, 700], "source": "fontFamily.sans" }
  },
  "spacing": {
    "s1": { "value": 4, "name": "xs", "source": "spacing.1" }
  },
  "shadows": {},
  "radii": {
    "r1": { "value": 4, "name": "sm", "source": "borderRadius.sm" }
  }
}
```

---

## Script Structure

```
skills/ui-convert-token-miner/
├── SKILL.md
├── scripts/
│   ├── mine.ts              # Main entry (Node.js)
│   ├── css-extractor.ts     # CSS/SCSS/LESS parsing
│   ├── tailwind-extractor.ts # Tailwind config parsing
│   ├── theme-extractor.ts   # MUI/Chakra/Vuetify theme parsing
│   ├── xaml-extractor.py    # XAML resource dictionary parsing (Python)
│   ├── dart-extractor.py    # Flutter theme parsing (Python)
│   └── normalize.ts         # Value normalization utilities
└── package.json
```

---

## Cross-references

- **Input** → `index.json` from `ui-convert-scanner` (to find style artifacts)
- **Output schema** → `ui-convert-state` (`tokens.json`)
- **Token IDs** → match `ui-convert-ir-schema` short-key convention
- **Called by** → `ui-convert-coordinator` (stage 5)
- **Used by** → all `ui-convert-extractor-*` skills (reference global tokens in IR)
