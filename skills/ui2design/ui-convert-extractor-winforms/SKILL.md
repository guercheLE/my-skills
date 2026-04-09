---
name: ui-convert-extractor-winforms
description: >
  Windows Forms (.Designer.cs) to Design IR extractor for the ui2design pipeline. Converts WinForms
  designer-generated code into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is winforms and the pipeline needs to extract visual
  structure from .Designer.cs files and their associated .resx resource files.
  Handles the InitializeComponent() pattern, absolute positioning, anchoring/docking hints, control
  hierarchies, and common WinForms controls.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, winforms, designer, dotnet, desktop, csharp]
---

# WinForms Extractor

Converts Windows Forms designer code (`.Designer.cs`) into Design IR. WinForms uses absolute
positioning and imperative control creation, making it unique among extraction targets.

## What This Extracts

WinForms stores UI in `InitializeComponent()` methods:

```csharp
private void InitializeComponent()
{
    this.btnLogin = new System.Windows.Forms.Button();
    this.txtEmail = new System.Windows.Forms.TextBox();
    this.lblTitle = new System.Windows.Forms.Label();

    // btnLogin
    this.btnLogin.Location = new System.Drawing.Point(120, 200);
    this.btnLogin.Size = new System.Drawing.Size(120, 36);
    this.btnLogin.Text = "Sign In";
    this.btnLogin.BackColor = System.Drawing.Color.FromArgb(99, 102, 241);
    this.btnLogin.ForeColor = System.Drawing.Color.White;
    this.btnLogin.FlatStyle = System.Windows.Forms.FlatStyle.Flat;

    // txtEmail
    this.txtEmail.Location = new System.Drawing.Point(50, 100);
    this.txtEmail.Size = new System.Drawing.Size(260, 30);
    this.txtEmail.PlaceholderText = "Email";

    // lblTitle
    this.lblTitle.Location = new System.Drawing.Point(50, 30);
    this.lblTitle.Font = new System.Drawing.Font("Segoe UI", 24F, FontStyle.Bold);
    this.lblTitle.Text = "Sign In";

    this.Controls.Add(this.btnLogin);
    this.Controls.Add(this.txtEmail);
    this.Controls.Add(this.lblTitle);
}
```

---

## Extraction Process

### Step 1: Parse Designer Code

Parse the C# designer file to extract:
- Control declarations and types
- Property assignments (Location, Size, Text, BackColor, etc.)
- Control hierarchy (`Controls.Add()`, `panel.Controls.Add()`)

### Step 2: Map Controls to IR

| WinForms Control | IR Type |
|-----------------|---------|
| `Button` | `btn` |
| `TextBox` | `inp` |
| `RichTextBox` | `inp` |
| `Label` | `txt` |
| `PictureBox` | `img` |
| `Panel` | `fr` |
| `GroupBox` | `fr` (with border and title) |
| `FlowLayoutPanel` | `fr` with `d: "h"` or `d: "v"` |
| `TableLayoutPanel` | `fr` (grid) |
| `TabControl` | `tab` |
| `SplitContainer` | `fr` with two children |
| `ListView` | `lst` |
| `DataGridView` | `tbl` |
| `TreeView` | `lst` (nested) |
| `MenuStrip` | `nav` (or `hdr`) |
| `ToolStrip` | `hdr` |
| `StatusStrip` | `ftr` |
| `ComboBox` | `inp` |
| `CheckBox` | `inp` |
| `RadioButton` | `inp` |
| `NumericUpDown` | `inp` |
| `DateTimePicker` | `inp` |
| `ProgressBar` | `fr` |

### Step 3: Map Properties

| WinForms Property | IR Key |
|------------------|--------|
| `Location.X` | `x` |
| `Location.Y` | `y` |
| `Size.Width` | `w` |
| `Size.Height` | `h` |
| `Text` | `txt` |
| `BackColor` | `bg` (create token) |
| `ForeColor` | `fg` (create token) |
| `Font.Name` | `fn` family |
| `Font.Size` | `fn` size |
| `Font.Bold` | `fn` weight |
| `Visible` | `vs` |
| `Padding` | `p` |
| `Margin` | Spacing between siblings |

### Step 4: Reconstruct Hierarchy

WinForms uses `Controls.Add()` for parent-child relationships:
```csharp
this.panel1.Controls.Add(this.btnLogin);
this.panel1.Controls.Add(this.txtEmail);
this.Controls.Add(this.panel1);
```
→ `panel1` is parent of `btnLogin` and `txtEmail`.

### Step 5: Handle Absolute Positioning

WinForms uses absolute `Location` coordinates. Convert to IR:
- Keep `x` and `y` for each element
- For containers with `FlowLayoutPanel`, infer direction
- For `TableLayoutPanel`, compute grid positions
- `Dock` and `Anchor` properties → hint at layout intent

### Step 6: Write IR File

One IR per Form/UserControl. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "winforms"`)
