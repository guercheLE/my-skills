---
name: ui-convert-extractor-web-components
description: >
  Web Components (Lit, custom elements) to Design IR extractor for the ui2design pipeline. Converts
  Lit elements and vanilla custom elements into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is lit or web-components and the pipeline needs to extract
  visual structure from custom element definitions.
  Handles Lit's html template literal, CSS template literal, reactive properties, shadow DOM,
  slots, and vanilla customElements.define() patterns.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, web-components, lit, custom-elements, shadow-dom]
---

# Web Components Extractor

Converts Web Components (Lit elements, vanilla custom elements) into Design IR.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `html\`<div>...\`` (Lit template) | Node tree |
| `<slot>` | Content placeholder |
| CSS in `static styles` | Token mapping |
| `customElements.define('my-el', ...)` | Component |
| Shadow DOM structure | Node hierarchy |

---

## Lit Extraction

### Component Structure

```javascript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-button')
class MyButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      background: var(--primary, #6366f1);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      cursor: pointer;
    }
  `;

  @property() label = 'Click me';
  @property() variant = 'primary';

  render() {
    return html`
      <button class="${this.variant}">
        <slot>${this.label}</slot>
      </button>
    `;
  }
}
```

### Extraction Steps

1. **Parse `render()` method** → extract the `html` tagged template literal
2. **Parse `static styles`** → extract the `css` tagged template literal
3. **Map properties** → understand component interface (props = potential overrides)
4. **Handle `<slot>`** → mark as content placeholder in IR
5. **Resolve CSS custom properties** → map `var(--name)` to tokens

### Lit-Specific Patterns

| Pattern | Extraction Rule |
|---------|----------------|
| `html\`...\`` | Parse as HTML template |
| `css\`...\`` | Parse as CSS |
| `${this.prop}` | Text placeholder |
| `?attr=${bool}` | Ignore boolean binding |
| `.prop=${val}` | Ignore property binding |
| `@event=${handler}` | Ignore event binding |
| `<slot>` | Content placeholder |
| `<slot name="header">` | Named placeholder |
| `${repeat(items, ...)}` | One iteration |
| `${when(cond, ...)}` | Truthy branch |

---

## Vanilla Custom Elements

```javascript
class MyCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .card-title { font-size: 18px; font-weight: 600; }
      </style>
      <div class="card">
        <h2 class="card-title"><slot name="title"></slot></h2>
        <div class="card-body"><slot></slot></div>
      </div>
    `;
  }
}
customElements.define('my-card', MyCard);
```

Extract from `shadow.innerHTML` or `this.shadowRoot.innerHTML`. Parse embedded HTML and CSS.

---

## Shadow DOM Considerations

- Styles in shadow DOM are scoped — extract them per-component
- `:host` selector → maps to the component's own styles
- `::slotted()` selector → styles for slotted content (note but don't extract)
- CSS custom properties (declared with `--`) → cross shadow boundary, map to tokens

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "lit"` or `"web-components"`)
