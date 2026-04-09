---
name: ui-convert-extractor-blazor
description: >
  Blazor (.razor) to Design IR extractor for the ui2design pipeline. Converts Blazor components with
  @code blocks into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is blazor and the pipeline needs to extract visual structure
  from .razor files into IR JSON files.
  Handles Razor syntax (@if, @foreach), component parameters, cascading values, render fragments,
  and popular Blazor UI libraries (MudBlazor, Radzen, Syncfusion).
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, blazor, razor, dotnet, csharp]
---

# Blazor Extractor

Converts Blazor components (`.razor` files with `@code` blocks) into Design IR.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| HTML markup in `.razor` | Node tree |
| `<div class="...">` | Frame node (`fr`) |
| `<button @onclick="...">` | Button node (`btn`) |
| `<InputText @bind-Value="..." />` | Input node (`inp`) |
| `@if (condition) { }` | Primary branch |
| `@foreach (var item in items) { }` | One iteration |
| `<MudButton>` (MudBlazor) | Button node (`btn`) |
| `<MudCard>` | Card node (`crd`) |
| `<RenderFragment>` | Content placeholder |

---

## Extraction Process

### Step 1: Parse Razor Markup

Blazor `.razor` files mix HTML with C# directives:

```razor
@page "/login"

<div class="login-container">
    <h1>Sign In</h1>
    <EditForm Model="loginModel" OnValidSubmit="HandleLogin">
        <InputText @bind-Value="loginModel.Email" placeholder="Email" class="form-control" />
        <InputText @bind-Value="loginModel.Password" type="password" class="form-control" />
        <button type="submit" class="btn btn-primary">Sign In</button>
    </EditForm>
</div>

@code {
    private LoginModel loginModel = new();
    private async Task HandleLogin() { /* ... */ }
}
```

Extract HTML markup. Ignore `@code` block except for understanding component structure.

### Step 2: Handle Razor Directives

| Directive | Extraction Rule |
|-----------|----------------|
| `@if (cond) { }` | Extract truthy branch |
| `@else if` / `@else` | Note alternatives |
| `@foreach (var x in items) { }` | One iteration |
| `@switch (expr) { }` | First case |
| `@for (int i = 0; ...) { }` | One iteration |
| `@bind-Value="..."` | Ignore binding, extract element |
| `@onclick="..."` | Ignore event handler |
| `@page "/path"` | Note as page route |

### Step 3: Handle Blazor UI Libraries

#### MudBlazor

| MudBlazor Component | IR Type |
|--------------------|---------|
| `<MudButton>` | `btn` |
| `<MudTextField>` | `inp` |
| `<MudCard>` | `crd` |
| `<MudDialog>` | `mdl` |
| `<MudTabs>` | `tab` |
| `<MudAppBar>` | `hdr` |
| `<MudDrawer>` | `sdb` |
| `<MudTable>` | `tbl` |
| `<MudList>` | `lst` |
| `<MudExpansionPanels>` | `acc` |

#### Radzen, Syncfusion
Similar mapping — map library components to IR node types.

### Step 4: Resolve Styles

Blazor uses CSS isolation (`.razor.css` files) or global CSS:

```css
/* Login.razor.css (isolated) */
.login-container { display: flex; flex-direction: column; max-width: 400px; }
```

Match isolated CSS selectors to component markup.

### Step 5: Write IR File

One IR per `.razor` component. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "blazor"`)
