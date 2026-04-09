---
name: ui-convert-extractor-wpf
description: >
  WPF XAML to Design IR extractor for the ui2design pipeline. Converts WPF windows, pages, and user
  controls into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is wpf and the pipeline needs to extract visual structure
  from .xaml files with the WPF presentation namespace.
  Handles panels (Grid, StackPanel, DockPanel, WrapPanel), controls, styles, templates, resource
  dictionaries, data templates, triggers, and MVVM patterns.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, wpf, xaml, dotnet, desktop]
---

# WPF Extractor

Converts WPF XAML files into Design IR. Handles the rich WPF control and layout system.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<Grid>` | Frame (`fr`) |
| `<StackPanel>` | Frame (`fr`) with direction |
| `<DockPanel>` | Frame (`fr`) |
| `<WrapPanel>` | Frame (`fr`) |
| `<Button>` | Button (`btn`) |
| `<TextBox>` | Input (`inp`) |
| `<TextBlock>` | Text (`txt`) |
| `<Label>` | Text (`txt`) |
| `<Image>` | Image (`img`) |
| `<ListBox>` / `<ListView>` | List (`lst`) |
| `<DataGrid>` | Table (`tbl`) |
| `<TabControl>` | Tab (`tab`) |
| `<Expander>` | Accordion item |
| `<Border>` | Frame (`fr`) with border |
| `<ScrollViewer>` | Transparent (extract children) |
| `<UserControl>` | Component |

---

## Extraction Process

### Step 1: Parse XAML

```xml
<Window x:Class="App.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="Login" Height="400" Width="350">
    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <TextBlock Text="Sign In" FontSize="24" FontWeight="Bold" Grid.Row="0"/>
        <TextBox PlaceholderText="Email" Grid.Row="1" Margin="0,8"/>
        <PasswordBox Grid.Row="2" Margin="0,8"/>
        <Button Content="Sign In" Grid.Row="3" Background="#6366F1"
                Foreground="White" Padding="16,8"/>
    </Grid>
</Window>
```

### Step 2: Map Layout Panels

| WPF Panel | IR Mapping |
|-----------|-----------|
| `StackPanel Orientation="Vertical"` | `d: "v"` |
| `StackPanel Orientation="Horizontal"` | `d: "h"` |
| `Grid` | `fr` — compute child positions from Row/Column definitions |
| `DockPanel` | `fr` with positioned children |
| `WrapPanel` | `fr` with wrapping (approximate with `d: "h"`) |
| `Canvas` | `fr` with absolute-positioned children |
| `UniformGrid` | `fr` (grid-like) |

#### Grid Layout Conversion

WPF Grid uses RowDefinitions/ColumnDefinitions. Convert to IR by:
1. Calculate actual row heights and column widths
2. Place children at computed x/y positions
3. For `Auto` sizes, estimate from content
4. For `Star` sizes, calculate proportional distribution

### Step 3: Map Controls to IR

| WPF Control | IR Type | Notes |
|------------|---------|-------|
| `Button` | `btn` | `Content` → `txt` |
| `TextBox` | `inp` | |
| `PasswordBox` | `inp` | |
| `ComboBox` | `inp` | |
| `TextBlock` | `txt` | |
| `Label` | `txt` | `Content` |
| `Image` | `img` | `Source` |
| `CheckBox` | `inp` | |
| `RadioButton` | `inp` | |
| `Slider` | `inp` | |
| `ProgressBar` | `fr` | Styled container |
| `ListBox` / `ListView` | `lst` | |
| `DataGrid` | `tbl` | |
| `TabControl` | `tab` | |
| `Menu` | `nav` | |
| `ToolBar` | `hdr` | |
| `StatusBar` | `ftr` | |
| `TreeView` | `lst` | Nested list |

### Step 4: Resolve Styles and Resources

```xml
<Window.Resources>
    <SolidColorBrush x:Key="PrimaryBrush" Color="#6366F1"/>
    <Style TargetType="Button">
        <Setter Property="Background" Value="{StaticResource PrimaryBrush}"/>
        <Setter Property="Padding" Value="16,8"/>
    </Style>
</Window.Resources>
```

- Resolve `StaticResource` and `DynamicResource` references
- Chase resource dictionary merges (`MergedDictionaries`)
- Apply implicit styles (by `TargetType`)
- Map to IR token references

### Step 5: Handle UserControls

`UserControl` → extract as component. When used in other views, create `ref` type.

### Step 6: Write IR File

One IR per Window/Page/UserControl. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "wpf"`)
