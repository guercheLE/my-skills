---
name: ui-convert-extractor-svelte
description: >
  Svelte/SvelteKit to Design IR extractor for the ui2design pipeline. Converts .svelte components into
  the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is svelte or sveltekit and the pipeline needs to extract
  visual structure from .svelte files into IR JSON files.
  Handles Svelte template syntax ({#if}, {#each}), scoped styles, reactive declarations, slot content,
  and SvelteKit routing conventions (+page.svelte, +layout.svelte).
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, svelte, sveltekit]
---

# Svelte Extractor

Converts Svelte components (`.svelte` files) into Design IR. Handles both Svelte and SvelteKit.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| HTML markup in `.svelte` | Node tree |
| `<div class="...">` | Frame node (`fr`) |
| `<button on:click={...}>` | Button node (`btn`) |
| `{#if condition}` | Primary branch only |
| `{#each items as item}` | One iteration |
| `<slot>` | Placeholder/content area |
| `<svelte:component>` | Dynamic component (extract default) |

---

## Extraction Process

### Step 1: Parse Svelte Component

Svelte files combine markup, script, and style in a single file:

```svelte
<script>
  export let title = 'Hello';
  let count = 0;
</script>

<div class="container">
  <h1>{title}</h1>
  <button on:click={() => count++}>Count: {count}</button>
</div>

<style>
  .container { display: flex; flex-direction: column; padding: 24px; }
</style>
```

Extract from markup section. Ignore `<script>` except for prop definitions
(to understand component interface) and imports (to detect libraries).

### Step 2: Handle Template Blocks

| Block | Extraction Rule |
|-------|----------------|
| `{#if cond}...{/if}` | Extract truthy branch |
| `{#if cond}...{:else}...{/if}` | Extract truthy branch, note else |
| `{#each items as item}...{/each}` | One iteration as list item |
| `{#await promise}...{/await}` | Extract resolved state |
| `{@html rawHtml}` | Skip (raw HTML injection) |
| `{@const x = ...}` | Ignore (template-local binding) |

### Step 3: Resolve Scoped Styles

Svelte scopes styles to the component by default:

```svelte
<style>
  .btn { background: var(--primary); padding: 8px 16px; border-radius: 6px; }
</style>
```

Match selectors to markup elements, map to IR tokens.

### Step 4: SvelteKit Conventions

| File | Classification |
|------|---------------|
| `+page.svelte` | Page (`pg` node type) |
| `+layout.svelte` | Layout |
| `+error.svelte` | Component (error UI) |
| `+loading.svelte` | Component (loading UI) |
| Components in `lib/` or `components/` | Component |

### Step 5: Write IR File

One IR per `.svelte` file. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "svelte"` or `"sveltekit"`)
