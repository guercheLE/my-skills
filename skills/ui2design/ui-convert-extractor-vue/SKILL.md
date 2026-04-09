---
name: ui-convert-extractor-vue
description: >
  Vue SFC (Single File Component) to Design IR extractor for the ui2design pipeline. Converts Vue components
  (including Nuxt variants) into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is vue or nuxt and the pipeline needs to extract visual structure
  from .vue files into IR JSON files.
  Handles Options API, Composition API, script setup, scoped styles, Vuetify/Quasar/PrimeVue component
  libraries, and Vue template directives (v-if, v-for, v-show).
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, vue, nuxt, sfc]
---

# Vue Extractor

Converts Vue Single File Components (SFCs) into Design IR. Handles Vue 2/3 and Nuxt projects.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<template>` content | Node tree |
| `<div class="...">` | Frame node (`fr`) with mapped styles |
| `<button @click="...">` | Button node (`btn`) |
| `<input v-model="..." />` | Input node (`inp`) |
| `<img :src="..." />` | Image node (`img`) |
| `v-if="condition"` | Primary branch only |
| `v-for="item in items"` | One iteration |
| `<slot>` | Placeholder / content area |
| Vuetify `<v-btn>`, `<v-card>` | Mapped to IR types |

---

## Extraction Process

### Step 1: Parse SFC Structure

Vue SFCs have three sections:

```vue
<template>
  <!-- Visual structure — THIS IS WHAT WE EXTRACT -->
</template>

<script setup lang="ts">
  // Logic — IGNORED (except imports)
</script>

<style scoped>
  /* Styles — EXTRACTED for token mapping */
</style>
```

Focus on `<template>` for structure, `<style>` for token mapping. From `<script>`, only
read imports (to detect component library usage) and props (for component interface).

### Step 2: Parse Template

```html
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <form @submit.prevent="handleSubmit">
      <input v-model="email" placeholder="Email" class="input-field" />
      <button type="submit" class="btn-primary">Sign In</button>
    </form>
  </div>
</template>
```

Map HTML elements to IR nodes. Vue template expressions (`{{ }}`) become text placeholders.

### Step 3: Resolve Styles

#### Scoped Styles
```vue
<style scoped>
.container {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
  max-width: 400px;
}
.btn-primary {
  background: var(--primary);
  color: white;
  border-radius: 6px;
}
</style>
```

Match scoped CSS selectors to template elements. Map to IR tokens.

#### Tailwind in Vue
```html
<div class="flex flex-col p-6 gap-4 max-w-md">
```
Same Tailwind mapping as React extractor — map utility classes to token refs.

### Step 4: Handle UI Libraries

#### Vuetify
```vue
<v-card>
  <v-card-title>Login</v-card-title>
  <v-card-text>
    <v-text-field label="Email" v-model="email" />
    <v-btn color="primary" @click="submit">Sign In</v-btn>
  </v-card-text>
</v-card>
```

| Vuetify Component | IR Type |
|------------------|---------|
| `v-btn` | `btn` |
| `v-text-field` | `inp` |
| `v-card` | `crd` |
| `v-dialog` | `mdl` |
| `v-tabs` | `tab` |
| `v-app-bar` | `hdr` |
| `v-navigation-drawer` | `sdb` |
| `v-data-table` | `tbl` |
| `v-list` | `lst` |
| `v-expansion-panels` | `acc` |

#### PrimeVue / Quasar
Similar mapping strategy — map library components to IR node types using
default component dimensions as baseline.

### Step 5: Handle Template Directives

| Directive | Extraction Rule |
|-----------|----------------|
| `v-if="condition"` | Extract truthy branch |
| `v-else-if` / `v-else` | Note as alternative, extract primary |
| `v-for="item in items"` | One iteration as list item |
| `v-show="condition"` | Extract element (it's always rendered) |
| `v-bind:class` / `:class` | Resolve static classes where possible |
| `v-bind:style` / `:style` | Resolve static styles where possible |
| `<slot>` | Mark as placeholder in IR |
| `<slot name="header">` | Named placeholder |
| `<component :is="...">` | Extract default/first component |
| `<Teleport to="...">` | Extract content as separate node tree |

### Step 6: Nuxt-Specific Handling

- `pages/*.vue` → extract as page (`pg` node type)
- `layouts/*.vue` → extract as layout
- `components/*.vue` → extract as component
- `<NuxtLink>` → text/button with `lnk` property
- `<NuxtPage>` / `<NuxtLayout>` → placeholder frame
- `app.vue` → root layout

### Step 7: Write IR File

One IR file per SFC. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Input** → `index.json` artifacts with `category: component|page|layout`
- **Output** → `.ui-convert/ir/*.json`
- **Called by** → `ui-convert-coordinator` (when `tech: "vue"` or `"nuxt"`)
