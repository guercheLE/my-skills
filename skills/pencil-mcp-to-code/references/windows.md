# Windows Code Generation from Pencil

## Framework choice

| Framework | When to use |
|-----------|-------------|
| **WinUI 3** | New Windows apps; modern, supports MVVM + data binding |
| **WPF** | Existing desktop apps; mature ecosystem, .NET 6+ |
| **MAUI** | Cross-platform (Windows + macOS + Android + iOS) from one codebase |
| **UWP** | Legacy; avoid for new work |

Default to WinUI 3 for new Windows-only apps. If the project already exists, detect the framework from `.csproj` / `packages.config` / project structure.

---

## Extraction step

```
batch_get([], [nodeId], { maxDepth: 10, includePathGeometry: true })
snapshot_layout()
get_variables()
get_screenshot(nodeId)   # visual reference
```

---

## Pencil → XAML (WinUI 3 / WPF shared syntax)

Both WinUI 3 and WPF use XAML. Most layout and styling concepts are identical; differences are noted where they diverge.

### Layout containers

| Pencil `layoutMode` | XAML equivalent |
|---------------------|----------------|
| `"horizontal"` | `<StackPanel Orientation="Horizontal">` |
| `"vertical"` | `<StackPanel Orientation="Vertical">` |
| Flex with equal distribution | `<Grid>` with `*` column/row definitions |
| Overlay / free positioning | `<Canvas>` or `<Grid>` with overlapping children |
| Scroll | `<ScrollViewer>` wrapping a `StackPanel` or `Grid` |

For multi-column/row layouts prefer `<Grid>`:
```xml
<Grid>
    <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*" />
        <ColumnDefinition Width="*" />
    </Grid.ColumnDefinitions>
    <TextBlock Grid.Column="0" Text="Left" />
    <TextBlock Grid.Column="1" Text="Right" />
</Grid>
```

### Sizing

| Pencil sizing | XAML |
|---------------|------|
| `fill_container` | `Width="*"` in Grid, or `HorizontalAlignment="Stretch"` |
| `fit_content` | `Width="Auto"` / `HorizontalAlignment="Auto"` |
| Fixed | `Width="200"` (device-independent pixels) |

XAML uses **device-independent pixels (DIPs)** — equivalent to Pencil's logical pixel values at 1× density.

### Spacing and appearance

```xml
<Border
    CornerRadius="12"
    Background="{StaticResource PrimaryBrush}"
    Padding="16,12,16,12">
    <StackPanel Spacing="8">
        ...
    </StackPanel>
</Border>
```

- **Padding**: `"left,top,right,bottom"` or `"uniform"` or `"horizontal,vertical"`
- **Margin**: same syntax, applied to elements for outer spacing
- **Spacing** (WinUI 3 `StackPanel.Spacing`): maps directly from Pencil `itemSpacing`
- **CornerRadius**: `"12"` for uniform, `"8,8,0,0"` for per-corner

### Colors and design tokens

Define colors as resources in `App.xaml` or a `ResourceDictionary`:

```xml
<!-- WinUI 3 -->
<Application.Resources>
    <ResourceDictionary>
        <Color x:Key="PrimaryColor">#3B82F6</Color>
        <SolidColorBrush x:Key="PrimaryBrush" Color="{StaticResource PrimaryColor}" />
    </ResourceDictionary>
</Application.Resources>
```

Map Pencil `get_variables()` token names to resource keys. Consume via `{StaticResource PrimaryBrush}` throughout.

WinUI 3 integrates with the system accent color — prefer `{ThemeResource SystemAccentColor}` for brand-aligned interactive elements.

### Typography

```xml
<TextBlock
    Text="Headline"
    FontFamily="/Assets/Fonts/Inter-SemiBold.ttf#Inter"
    FontSize="20"
    FontWeight="SemiBold"
    Foreground="{StaticResource PrimaryBrush}"
    LineHeight="28" />
```

Font file placement: `Assets/Fonts/*.ttf`. Register in the `.csproj` as `<Content Include="Assets/Fonts/Inter-SemiBold.ttf" />`.

WinUI 3 also supports variable fonts and `FontFamily` attribute from resource dictionary.

### Images and icons

- **Raster images**: `<Image Source="Assets/Images/photo.png" />`
- **WinUI 3 icons**: `<FontIcon Glyph="&#xE700;" FontFamily="Segoe Fluent Icons" />`
- **Custom SVG paths**: convert Pencil `geometry` to XAML `<Path>`:

```xml
<Path
    Data="M0,0 L24,0 L24,24 Z"
    Fill="{StaticResource PrimaryBrush}"
    Width="24" Height="24"
    Stretch="Uniform" />
```

To convert SVG `d` path data from Pencil to XAML: the `Data` attribute accepts standard SVG path syntax, so you can paste the `geometry` value directly.

### MVVM data binding (recommended)

```xml
<!-- View (XAML) -->
<TextBlock Text="{x:Bind ViewModel.UserName, Mode=OneWay}" />
<Button Command="{x:Bind ViewModel.SaveCommand}" Content="Save" />
```

```csharp
// ViewModel
public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private string userName = "";

    [RelayCommand]
    private void Save() { ... }
}
```

Use `CommunityToolkit.Mvvm` NuGet package for `ObservableObject`, `[ObservableProperty]`, and `[RelayCommand]`.

### Complete WinUI 3 / WPF example

```xml
<Border CornerRadius="12" Padding="16">
    <Border.Background>
        <SolidColorBrush Color="#FFFFFF" />
    </Border.Background>
    <StackPanel Spacing="8">
        <TextBlock
            Text="Card Title"
            FontFamily="/Assets/Fonts/Inter-SemiBold.ttf#Inter"
            FontSize="16"
            FontWeight="SemiBold"
            Foreground="{StaticResource PrimaryBrush}" />
        <TextBlock
            Text="Subtitle text goes here"
            FontSize="14"
            Foreground="{StaticResource SecondaryBrush}" />
    </StackPanel>
</Border>
```

---

## .NET MAUI (cross-platform)

MAUI uses XAML with a shared abstraction layer. Key differences from WinUI 3 / WPF:

```xml
<!-- MAUI uses Microsoft.Maui namespace, not Windows.UI.Xaml -->
<VerticalStackLayout Spacing="8" Padding="16">
    <Label Text="Title" FontFamily="Inter-SemiBold" FontSize="16" />
    <Label Text="Subtitle" FontSize="14" TextColor="{StaticResource Secondary}" />
</VerticalStackLayout>
```

Register fonts in `MauiProgram.cs`:
```csharp
builder.ConfigureFonts(fonts => {
    fonts.AddFont("Inter-Regular.ttf", "Inter");
    fonts.AddFont("Inter-SemiBold.ttf", "Inter-SemiBold");
});
```

---

## Validation checklist

- [ ] Colors defined in `ResourceDictionary`, referenced via `{StaticResource}` — not hardcoded
- [ ] Fonts in `Assets/Fonts/` and registered in `.csproj`
- [ ] Fixed sizes use DIPs (same as Pencil logical pixels at 1×)
- [ ] `fill_container` → `HorizontalAlignment="Stretch"` or `Width="*"` in Grid
- [ ] `fit_content` → `Width="Auto"`
- [ ] `CornerRadius` applied via `<Border>` or directly on supported controls
- [ ] MVVM: UI state via data binding, not code-behind where possible
- [ ] Compare `get_screenshot` to running app for visual parity
