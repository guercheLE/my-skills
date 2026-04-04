# iOS & macOS Code Generation from Pencil

Both platforms share SwiftUI as the modern framework — the same components work on both with minor
platform idioms. For legacy projects, iOS uses UIKit and macOS uses AppKit.

## Framework choice

| Target | Modern | Legacy |
|--------|--------|--------|
| iOS | SwiftUI | UIKit |
| macOS | SwiftUI | AppKit |
| Both (multiplatform) | SwiftUI with `#if os(iOS)` guards | — |

Default to SwiftUI for new work unless the project is UIKit/AppKit.

---

## Extraction step

```
batch_get([], [nodeId], { maxDepth: 10, includePathGeometry: true })
snapshot_layout()
get_variables()
get_screenshot(nodeId)   # keep open as visual reference
```

---

## Pencil → SwiftUI

### Layout containers

| Pencil `layoutMode` | SwiftUI |
|---------------------|---------|
| `"horizontal"` | `HStack { }` |
| `"vertical"` | `VStack { }` |
| Overlay / free | `ZStack { }` |
| Scroll | `ScrollView { VStack { } }` |

### Spacing and alignment

```swift
HStack(alignment: .center, spacing: 12) { ... }
VStack(alignment: .leading, spacing: 8) { ... }
```

Map Pencil's `itemSpacing` to the `spacing` parameter. Map `horizontalAlignment` / `verticalAlignment` to SwiftUI `alignment`.

### Sizing

| Pencil sizing | SwiftUI modifier |
|---------------|-----------------|
| `fill_container` (width) | `.frame(maxWidth: .infinity)` |
| `fill_container` (height) | `.frame(maxHeight: .infinity)` |
| `fill_container` (both) | `.frame(maxWidth: .infinity, maxHeight: .infinity)` |
| `fit_content` | *(default — no modifier)* |
| Fixed | `.frame(width: X, height: Y)` |

All fixed spatial values from Pencil translate to SwiftUI points (pt). On non-Retina this equals pixels; on Retina (@2x/@3x) they're logical points. Pencil designs are usually authored at @1x or @2x — confirm with the user if unsure.

### Padding and shape

```swift
.padding(.top, 16)
.padding([.leading, .trailing], 24)
.padding(16)                          // uniform

.cornerRadius(12)                     // deprecated but common
.clipShape(RoundedRectangle(cornerRadius: 12))   // preferred
```

### Colors and design tokens

```swift
// Map Pencil variables to a Color extension or an asset catalog
extension Color {
    static let primary = Color("Primary")         // from Assets.xcassets
    static let surface = Color(red: 1, green: 1, blue: 1)
}
```

Always use semantic colors or asset catalog colors — never hardcode `.init(red:green:blue:)` values inline unless there's no theming system.

### Typography

```swift
Text("Headline")
    .font(.custom("Inter-SemiBold", size: 20))
    .foregroundColor(.primary)
    .lineSpacing(4)                  // Pencil lineHeight - fontSize

// Or using system fonts with weights:
.font(.system(size: 16, weight: .medium, design: .default))
```

Map Pencil `fontFamily` to font names as they appear in the `.ttf`/`.otf` bundle (use `UIFont.familyNames` to verify). Map `fontWeight` to SwiftUI `Font.Weight`.

### Images and icons

- **Raster images**: `Image("asset-name")` from `Assets.xcassets`, or `AsyncImage(url:)` for remote
- **SF Symbols** (iOS/macOS only): if the icon matches an SF Symbol, prefer `Image(systemName: "...")` over a custom SVG
- **Custom SVG icons**: extract `geometry` from Pencil, convert to a SwiftUI `Path`:

```swift
Path { path in
    // paste extracted geometry commands here
    path.move(to: CGPoint(x: 0, y: 0))
    path.addLine(to: CGPoint(x: 24, y: 0))
    // ...
}
.fill(Color.primary)
.frame(width: 24, height: 24)
```

Alternatively, add the SVG as a `Image` asset in Xcode (preserved as vector).

### Platform guards

```swift
#if os(iOS)
    // iOS-specific code
#elseif os(macOS)
    // macOS-specific code
#endif
```

Common differences:
- `UIColor` (iOS) vs `NSColor` (macOS) — SwiftUI's `Color` abstracts both
- `UINavigationController` (iOS) vs `NavigationView`/`NavigationStack` (both in SwiftUI)
- `UITabBarController` (iOS) vs `TabView` (both)
- Lists: `List { }` works on both; macOS may prefer `Table { }` for data grids

### Complete SwiftUI component example

```swift
struct CardView: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.custom("Inter-SemiBold", size: 16))
                .foregroundColor(.primary)
            Text(subtitle)
                .font(.custom("Inter-Regular", size: 14))
                .foregroundColor(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.08), radius: 4, x: 0, y: 2)
    }
}
```

---

## UIKit / AppKit (legacy)

### UIKit (iOS)

```swift
let label = UILabel()
label.text = "Title"
label.font = UIFont(name: "Inter-SemiBold", size: 16)
label.textColor = UIColor(named: "Primary") ?? .label

let container = UIView()
container.backgroundColor = .systemBackground
container.layer.cornerRadius = 12
container.translatesAutoresizingMaskIntoConstraints = false

NSLayoutConstraint.activate([
    container.leadingAnchor.constraint(equalTo: parent.leadingAnchor, constant: 16),
    container.trailingAnchor.constraint(equalTo: parent.trailingAnchor, constant: -16),
])
```

### AppKit (macOS)

```swift
let label = NSTextField(labelWithString: "Title")
label.font = NSFont(name: "Inter-SemiBold", size: 16)
label.textColor = .labelColor

let container = NSView()
container.wantsLayer = true
container.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
container.layer?.cornerRadius = 12
```

---

## Validation checklist

- [ ] Font names match fonts registered in the Xcode project Info.plist
- [ ] Colors reference asset catalog, semantic colors, or a Color extension — no raw hex inline
- [ ] All fixed sizes use points (pt), not pixels
- [ ] `fill_container` → `.frame(maxWidth/maxHeight: .infinity)`
- [ ] `fit_content` → no explicit frame (default behaviour)
- [ ] Corner radius uses `clipShape(RoundedRectangle(cornerRadius:))` on interactive elements
- [ ] Platform-specific views guarded with `#if os(iOS)` / `#if os(macOS)` where needed
- [ ] Compare `get_screenshot` to Xcode preview for visual parity
