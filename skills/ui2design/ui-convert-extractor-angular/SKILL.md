---
name: ui-convert-extractor-angular
description: >
  Angular template and component to Design IR extractor for the ui2design pipeline. Converts Angular
  components (@Component decorator with template/templateUrl) into the Design IR format.
  Use this skill when the detected technology is angular and the pipeline needs to extract visual structure
  from Angular component files into IR JSON files.
  Handles standalone components, modules, Angular Material, template syntax (ngIf, ngFor, ngSwitch),
  two-way binding, and component composition.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, angular, template, component]
---

# Angular Extractor

Converts Angular components into Design IR. Reads both inline and external templates,
resolves component styles, and maps Angular-specific patterns to IR nodes.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<div>...</div>` | Frame node (`fr`) |
| `<button (click)="...">Submit</button>` | Button node (`btn`) |
| `<input [(ngModel)]="..." />` | Input node (`inp`) |
| `<img [src]="..." />` | Image node (`img`) |
| `<mat-card>` (Angular Material) | Card node (`crd`) |
| `<mat-dialog>` | Modal node (`mdl`) |
| `<mat-tab-group>` | Tab node (`tab`) |
| `<router-outlet>` | Placeholder frame |
| `*ngIf="condition"` | Primary branch only |
| `*ngFor="let item of items"` | One iteration |

---

## Extraction Process

### Step 1: Parse Component Metadata

Read the `@Component` decorator:

```typescript
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',  // or inline template
  styleUrls: ['./login.component.scss'],  // or inline styles
  standalone: true,
  imports: [MatButtonModule, MatInputModule]
})
```

- Load the template (inline or from `templateUrl`)
- Load styles (inline or from `styleUrls`)
- Note imported modules (especially Material modules)

### Step 2: Parse Template

Angular templates use HTML with directives:

```html
<div class="login-container">
  <h1>Sign In</h1>
  <form (ngSubmit)="onSubmit()">
    <mat-form-field>
      <mat-label>Email</mat-label>
      <input matInput [(ngModel)]="email">
    </mat-form-field>
    <button mat-raised-button color="primary">Sign In</button>
  </form>
</div>
```

Map HTML elements + Angular directives to IR nodes. Ignore event bindings,
two-way bindings, and template variables — extract only the visual structure.

### Step 3: Resolve Styles

Angular supports multiple style sources:

#### Component Styles (CSS/SCSS)
```scss
// login.component.scss
.login-container {
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
}
```

Match CSS selectors to template elements. Map declarations to IR properties.

#### Angular Material Theming
```scss
@use '@angular/material' as mat;
$primary: mat.define-palette(mat.$indigo-palette);
```

When Material is detected, use Material's default component dimensions and spacing
as base values, overridden by any explicit styles.

### Step 4: Handle Angular Material Components

Map Material components to IR equivalents:

| Angular Material | IR Type | Default Sizing |
|-----------------|---------|----------------|
| `mat-button`, `mat-raised-button` | `btn` | h: 36 |
| `mat-form-field` + `matInput` | `inp` | h: 56 (with label) |
| `mat-card` | `crd` | padding: 16 |
| `mat-dialog` | `mdl` | w: 400 |
| `mat-tab-group` | `tab` | — |
| `mat-toolbar` | `hdr` | h: 64 |
| `mat-sidenav` | `sdb` | w: 256 |
| `mat-table` | `tbl` | — |
| `mat-list` | `lst` | — |
| `mat-accordion` | `acc` | — |

### Step 5: Handle Template Directives

| Directive | Extraction Rule |
|-----------|----------------|
| `*ngIf="condition"` | Extract the truthy branch |
| `*ngIf="cond; else elseBlock"` | Extract truthy branch, note else branch |
| `*ngFor="let item of items"` | Extract one iteration as list item |
| `*ngSwitch` | Extract first `*ngSwitchCase` |
| `[ngClass]="..."` | Resolve to static classes where possible |
| `[ngStyle]="..."` | Resolve to static styles where possible |
| `<ng-content>` | Mark as slot/placeholder in IR |
| `<ng-template>` | Extract content if referenced |

### Step 6: Write IR File

One IR file per component/page. Follow `ui-convert-ir-schema` format:
- Reference global tokens from `tokens.json`
- Use component deduplication for shared components
- Preserve parent-child hierarchy from template nesting

---

## Edge Cases

- **Lazy-loaded routes** → extract components normally, ignore routing config
- **Dynamic components** (`ComponentFactoryResolver`) → skip, log as unsupported
- **ViewChild/ContentChild** → extract referenced template content
- **Pipes** (`{{ value | date }}`) → extract display text as placeholder
- **Animations** → ignore, extract static state only

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Input** → `index.json` artifacts with `category: component|page|layout`
- **Output** → `.ui-convert/ir/*.json`
- **Called by** → `ui-convert-coordinator` (when `tech: "angular"`)
