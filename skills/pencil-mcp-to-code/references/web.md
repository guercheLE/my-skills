# Web Code Generation from Pencil

## React + Tailwind (primary path)

Pencil has first-class support for this stack. Always load both guidelines before writing any component:

```
get_guidelines("code")      # component workflow, SVG extraction, validation steps
get_guidelines("tailwind")  # Tailwind v4 specifics, CSS vars, font loading, layout mapping
```

Follow the multi-step workflow from `get_guidelines("code")` exactly:
1. Identify which components appear in the frame, count instances
2. Extract each component one at a time with `batch_get([], [id], { maxDepth: 10, includePathGeometry: true })`
3. Implement in `.tsx`, validate visually with `get_screenshot`, fix discrepancies before moving on
4. Integrate into the frame, verify completeness (instance count matches)
5. Final validation: spacing, colors, typography, responsive behavior

Key Tailwind rules (from `get_guidelines("tailwind")`):
- `fill_container` → `flex-1` (in flex parent) or `w-full`/`h-full`
- `fit_content` → `w-fit` / `h-fit`
- Root containers: `h-full w-full`, NOT fixed pixel dimensions
- CSS variables in `:root` for single values (colors, numbers); font stacks in `@layer base` utility classes
- Tailwind v4: `@import "tailwindcss";` — never use old `@tailwind` directives
- Icon fonts: render as `<span>` with icon name as text; load via CDN link in `<head>`

---

## Vue / Angular / Svelte / vanilla HTML+CSS+JS

Load `get_guidelines("code")` for the component workflow, but adapt the framework-specific parts:

### Framework mapping

| Pencil concept | React | Vue | Angular | Vanilla |
|---------------|-------|-----|---------|---------|
| Component file | `.tsx` | `.vue` (SFC) | `.component.ts` + `.html` | `.js` + `.css` |
| Props | TypeScript interface | `defineProps<{...}>()` | `@Input()` | `data-*` attrs / JS params |
| Conditional render | `{cond && <X/>}` | `v-if="cond"` | `*ngIf="cond"` | `element.hidden = !cond` |
| Loops | `.map(item => <X/>)` | `v-for="item in list"` | `*ngFor="let item of list"` | `forEach` + `innerHTML` |
| Events | `onClick` | `@click` | `(click)` | `addEventListener` |

### Layout: Pencil → CSS

| Pencil property | CSS |
|-----------------|-----|
| `layoutMode: "horizontal"` | `display: flex; flex-direction: row;` |
| `layoutMode: "vertical"` | `display: flex; flex-direction: column;` |
| `sizing: "fill_container"` | `flex: 1;` (in flex) or `width: 100%;` |
| `sizing: "fit_content"` | `width: fit-content;` |
| `itemSpacing` | `gap: {value}px;` |
| `paddingTop/Right/Bottom/Left` | `padding: {t}px {r}px {b}px {l}px;` |
| `cornerRadius` | `border-radius: {value}px;` |
| `opacity` | `opacity: {value};` |

### Typography mapping

| Pencil property | CSS property |
|-----------------|-------------|
| `fontFamily` | `font-family` |
| `fontSize` | `font-size` |
| `fontWeight` | `font-weight` |
| `textAlign` | `text-align` |
| `lineHeight` | `line-height` |
| `letterSpacing` | `letter-spacing` |
| `fill` (on text) | `color` |

### Colors and design tokens

```js
// Read from Pencil
get_variables()   // e.g., { primary: "#3b82f6", spacing-base: "16px" }

// Map to CSS custom properties
:root {
  --color-primary: #3b82f6;
  --spacing-base: 16px;
}
```

Use CSS custom properties throughout; never hardcode hex values pulled from the design.

### SVG / icons

1. `batch_get([], [nodeId], { includePathGeometry: true })`  
2. Use `geometry` string as the `d` attribute in `<path>`  
3. Set `viewBox="0 0 {width} {height}"` from the node's width/height  
4. Never approximate paths — extract exact geometry

### Validation checklist

- [ ] Component instance count matches design
- [ ] Colors resolve to correct values via CSS variables
- [ ] Typography: font family, size, weight match `get_screenshot`
- [ ] Spacing/padding match snapshot layout values
- [ ] `fill_container` elements expand; `fit_content` elements shrink to content
- [ ] No hardcoded pixel dimensions on root containers
- [ ] Responsive: no horizontal overflow at standard breakpoints
