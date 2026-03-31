# Android Code Generation from Pencil

Pencil has no native Android export, so you extract design data yourself and translate it to Android code.

## Framework choice

Ask the user (or detect from the codebase):
- **Jetpack Compose** — modern, recommended for new projects (Kotlin)
- **XML layouts** — legacy but still in use (Java or Kotlin)

Default to Jetpack Compose for new work unless the project uses XML.

---

## Extraction step

```
batch_get([], [nodeId], { maxDepth: 10, includePathGeometry: true })
snapshot_layout()
get_variables()
get_screenshot(nodeId)   # keep open as visual reference
```

---

## Pencil → Jetpack Compose

### Layout containers

| Pencil `layoutMode` | Compose equivalent |
|---------------------|-------------------|
| `"horizontal"` | `Row { }` |
| `"vertical"` | `Column { }` |
| No layout (free) | `Box { }` |

### Sizing modifiers

| Pencil sizing | Compose modifier |
|---------------|-----------------|
| `fill_container` (width) | `.fillMaxWidth()` |
| `fill_container` (height) | `.fillMaxHeight()` |
| `fill_container` (both) | `.fillMaxSize()` |
| `fit_content` | *(default — no modifier)* |
| Fixed value | `.width(Xdp)` / `.height(Xdp)` |

Use `dp` for all spatial values. Convert Pencil's pixel values using the design's assumed density (usually 2× or 3×). If the user doesn't specify density, ask — or use `dp` values directly if the design was already made at 1× scale.

### Spacing

| Pencil property | Compose |
|-----------------|---------|
| `paddingTop/Right/Bottom/Left` | `.padding(top=Xdp, ...)` |
| `itemSpacing` | `Arrangement.spacedBy(Xdp)` |
| `cornerRadius` | `.clip(RoundedCornerShape(Xdp))` |
| `opacity` | `.alpha(X)` |

### Colors

```kotlin
// Read via get_variables() → map to Color constants or a theme
val Primary = Color(0xFF3b82f6)

// In a proper theme setup:
MaterialTheme.colorScheme.primary
```

Always map Pencil token names to the project's `Theme.kt` / `Color.kt` files if they exist. Never hardcode colors in composables.

### Typography

```kotlin
Text(
    text = "Label",
    style = TextStyle(
        fontFamily = FontFamily(Font(R.font.inter)),
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 24.sp,
        letterSpacing = 0.sp,
        color = Color(0xFF1a1a1a)
    )
)
```

Map Pencil font names to fonts in `res/font/`. If the font isn't in the project, use Google Fonts via `downloadable fonts` or bundle the `.ttf` file.

### Images and icons

- **Raster images**: use `AsyncImage` (Coil) or `Image(painter = painterResource(...))`
- **SVG icons**: extract `geometry` from Pencil → convert to `VectorDrawable` XML or use `rememberVectorPainter`
- **Material icons**: if the icon name matches a Material icon, prefer `Icons.Default.XYZ` over a custom path

### Complete Compose component example

```kotlin
@Composable
fun CardComponent(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White, RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        Text(text = subtitle, style = MaterialTheme.typography.bodySmall)
    }
}
```

---

## Pencil → XML layouts (legacy)

### Layout containers

| Pencil | XML |
|--------|-----|
| Horizontal | `LinearLayout android:orientation="horizontal"` |
| Vertical | `LinearLayout android:orientation="vertical"` |
| Free/overlay | `ConstraintLayout` or `FrameLayout` |

### Sizing

| Pencil sizing | XML attribute |
|---------------|--------------|
| `fill_container` | `android:layout_width="match_parent"` |
| `fit_content` | `android:layout_width="wrap_content"` |
| Fixed | `android:layout_width="Xdp"` |

### Styling attributes

```xml
<TextView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:fontFamily="@font/inter"
    android:textSize="16sp"
    android:textColor="@color/primary"
    android:padding="16dp"
    android:background="@drawable/rounded_card" />
```

For corner radius in XML, create a `drawable/rounded_card.xml`:
```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <corners android:radius="12dp" />
    <solid android:color="@color/surface" />
</shape>
```

---

## Validation checklist

- [ ] Font names match fonts available in `res/font/` or Google Fonts
- [ ] Colors reference theme/`colors.xml`, not hardcoded hex
- [ ] Spacing uses `dp`, typography uses `sp`
- [ ] `fill_container` → `match_parent`, `fit_content` → `wrap_content`
- [ ] Corner radius applied via shape drawable or `.clip()`
- [ ] Compare `get_screenshot` to running app for visual parity
