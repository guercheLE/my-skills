---
name: ui-convert-scanner
description: >
  Artifact enumeration and classification for the ui2design pipeline. Uses deterministic scripts (Node.js +
  Python) to walk the project directory, identify all source files, classify them as style/component/page/
  layout/irrelevant, compute content hashes, and detect dependencies. Writes results to index.json.
  Use this skill after detection to build the artifact inventory. Any file marked "unknown" gets routed
  to ui-convert-ambiguity-resolver for AI triage.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, scanner, classification, scripts]
---

# Artifact Scanner

Enumerates all source files in the project, classifies them by visual role, computes content hashes,
and detects inter-artifact dependencies. Produces `index.json`.

## Non-negotiable Rules

1. **Respect exclude paths** — never scan `node_modules`, `.git`, `dist`, `build`, or user-configured excludes.
2. **Hash every artifact** — SHA-256 of file content for change detection and idempotency.
3. **Classify conservatively** — if unsure, mark as `unknown` (not `irrelevant`). Let the ambiguity resolver decide.
4. **Detect dependencies** — note which artifacts import/reference other artifacts.

---

## Scanning Process

### Step 1: Read Configuration

Load from `.ui-convert/project.json`:
- `root` — project root path
- `tech` — technology (determines file extensions to scan)
- `config.excludePaths` — directories to skip
- `config.maxDepth` — maximum directory nesting

### Step 2: Enumerate Files

Walk the directory tree, collecting files that match the technology's source extensions:

| Tech | Extensions |
|------|-----------|
| React/Next/Remix | `.jsx`, `.tsx`, `.js`, `.ts`, `.css`, `.scss`, `.module.css` |
| Vue/Nuxt | `.vue`, `.js`, `.ts`, `.css`, `.scss` |
| Angular | `.component.ts`, `.component.html`, `.component.css`, `.component.scss`, `.module.ts` |
| Svelte/SvelteKit | `.svelte`, `.js`, `.ts`, `.css` |
| HTML | `.html`, `.css`, `.js` |
| Blazor | `.razor`, `.razor.cs`, `.css` |
| Razor | `.cshtml`, `.cshtml.cs`, `.css` |
| WebForms | `.aspx`, `.ascx`, `.aspx.cs`, `.aspx.vb` |
| WPF/WinUI | `.xaml`, `.xaml.cs` |
| WinForms | `.cs` (with `.Designer.cs`), `.resx` |
| PHP | `.php`, `.blade.php`, `.twig`, `.css` |
| Python | `.html` (templates), `.py`, `.css` |
| Flutter | `.dart` |
| React Native | `.jsx`, `.tsx`, `.js`, `.ts` |
| Web Components | `.js`, `.ts`, `.css` |

### Step 3: Classify Each File

Classification rules (applied in order):

#### Style files → `style`
- CSS/SCSS/LESS files
- Tailwind config, theme files
- `styles/`, `theme/` directories
- XAML resource dictionaries
- Files exporting only style objects

#### Component files → `component`
- React: files exporting a function/class component (not a page)
- Vue: `.vue` SFC files in `components/` directory
- Angular: files with `@Component` decorator
- Svelte: `.svelte` files in non-route directories
- .NET: `.razor`/`.xaml` files not in `Pages/` or `Views/`
- Flutter: widget files not in `screens/` or `pages/`

#### Page files → `page`
- Files in `pages/`, `views/`, `screens/`, `routes/` directories
- Next.js: `page.tsx` in `app/` directory
- Nuxt: files in `pages/` directory
- Angular: files with route configuration referencing them

#### Layout files → `layout`
- Files in `layouts/` directory
- Next.js: `layout.tsx` files
- Files named `*Layout*`, `*Shell*`, `*Wrapper*`

#### Irrelevant files → `irrelevant`
- Test files (`*.test.*`, `*.spec.*`, `__tests__/`)
- Type definitions (`*.d.ts`)
- Utility/helper modules with no UI (pure functions, API calls)
- Configuration files (webpack, babel, eslint, etc.)
- Build outputs, generated files

#### Unknown → `unknown`
- Anything that doesn't clearly fit the above categories
- Routed to `ui-convert-ambiguity-resolver` for AI triage

### Step 4: Compute Hashes and Dependencies

For each artifact:
- **Hash**: SHA-256 of file content (for change detection on re-runs)
- **Dependencies**: Parse imports/requires to find references to other scanned artifacts

```javascript
// Example: React dependency detection
import { Button } from '../components/Button';  // → depends on Button artifact
import styles from './Home.module.css';           // → depends on Home.module.css artifact
```

### Step 5: Assign Priority

Within each category, assign priority based on:
1. Dependency order (depended-on artifacts first)
2. File size (smaller = simpler, process first)
3. Directory depth (shallower first)

### Step 6: Write index.json

```json
{
  "_v": 1,
  "total": 42,
  "artifacts": [
    {
      "id": "a001",
      "path": "src/components/Button.tsx",
      "category": "component",
      "name": "Button",
      "hash": "sha256:abc123def456...",
      "deps": [],
      "priority": 1,
      "size": 1024,
      "lastModified": "2026-03-15T10:30:00Z"
    },
    {
      "id": "a002",
      "path": "src/pages/Home.tsx",
      "category": "page",
      "name": "Home",
      "hash": "sha256:789ghi012...",
      "deps": ["a001"],
      "priority": 2,
      "size": 3072,
      "lastModified": "2026-03-20T14:15:00Z"
    }
  ]
}
```

---

## Script Structure

```
skills/ui-convert-scanner/
├── SKILL.md
├── scripts/
│   ├── scan.ts            # Main scanner (Node.js)
│   ├── classify.ts        # Classification rules
│   ├── hash.ts            # SHA-256 hashing
│   └── deps.ts            # Dependency detection
└── package.json           # Dependencies (fast-glob, crypto)
```

---

## Cross-references

- **Input** → `project.json` from `ui-convert-detector`
- **Output schema** → `ui-convert-state` (`index.json`)
- **Unknown artifacts** → `ui-convert-ambiguity-resolver`
- **Called by** → `ui-convert-coordinator` (stage 4)
- **Followed by** → `ui-convert-token-miner`
