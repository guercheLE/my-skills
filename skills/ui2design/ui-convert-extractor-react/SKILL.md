---
name: ui-convert-extractor-react
description: >
  React/JSX/TSX to Design IR extractor for the ui2design pipeline. Converts React component files (including
  Next.js and Remix variants) into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is react, nextjs, or remix and the pipeline needs to extract
  visual structure from JSX/TSX source files into IR JSON files.
  Handles functional components, class components, styled-components, CSS modules, Tailwind classes,
  MUI/Chakra/Ant Design component libraries, and conditional rendering.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, react, nextjs, remix, jsx, tsx]
---

# React Extractor

Converts React components (JSX/TSX) into Design IR. Handles React, Next.js, and Remix projects.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<div className="...">` | Frame node (`fr`) with mapped styles |
| `<button onClick={...}>Submit</button>` | Button node (`btn`) with text |
| `<input type="text" />` | Input node (`inp`) |
| `<img src="..." />` | Image node (`img`) |
| `<h1>Title</h1>` | Text node (`txt`) with heading font |
| `<ul><li>...</li></ul>` | List container (`lst`) + list items (`li`) |
| `<table>...</table>` | Table nodes (`tbl` → `tr` → `td`) |
| Component imports | Component ref (`ref`) with overrides |
| Conditional rendering | Primary branch only |

---

## Extraction Process

### Step 1: Parse JSX Tree

Read the source file. Identify the component's return statement (or `render()` for class components).
Parse the JSX tree into a node hierarchy.

For files with multiple components, extract each as a separate node tree.

### Step 2: Resolve Styles

Map styles from various sources to IR token references:

#### Tailwind Classes
```jsx
<div className="bg-blue-500 text-white p-4 rounded-lg flex flex-col gap-2">
```
→ Map each utility class to token refs from `tokens.json`:
- `bg-blue-500` → `bg: "c3"` (lookup blue-500 in tokens)
- `text-white` → `fg: "c5"`
- `p-4` → `p: "s3"`
- `rounded-lg` → `br.r: "r2"`
- `flex flex-col` → `d: "v"`
- `gap-2` → `g: "s1"`

#### CSS Modules
```jsx
import styles from './Button.module.css';
<button className={styles.primary}>
```
→ Read the CSS module file, extract relevant declarations, map to tokens.

#### CSS-in-JS (styled-components, emotion)
```jsx
const Button = styled.button`
  background: ${theme.colors.primary};
  padding: 8px 16px;
  border-radius: 4px;
`;
```
→ Parse template literal, resolve theme references, map to tokens.

#### Inline Styles
```jsx
<div style={{ backgroundColor: '#1a1a2e', padding: 16 }}>
```
→ Map directly to token refs or create file-local tokens.

### Step 3: Handle Component Libraries

When MUI/Chakra/Ant Design components are detected:

```jsx
import { Button, TextField, Card } from '@mui/material';
<Card>
  <TextField label="Email" />
  <Button variant="contained">Submit</Button>
</Card>
```

Map library components to IR node types:
- `Button` → `btn` with library-default sizing
- `TextField` / `Input` → `inp`
- `Card` → `crd`
- `Modal` / `Dialog` → `mdl`
- `Tabs` → `tab`
- `Accordion` → `acc`
- `AppBar` / `Toolbar` → `hdr`
- `Drawer` → `sdb`

### Step 4: Detect Layout

Infer layout direction and alignment from CSS/Tailwind:

| CSS/Tailwind | IR Properties |
|-------------|---------------|
| `display: flex; flex-direction: column` / `flex-col` | `d: "v"` |
| `display: flex; flex-direction: row` / `flex-row` | `d: "h"` |
| `align-items: center` / `items-center` | `al: "c"` |
| `justify-content: space-between` / `justify-between` | `jc: "sb"` |
| `gap: 16px` / `gap-4` | `g: "s3"` |
| `display: grid` | Convert to nearest flex equivalent |

### Step 5: Handle Component Deduplication

If the same component is used multiple times (imported by other files):
- First extraction → full node definition
- Subsequent uses → `ref` type with `cmp` pointing to the first occurrence

### Step 6: Write IR File

Output one `.json` file per artifact to `.ui-convert/ir/`:

```json
{"tk":{"c":{"c1":"#6366f1"},"f":{"f1":{"fm":"Inter","sz":14,"wt":600}},"sp":{"s1":8},"rd":{"r1":6}},"nd":[{"t":"btn","id":"b1","n":"primary-btn","w":120,"h":40,"bg":"c1","fg":"c2","fn":"f1","txt":"Submit","p":"s1","br":{"w":0,"c":"c1","r":"r1"}}]}
```

---

## Next.js Awareness

- `layout.tsx` → extract as layout (`layout` category, `fr` node type)
- `page.tsx` → extract as page (`pg` node type)
- `loading.tsx` → extract as component (loading skeleton)
- `error.tsx` → extract as component (error boundary UI)
- Server components → extract visual output only (ignore server logic)
- Client components (`'use client'`) → standard extraction

## Remix Awareness

- `root.tsx` → layout
- Route files → pages
- `loader`/`action` functions → ignore (server logic)
- `useLoaderData()` → treat returned data as placeholder content

---

## Edge Cases

- **Conditional rendering** (`{condition && <Component />}`) → extract the primary/truthy branch
- **Map/list rendering** (`{items.map(...)}`) → extract one iteration as a list item
- **Fragments** (`<>...</>`) → treat as transparent container
- **Portals** → extract portal content as a separate node tree
- **Suspense boundaries** → extract fallback and main content separately
- **Dynamic imports** → note the imported component, extract if available

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Input** → `index.json` artifacts with `category: component|page|layout`
- **Output** → `.ui-convert/ir/*.json`
- **Called by** → `ui-convert-coordinator` (stage 6)
