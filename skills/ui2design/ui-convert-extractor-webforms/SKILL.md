---
name: ui-convert-extractor-webforms
description: >
  ASP.NET WebForms (.aspx/.ascx) to Design IR extractor for the ui2design pipeline. Converts WebForms
  pages and user controls into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is webforms and the pipeline needs to extract visual
  structure from .aspx and .ascx files.
  Handles server controls (asp:Button, asp:TextBox, asp:GridView), master pages, user controls,
  and the WebForms control hierarchy.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, webforms, aspx, ascx, dotnet, legacy]
---

# WebForms Extractor

Converts ASP.NET WebForms pages (`.aspx`) and user controls (`.ascx`) into Design IR.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<asp:Button runat="server">` | Button (`btn`) |
| `<asp:TextBox runat="server">` | Input (`inp`) |
| `<asp:Label runat="server">` | Text (`txt`) |
| `<asp:Image runat="server">` | Image (`img`) |
| `<asp:Panel runat="server">` | Frame (`fr`) |
| `<asp:GridView>` | Table (`tbl`) |
| `<asp:Repeater>` | List (`lst`) with one item |
| `<asp:ListView>` | List (`lst`) with one item |
| `<asp:ContentPlaceHolder>` | Content placeholder frame |
| Standard HTML elements | Standard IR mapping |

---

## Extraction Process

### Step 1: Parse ASPX/ASCX

```aspx
<%@ Page Title="Login" Language="C#" MasterPageFile="~/Site.Master"
    AutoEventWireup="true" CodeBehind="Login.aspx.cs" Inherits="App.Login" %>

<asp:Content ID="Content1" ContentPlaceHolderID="MainContent" runat="server">
    <div class="container">
        <h1>Sign In</h1>
        <asp:TextBox ID="txtEmail" runat="server" CssClass="form-control" placeholder="Email" />
        <asp:TextBox ID="txtPassword" runat="server" TextMode="Password" CssClass="form-control" />
        <asp:Button ID="btnLogin" runat="server" Text="Sign In" CssClass="btn btn-primary"
            OnClick="btnLogin_Click" />
    </div>
</asp:Content>
```

### Step 2: Map Server Controls

| Server Control | HTML Equivalent | IR Type |
|---------------|----------------|---------|
| `asp:Button` | `<input type="submit">` | `btn` |
| `asp:LinkButton` | `<a>` styled as button | `btn` |
| `asp:TextBox` | `<input>` | `inp` |
| `asp:TextBox TextMode="MultiLine"` | `<textarea>` | `inp` |
| `asp:Label` | `<span>` | `txt` |
| `asp:Image` | `<img>` | `img` |
| `asp:Panel` | `<div>` | `fr` |
| `asp:GridView` | `<table>` | `tbl` |
| `asp:Repeater` | Repeated items | `lst` |
| `asp:ListView` | List items | `lst` |
| `asp:DropDownList` | `<select>` | `inp` |
| `asp:CheckBox` | `<input type="checkbox">` | `inp` |
| `asp:RadioButton` | `<input type="radio">` | `inp` |
| `asp:HyperLink` | `<a>` | `txt` with `lnk` |
| `asp:Menu` | Navigation | `nav` |

### Step 3: Handle Master Pages

Master pages define the layout shell:
- `<asp:ContentPlaceHolder ID="MainContent">` → placeholder frame
- Extract master page as layout artifact
- Each `.aspx` page fills the placeholders

### Step 4: Handle User Controls

`.ascx` files → extract as components. When referenced in pages, use `ref` type.

### Step 5: Resolve Styles

- Check `CssClass` attributes on server controls
- Check `<link>` tags in master page `<head>`
- WebForms often uses Bootstrap or custom CSS

### Step 6: Write IR File

One IR per page; user controls as separate component IRs.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "webforms"`)
