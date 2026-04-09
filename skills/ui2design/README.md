# ui2design

A local pipeline that converts UI source code into design tool artifacts via MCP.

Deterministic scripts (Node.js + Python) scan, classify, and mine tokens.  
AI agents extract visual structure and write to design tools.  
Disk-backed state enables resumability, batching, and idempotency.

## Supported Source Technologies

| Category | Technologies |
|----------|-------------|
| **Web** | React, Next.js, Remix, Vue, Nuxt, Angular, Svelte, SvelteKit, Astro, plain HTML/CSS/JS |
| **.NET Web** | Blazor, Razor Pages/MVC, ASP.NET WebForms |
| **.NET Desktop** | WPF, WinUI 3, WinForms |
| **Mobile** | React Native, Flutter |
| **Template Engines** | Blade, Twig, Jinja2, Django, EJS, Pug |
| **Other** | Web Components (Lit), PHP |

UI framework detection: Tailwind, Bootstrap, MUI, Ant Design, Chakra, Vuetify, Angular Material.

## Supported Design Tools (via MCP)

| Tool | Status |
|------|--------|
| Pencil.dev | ✅ Active |
| Figma | ✅ Active |
| Penpot | ✅ Active |
| Stitch | ✅ Active |
| Paper | ✅ Active |

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Detect &   │     │   Extract   │     │   Extract    │     │   Write to  │
│  Scan Repo  │────▶│   Tokens    │────▶│   Design IR  │────▶│ Design Tool │
│  (scripts)  │     │  (scripts)  │     │   (agents)   │     │   (agent)   │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
     │                    │                    │                     │
     ▼                    ▼                    ▼                     ▼
 project.json        tokens.json          ir/*.json           registry.json
 index.json                                                   progress.json
```

### Pipeline Stages

| Stage | What | How | Parallelizable |
|-------|------|-----|----------------|
| 0 | **Preflight** — ask folder/tool, verify MCP server | Coordinator agent | — |
| 1 | **Detect** — identify project technology | Node.js + Python scripts | — |
| 2 | **Scan** — enumerate and classify artifacts | Node.js + Python scripts | — |
| 3 | **Mine tokens** — extract colors, typography, spacing | Node.js + Python scripts | — |
| 4 | **Extract IR** — convert each artifact to Design IR | AI agents (per technology) | ✅ Yes |
| 5 | **Write** — convert IR to MCP calls for design tool | AI agent (per tool) | ❌ Serialized |

### Write Order (serialized)

1. **Tokens** — global design tokens → variables/styles in tool
2. **Styles** — style artifacts (CSS/SCSS/theme) → token references
3. **Components** — reusable components → component origins
4. **Layouts** — layout wrappers → frames/pages
5. **Pages** — full pages → assemble components into layouts

## Project State (`.ui-convert/`)

All state lives on disk — never in chat context.

```
.ui-convert/
├── project.json      # detected tech, chosen tool, timestamps
├── index.json        # artifact list, categories, dependencies, hashes
├── tokens.json       # colors, typography, spacing tokens
├── registry.json     # design-tool IDs for created artifacts
├── progress.json     # checkpoint pointer for resume
├── ir/               # one minified IR file per artifact
│   ├── btn-primary.json
│   ├── page-home.json
│   └── ...
└── logs/             # errors, skipped artifacts
```

## Design IR Format

Token-efficient, minified JSON with short keys and style references.
Two-layer format: **token table** (`tk` — colors/fonts/spacing) + **node tree** (`nd` — visual elements referencing tokens by ID).

```json
{"tk":{"c":{"c1":"#1a1a2e","c2":"#e94560"},"f":{"f1":{"fm":"Inter","sz":16,"wt":400}},"sp":{"s1":8},"sh":{},"rd":{"r1":8}},"nd":[{"t":"btn","id":"b1","n":"Submit","w":120,"h":40,"x":20,"y":60,"bg":"c2","fg":"c1","fn":"f1","txt":"Submit","p":"s1","br":{"w":0,"c":"c1","r":"r1"}}]}
```

## Skills

### Foundation

| Skill | Type | Purpose |
|-------|------|---------|
| `ui-convert-ir-schema` | Reference | Design IR specification |
| `ui-convert-state` | Reference | Disk state schemas |
| `ui-convert-tech-markers` | Reference | Technology detection heuristics |

### Core Pipeline

| Skill | Type | Purpose |
|-------|------|---------|
| `ui-convert-coordinator` | Agent | Orchestrator, stop rules, batching, resume |
| `ui-convert-mcp-validator` | Agent | Preflight MCP server check |
| `ui-convert-detector` | Scripts | Project technology detection |
| `ui-convert-scanner` | Scripts | Artifact enumeration and classification |
| `ui-convert-token-miner` | Scripts | Style token extraction |
| `ui-convert-ambiguity-resolver` | Agent | AI triage for ambiguous artifacts |

### Extractors (one per technology)

| Skill | Target |
|-------|--------|
| `ui-convert-extractor-react` | React, Next.js, Remix |
| `ui-convert-extractor-vue` | Vue, Nuxt |
| `ui-convert-extractor-angular` | Angular |
| `ui-convert-extractor-html` | Plain HTML/CSS/JS |
| `ui-convert-extractor-svelte` | Svelte, SvelteKit |
| `ui-convert-extractor-blazor` | Blazor |
| `ui-convert-extractor-razor` | ASP.NET Razor Pages/MVC |
| `ui-convert-extractor-webforms` | ASP.NET WebForms |
| `ui-convert-extractor-wpf` | WPF |
| `ui-convert-extractor-winui` | WinUI 3 |
| `ui-convert-extractor-winforms` | WinForms |
| `ui-convert-extractor-php` | Blade, Twig, vanilla PHP |
| `ui-convert-extractor-python-templates` | Jinja2, Django, Flask |
| `ui-convert-extractor-web-components` | Lit, custom elements |
| `ui-convert-extractor-flutter` | Flutter (Dart) |
| `ui-convert-extractor-react-native` | React Native |

### Writers (one per design tool)

| Skill | Target |
|-------|--------|
| `ui-convert-writer-pencil` | Pencil.dev (via MCP) |
| `ui-convert-writer-figma` | Figma (via MCP) |
| `ui-convert-writer-penpot` | Penpot (via MCP) |
| `ui-convert-writer-stitch` | Stitch (via MCP) |
| `ui-convert-writer-paper` | Paper (via MCP) |

### External Skills (referenced, not bundled)

These skills are referenced by pipeline skills but live outside this repository.  
Source: [guercheLE/my-skills](https://github.com/guercheLE/my-skills)

| Skill | Referenced By | Purpose |
|-------|--------------|--------|
| `pencil-mcp` | `ui-convert-writer-pencil` | Pencil MCP server integration, `.pen` format, batch_design operations |
| `pencil-uiux-design` | `ui-convert-writer-pencil` | UI/UX design patterns, accessibility, platform guidelines |

## Usage

> Requires AI agent environment (VS Code + GitHub Copilot, Cursor, Kiro, or similar) with MCP servers configured for the target design tool.

1. Open a project folder containing UI source code
2. Invoke the coordinator: _"convert this project to Pencil.dev"_
3. The pipeline runs: detect → scan → mine → extract → write
4. Design artifacts appear in your chosen tool
5. If interrupted, rerun — it resumes from the last checkpoint

## Architecture Principles

- **Scripts for mechanical work** — scanning, token mining, classification (Node.js + Python)
- **AI for semantic work** — "is this visual?", layout interpretation, IR extraction
- **Disk-backed state** — resumability, idempotency, parallel extraction safety
- **Serialized MCP writes** — prevents rate limits, state collisions, naming conflicts
- **IR never in chat context** — stored on disk, fed to writer one chunk at a time

## License

[GPL-3.0](LICENSE)

