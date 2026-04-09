---
name: ui-convert-extractor-winui
description: >
  WinUI 3 XAML to Design IR extractor for the ui2design pipeline. Converts WinUI 3 windows, pages, and
  controls into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is winui (WinUI 3 / Windows App SDK) and the pipeline
  needs to extract visual structure from .xaml files.
  Handles WinUI-specific controls (NavigationView, InfoBar, TeachingTip), Fluent Design elements,
  the Windows App SDK namespace, and differences from WPF XAML.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, winui, winui3, xaml, dotnet, desktop, windows-app-sdk]
---

# WinUI 3 Extractor

Converts WinUI 3 XAML files into Design IR. Similar to WPF but with Windows App SDK controls
and Fluent Design patterns.

## Key Differences from WPF

| Feature | WPF | WinUI 3 |
|---------|-----|---------|
| Namespace | `presentation` | `using:Microsoft.UI.Xaml` |
| Navigation | Frame/Page | NavigationView |
| Dialogs | Window | ContentDialog |
| App bar | Menu/Toolbar | CommandBar |
| Info messages | N/A | InfoBar |
| Teaching | N/A | TeachingTip |
| Resources | Same pattern | Same pattern |
| Styling | Same pattern | Fluent Design defaults |

---

## WinUI-Specific Controls

| WinUI Control | IR Type | Notes |
|--------------|---------|-------|
| `NavigationView` | `sdb` + `fr` | Sidebar nav + content |
| `CommandBar` | `hdr` | App bar |
| `InfoBar` | `crd` | Notification card |
| `ContentDialog` | `mdl` | Dialog |
| `TeachingTip` | `crd` | Tooltip/popover |
| `BreadcrumbBar` | `nav` | Breadcrumb navigation |
| `TabView` | `tab` | Tab control |
| `TreeView` | `lst` | Nested list |
| `NumberBox` | `inp` | Numeric input |
| `ColorPicker` | `inp` | Color input |
| `CalendarDatePicker` | `inp` | Date input |
| `ToggleSwitch` | `inp` | Toggle |
| `RatingControl` | `inp` | Rating input |

All standard controls (Button, TextBox, TextBlock, etc.) follow the same mapping as WPF.

---

## Extraction Process

Same as WPF extractor with these adjustments:

1. Detect WinUI via `Microsoft.WindowsAppSDK` in `.csproj` or `using:Microsoft.UI.Xaml` namespace
2. Map WinUI-specific controls to IR types (table above)
3. Handle `NavigationView`:
   - `NavigationView.MenuItems` → sidebar links
   - `NavigationView.Content` → main content area
4. Handle `CommandBar`:
   - `AppBarButton` → buttons in header
   - `CommandBar.Content` → header content
5. Apply Fluent Design defaults (rounded corners, spacing, typography)

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **WPF extractor** → `ui-convert-extractor-wpf` (shared XAML patterns)
- **Called by** → `ui-convert-coordinator` (when `tech: "winui"`)
