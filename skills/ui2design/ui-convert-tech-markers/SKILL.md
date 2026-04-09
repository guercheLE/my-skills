---
name: ui-convert-tech-markers
description: >
  Technology detection heuristics for the ui2design pipeline. Defines file markers, directory patterns,
  config file signatures, and package dependency checks used to identify project technologies and UI frameworks.
  Use this skill whenever you need to determine what technology stack a project uses — during detection,
  scanning, or when adding support for a new technology.
  This is the reference that `ui-convert-detector` scripts use. If detection is wrong, check here first.
version: 1.0.0
author: ui2design
tags: [ui-convert, foundation, detection, heuristics, technology]
---

# Technology Detection Markers

This skill defines the heuristics for identifying project technologies and UI frameworks.
The `ui-convert-detector` skill uses these markers to populate `project.json`.

## Detection Strategy

Detection runs in priority order — first match wins:

1. **Config files** — most reliable (e.g., `next.config.js` → Next.js)
2. **Package dependencies** — from `package.json`, `pubspec.yaml`, `.csproj`, etc.
3. **File extensions** — characteristic file types (e.g., `.razor` → Blazor)
4. **Directory structure** — conventional directories (e.g., `app/` in Next.js 13+)
5. **File content patterns** — imports, decorators, pragmas

---

## Web Technologies

### React

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `react` dep | dependency | high |
| `.jsx` or `.tsx` files present | extension | high |
| `import React` or `from 'react'` in files | content | medium |
| `src/App.jsx` or `src/App.tsx` exists | structure | medium |

**Sub-variants detected via additional markers:**

#### Next.js
| Signal | Type | Confidence |
|--------|------|------------|
| `next.config.js` or `next.config.mjs` or `next.config.ts` | config | high |
| `package.json` has `next` dep | dependency | high |
| `pages/` or `app/` directory with `layout.tsx` | structure | medium |

#### Remix
| Signal | Type | Confidence |
|--------|------|------------|
| `remix.config.js` or `remix.config.ts` | config | high |
| `package.json` has `@remix-run/react` dep | dependency | high |
| `app/routes/` directory | structure | medium |

### Vue

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `vue` dep | dependency | high |
| `.vue` files present | extension | high |
| `vite.config.js` with `@vitejs/plugin-vue` | config | medium |

#### Nuxt
| Signal | Type | Confidence |
|--------|------|------------|
| `nuxt.config.js` or `nuxt.config.ts` | config | high |
| `package.json` has `nuxt` dep | dependency | high |

### Angular

| Signal | Type | Confidence |
|--------|------|------------|
| `angular.json` or `.angular-cli.json` | config | high |
| `package.json` has `@angular/core` dep | dependency | high |
| `.component.ts` files with `@Component` decorator | content | high |
| `*.component.html` template files | extension | medium |

### Svelte

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `svelte` dep | dependency | high |
| `.svelte` files present | extension | high |
| `svelte.config.js` | config | high |

#### SvelteKit
| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `@sveltejs/kit` dep | dependency | high |
| `src/routes/` directory | structure | medium |

### Plain HTML/CSS/JS

| Signal | Type | Confidence |
|--------|------|------------|
| `.html` files at root with no framework config | extension + absence | medium |
| No `package.json` or `package.json` without framework deps | absence | low |
| `index.html` with `<script>` and `<link>` tags | content | medium |

Fallback: if no framework is detected but `.html` files exist, classify as `html`.

---

## .NET Web Technologies

### Blazor

| Signal | Type | Confidence |
|--------|------|------------|
| `.razor` files with `@code` blocks | content | high |
| `.csproj` references `Microsoft.AspNetCore.Components` | dependency | high |
| `_Imports.razor` file | structure | high |
| `wwwroot/` directory | structure | medium |

### Razor Pages / MVC

| Signal | Type | Confidence |
|--------|------|------------|
| `.cshtml` files present | extension | high |
| `.csproj` references `Microsoft.AspNetCore.Mvc` | dependency | high |
| `Pages/` directory with `.cshtml` files | structure | medium |
| `Views/` directory with `.cshtml` files | structure | medium |

### ASP.NET WebForms

| Signal | Type | Confidence |
|--------|------|------------|
| `.aspx` or `.ascx` files present | extension | high |
| `.aspx.cs` or `.aspx.vb` code-behind files | extension | high |
| `Web.config` with `system.web` section | config | high |

---

## .NET Desktop Technologies

### WPF

| Signal | Type | Confidence |
|--------|------|------------|
| `.xaml` files with `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"` | content | high |
| `.csproj` with `<UseWPF>true</UseWPF>` | config | high |
| `App.xaml` + `MainWindow.xaml` | structure | high |

### WinUI 3

| Signal | Type | Confidence |
|--------|------|------------|
| `.xaml` files with `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"` + `using:Microsoft.UI.Xaml` | content | high |
| `.csproj` references `Microsoft.WindowsAppSDK` | dependency | high |
| `Package.appxmanifest` | structure | medium |

### WinForms

| Signal | Type | Confidence |
|--------|------|------------|
| `.Designer.cs` files with `InitializeComponent()` | content | high |
| `.csproj` with `<UseWindowsForms>true</UseWindowsForms>` | config | high |
| `.resx` resource files paired with `.cs` | structure | medium |

---

## Mobile Technologies

### Flutter

| Signal | Type | Confidence |
|--------|------|------------|
| `pubspec.yaml` with `flutter` dependency | dependency | high |
| `lib/` directory with `.dart` files | structure | high |
| `flutter:` section in `pubspec.yaml` | config | high |

### React Native

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `react-native` dep | dependency | high |
| `metro.config.js` or `metro.config.ts` | config | high |
| `android/` and `ios/` directories | structure | medium |
| `app.json` with `expo` key OR `package.json` has `expo` dep | config | medium |

---

## Template Engines

### PHP — Blade (Laravel)

| Signal | Type | Confidence |
|--------|------|------------|
| `.blade.php` files present | extension | high |
| `artisan` file at root | structure | high |
| `composer.json` has `laravel/framework` dep | dependency | high |

### PHP — Twig (Symfony)

| Signal | Type | Confidence |
|--------|------|------------|
| `.twig` files present | extension | high |
| `composer.json` has `symfony/framework-bundle` dep | dependency | high |
| `templates/` directory | structure | medium |

### PHP — Vanilla

| Signal | Type | Confidence |
|--------|------|------------|
| `.php` files with HTML mixed in | content | medium |
| No framework config files | absence | low |

### Python — Jinja2

| Signal | Type | Confidence |
|--------|------|------------|
| `.html` files with `{{ }}` and `{% %}` syntax | content | medium |
| `requirements.txt` or `pyproject.toml` has `jinja2` dep | dependency | high |
| `templates/` directory | structure | medium |

### Python — Django

| Signal | Type | Confidence |
|--------|------|------------|
| `manage.py` at root | structure | high |
| `settings.py` with `INSTALLED_APPS` | content | high |
| `requirements.txt` has `django` dep | dependency | high |

### Python — Flask

| Signal | Type | Confidence |
|--------|------|------------|
| `requirements.txt` or `pyproject.toml` has `flask` dep | dependency | high |
| `from flask import` in Python files | content | medium |
| `templates/` directory with `.html` files | structure | medium |

---

## Other Technologies

### Web Components / Lit

| Signal | Type | Confidence |
|--------|------|------------|
| `package.json` has `lit` dep | dependency | high |
| Files with `class extends LitElement` | content | high |
| `customElements.define(` calls | content | medium |

---

## UI Framework Detection

Detected independently of the base technology. Multiple can be present.

| Framework | Markers |
|-----------|---------|
| **Tailwind CSS** | `tailwind.config.js`, `@tailwind` directives in CSS, `class="..."` with Tailwind utility patterns |
| **Bootstrap** | `package.json` has `bootstrap`, `<link>` to bootstrap CDN, `class="btn btn-primary"` patterns |
| **MUI (Material UI)** | `package.json` has `@mui/material`, `import { Button } from '@mui/material'` |
| **Ant Design** | `package.json` has `antd`, `import { Button } from 'antd'` |
| **Chakra UI** | `package.json` has `@chakra-ui/react` |
| **Vuetify** | `package.json` has `vuetify` |
| **Angular Material** | `package.json` has `@angular/material` |
| **shadcn/ui** | `components.json` at root, `@/components/ui/` imports |
| **Radix UI** | `package.json` has `@radix-ui/*` deps |
| **Headless UI** | `package.json` has `@headlessui/react` or `@headlessui/vue` |

---

## Disambiguation Rules

When multiple technologies match:

1. **Framework over plain** — if React + HTML both match, choose React.
2. **Meta-framework over base** — if Next.js + React both match, choose Next.js.
3. **Highest confidence wins** — `high` > `medium` > `low`.
4. **Config file > dependency > extension > content > structure** — in case of tie.
5. **Log ambiguity** — if two techs match at the same confidence, record both in `project.json` and log to `errors.jsonl` for human review.

---

## Cross-references

- **Detector scripts** use these markers → see `ui-convert-detector`
- **Project output** matches `project.json` schema → see `ui-convert-state`
- **Extractor routing** maps tech → extractor skill → see `ui-convert-coordinator`
