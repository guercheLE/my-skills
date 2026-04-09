---
name: ui-convert-extractor-razor
description: >
  ASP.NET Core Razor Pages/MVC (.cshtml) to Design IR extractor for the ui2design pipeline. Converts
  Razor views and pages into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is razor (ASP.NET Razor Pages or MVC) and the pipeline
  needs to extract visual structure from .cshtml files.
  Handles Razor syntax (@if, @foreach, @model), tag helpers, partial views, layout pages, and sections.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, razor, cshtml, aspnet, dotnet, mvc]
---

# Razor Pages/MVC Extractor

Converts ASP.NET Core Razor Pages and MVC views (`.cshtml`) into Design IR.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| HTML in `.cshtml` | Node tree |
| `<div class="...">` | Frame (`fr`) |
| `<form asp-action="...">` | Frame (`fr`) |
| `<input asp-for="..." />` | Input (`inp`) |
| Tag helpers (`<a asp-page="...">`) | Button/text with link |
| `@if (condition) { }` | Primary branch |
| `@foreach (var item in Model.Items) { }` | One iteration |
| `@RenderSection("Scripts")` | Ignored (non-visual) |
| `@RenderBody()` | Content placeholder frame |
| Partial views (`<partial name="..." />`) | Inline the partial content |

---

## Extraction Process

### Step 1: Parse Razor View

```cshtml
@page
@model LoginModel

<div class="container">
    <h1>Sign In</h1>
    <form method="post">
        <div class="form-group">
            <label asp-for="Input.Email"></label>
            <input asp-for="Input.Email" class="form-control" />
        </div>
        <button type="submit" class="btn btn-primary">Sign In</button>
    </form>
</div>
```

Extract HTML structure. Ignore `@model`, `@page`, `@using` directives.
Tag helpers (`asp-for`, `asp-action`, etc.) → ignore, treat as standard HTML elements.

### Step 2: Handle Layouts

Razor pages use `_Layout.cshtml`:
- Extract layout as a layout artifact
- `@RenderBody()` → placeholder frame for page content
- `@RenderSection("name")` → ignore if non-visual, placeholder if visual

### Step 3: Handle Partial Views

`<partial name="_LoginPartial" />` → find `_LoginPartial.cshtml`, inline its content.

### Step 4: Resolve Styles

Typically uses Bootstrap, Tailwind, or custom CSS:
- Check `wwwroot/css/` for stylesheets
- Check `<link>` tags in `_Layout.cshtml`
- Map CSS classes to IR tokens

### Step 5: Write IR File

One IR per `.cshtml` page/view. Partial views are inlined, not separate.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "razor"`)
