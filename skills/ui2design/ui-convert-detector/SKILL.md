---
name: ui-convert-detector
description: >
  Project technology detection for the ui2design pipeline. Uses deterministic scripts (Node.js + Python) to
  analyze a project folder and determine its technology stack and UI framework, writing results to project.json.
  Use this skill when the pipeline needs to identify what technology a project uses — this is the first
  substantive pipeline stage after preflight. The detector uses heuristics from ui-convert-tech-markers.
  Also use when detection results seem wrong and you need to understand or override the detection logic.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, detection, scripts, technology]
---

# Project Technology Detector

Analyzes a project folder to determine its technology stack and UI framework.
Produces `project.json` in the `.ui-convert/` directory.

## How It Works

The detector runs deterministic scripts — no AI inference needed. It checks files in priority order
as defined by `ui-convert-tech-markers`:

1. Config files (highest confidence)
2. Package dependencies
3. File extensions
4. Directory structure
5. File content patterns (lowest confidence)

---

## Detection Process

### Step 1: Initialize State Directory

```
mkdir -p .ui-convert/ir .ui-convert/logs
```

If `.ui-convert/project.json` already exists, skip detection unless `--force` flag is used.

### Step 2: Scan for Config Files

Check for framework-specific config files at the project root and common subdirectories:

```
next.config.js, next.config.mjs, next.config.ts    → nextjs
nuxt.config.js, nuxt.config.ts                      → nuxt
angular.json, .angular-cli.json                     → angular
svelte.config.js                                    → svelte/sveltekit
remix.config.js, remix.config.ts                    → remix
```

### Step 3: Check Package Dependencies

Read `package.json` (Node.js), `pubspec.yaml` (Flutter), `*.csproj` (.NET), `composer.json` (PHP),
`requirements.txt` / `pyproject.toml` (Python):

```javascript
// Node.js example
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
if (deps['next']) return 'nextjs';
if (deps['@remix-run/react']) return 'remix';
if (deps['react']) return 'react';
if (deps['vue']) return 'vue';
if (deps['@angular/core']) return 'angular';
if (deps['svelte']) return 'svelte';
if (deps['react-native']) return 'react-native';
```

### Step 4: Check File Extensions

Glob for characteristic extensions:

```
*.razor + @code blocks    → blazor
*.cshtml                   → razor
*.aspx, *.ascx            → webforms
*.xaml + WPF namespace     → wpf
*.xaml + WinUI namespace   → winui
*.Designer.cs              → winforms
*.vue                      → vue
*.svelte                   → svelte
*.blade.php                → php-blade
*.twig                     → php-twig
*.dart (in lib/)           → flutter
```

### Step 5: Detect UI Framework

Independent of base technology — check for Tailwind, Bootstrap, MUI, etc.:

```javascript
// Check tailwind.config.js
// Check package.json for bootstrap, @mui/material, antd, @chakra-ui/react, vuetify
// Check for @tailwind directives in CSS files
// Check for components.json (shadcn/ui)
```

### Step 6: Write project.json

```json
{
  "_v": 1,
  "root": "/Users/dev/myapp",
  "tech": "react",
  "uiFramework": "tailwind",
  "techVersion": "18.2.0",
  "uiFrameworkVersion": "3.4.0",
  "targetTool": "pencil",
  "createdAt": "2026-04-04T12:00:00Z",
  "updatedAt": "2026-04-04T12:00:00Z",
  "config": {
    "excludePaths": ["node_modules", "dist", "build", ".git"],
    "includeTests": false,
    "maxDepth": 10
  }
}
```

---

## Script Structure

```
skills/ui-convert-detector/
├── SKILL.md
├── scripts/
│   ├── detect.ts          # Main detection script (Node.js)
│   ├── detect_dotnet.py   # .NET-specific detection (Python)
│   └── detect_python.py   # Python project detection
├── package.json           # Node.js dependencies (glob, fast-glob)
└── requirements.txt       # Python dependencies (pyyaml, toml)
```

### Running Detection

```bash
# Node.js (web/mobile projects)
npx ts-node scripts/detect.ts /path/to/project --target pencil

# Python (.NET, Python projects)
python scripts/detect_dotnet.py /path/to/project
python scripts/detect_python.py /path/to/project
```

The coordinator determines which script to run based on initial file presence.

---

## Disambiguation

When multiple technologies match at the same confidence level:

1. Prefer meta-frameworks over base frameworks (Next.js over React).
2. Prefer the technology with more config-file evidence.
3. If still ambiguous, log both candidates to `logs/errors.jsonl` and pick the first by priority.

---

## Error Handling

- **Empty folder** → error, halt pipeline
- **No recognized technology** → error, log to `errors.jsonl`, halt
- **Multiple matches** → disambiguate per rules above, log the ambiguity
- **Missing dependency file** → fall back to extension/content detection

---

## Cross-references

- **Heuristics** → `ui-convert-tech-markers` (detection rules)
- **Output schema** → `ui-convert-state` (`project.json` schema)
- **Called by** → `ui-convert-coordinator` (stage 3)
- **Followed by** → `ui-convert-scanner`
