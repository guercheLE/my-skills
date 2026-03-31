# Linux Code Generation from Pencil

## Framework choice

| Framework | Language | When to use |
|-----------|----------|-------------|
| **GTK 4** | C, Python, Rust, Vala | GNOME-family apps; system integration; modern Linux desktop |
| **Qt 6 / QML** | C++, Python (PyQt6/PySide6), QML | Cross-platform (Linux/Windows/macOS/Android/iOS); rich animations |
| **Qt Widgets** | C++, Python | Legacy Qt desktop apps |
| **Electron** | HTML/CSS/JS | If web skills are stronger and native feel is not critical |
| **Flutter** | Dart | Cross-platform with consistent rendering |

Ask the user which framework to target. If the project already exists, detect from `CMakeLists.txt`, `meson.build`, `pyproject.toml`, or module imports.

---

## Extraction step

```
batch_get([], [nodeId], { maxDepth: 10, includePathGeometry: true })
snapshot_layout()
get_variables()
get_screenshot(nodeId)   # visual reference
```

---

## Pencil → GTK 4

### Python + GTK 4 (most accessible)

```python
import gi
gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
from gi.repository import Gtk, Adw, Gdk, Pango

class CardWidget(Gtk.Box):
    def __init__(self, title: str, subtitle: str):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.set_margin_top(16)
        self.set_margin_bottom(16)
        self.set_margin_start(16)
        self.set_margin_end(16)

        title_label = Gtk.Label(label=title)
        title_label.add_css_class("title-2")
        title_label.set_xalign(0)

        subtitle_label = Gtk.Label(label=subtitle)
        subtitle_label.add_css_class("body")
        subtitle_label.set_xalign(0)

        self.append(title_label)
        self.append(subtitle_label)
```

### Layout containers

| Pencil `layoutMode` | GTK 4 widget |
|---------------------|-------------|
| `"horizontal"` | `Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)` |
| `"vertical"` | `Gtk.Box(orientation=Gtk.Orientation.VERTICAL)` |
| Grid / responsive | `Gtk.Grid` or `Gtk.FlowBox` |
| Overlay | `Gtk.Overlay` |
| Scroll | `Gtk.ScrolledWindow` |

### Sizing

| Pencil sizing | GTK 4 |
|---------------|-------|
| `fill_container` | `widget.set_hexpand(True)` / `set_vexpand(True)` |
| `fit_content` | Default (no expand) |
| Fixed | `widget.set_size_request(width, height)` |

Spacing between children: `box.set_spacing(8)` (maps to Pencil `itemSpacing`).
Padding on the box itself: `set_margin_*` methods for each side.

### Colors and CSS

GTK 4 styles via CSS. Load a stylesheet:

```python
css_provider = Gtk.CssProvider()
css_provider.load_from_string("""
    .card {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 16px;
    }
    .primary-text {
        color: #3b82f6;
        font-family: "Inter";
        font-size: 16px;
        font-weight: 600;
    }
""")
Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css_provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
)
```

Map Pencil `get_variables()` to CSS custom properties or named CSS classes. Use `widget.add_css_class("class-name")` to apply styles.

### Typography

GTK 4 uses **Pango** for text rendering:

```python
label = Gtk.Label(label="Title")
label.set_attributes(Pango.AttrList.from_string(
    "0 -1 font-desc 'Inter SemiBold 16', 0 -1 foreground #3b82f6ff"
))
```

Simpler: use CSS classes (preferred):
```python
label.add_css_class("heading")   # Adwaita typographic scale
```

**Adwaita CSS classes** (libadwaita): `title-1`, `title-2`, `title-3`, `title-4`, `heading`, `body`, `caption`, `numeric`, `monospace`.

### Icons

- **GNOME icons**: `Gtk.Image.new_from_icon_name("document-open-symbolic")` — follows icon theme
- **Custom SVG**: use `Gtk.Image.new_from_file("icon.svg")` or convert path geometry to a Cairo drawing

### UI definition via Blueprint / XML

For complex UIs, use GTK Blueprint (`.blp`) or raw XML (`.ui`) for structure, and Python/Vala/C for logic:

```xml
<!-- card.ui -->
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <template class="CardWidget" parent="GtkBox">
    <property name="orientation">vertical</property>
    <property name="spacing">8</property>
    <child>
      <object class="GtkLabel" id="title_label">
        <property name="xalign">0</property>
        <style><class name="title-2"/></style>
      </object>
    </child>
  </template>
</interface>
```

---

## Pencil → Qt 6 / QML

### QML layout

```qml
// Card.qml
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: card
    width: parent.width
    height: column.implicitHeight + 32
    radius: 12
    color: "#ffffff"

    ColumnLayout {
        id: column
        anchors { left: parent.left; right: parent.right; top: parent.top }
        anchors.margins: 16
        spacing: 8

        Label {
            text: qsTr("Card Title")
            font.family: "Inter"
            font.pixelSize: 16
            font.weight: Font.SemiBold
            color: "#1a1a1a"
            Layout.fillWidth: true
        }

        Label {
            text: qsTr("Subtitle")
            font.pixelSize: 14
            color: "#6b7280"
            Layout.fillWidth: true
        }
    }
}
```

### Layout items

| Pencil | QML |
|--------|-----|
| Horizontal | `RowLayout { }` |
| Vertical | `ColumnLayout { }` |
| Grid | `GridLayout { columns: N }` |
| Free positioning | `Item { }` with `anchors` |
| Scroll | `ScrollView { ColumnLayout { } }` |

### Sizing

| Pencil sizing | QML |
|---------------|-----|
| `fill_container` (width) | `Layout.fillWidth: true` |
| `fill_container` (height) | `Layout.fillHeight: true` |
| `fit_content` | `Layout.preferredWidth: implicitWidth` |
| Fixed | `Layout.preferredWidth: 200` |

### Colors

Map Pencil variables to a singleton `Theme.qml`:

```qml
// Theme.qml
pragma Singleton
QtObject {
    readonly property color primary: "#3b82f6"
    readonly property color surface: "#ffffff"
    readonly property int radiusCard: 12
}
```

Use as `Theme.primary` throughout.

### Python + PyQt6 / PySide6

```python
from PyQt6.QtWidgets import QApplication, QVBoxLayout, QLabel, QFrame
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt

class CardWidget(QFrame):
    def __init__(self, title: str, subtitle: str, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QFrame {
                background: white;
                border-radius: 12px;
                padding: 16px;
            }
        """)
        layout = QVBoxLayout(self)
        layout.setSpacing(8)

        title_label = QLabel(title)
        title_label.setFont(QFont("Inter", 16, QFont.Weight.SemiBold))

        subtitle_label = QLabel(subtitle)
        subtitle_label.setFont(QFont("Inter", 14))
        subtitle_label.setStyleSheet("color: #6b7280;")

        layout.addWidget(title_label)
        layout.addWidget(subtitle_label)
```

---

## Validation checklist

- [ ] Fonts available on the system or bundled with the app
- [ ] Colors defined in a theme singleton or CSS — not scattered inline
- [ ] All sizing uses expand/fill flags, not hardcoded pixels except for intentionally fixed elements
- [ ] `fill_container` → `set_hexpand(True)` (GTK) or `Layout.fillWidth: true` (QML)
- [ ] Corner radius applied via CSS (GTK) or `radius` property (QML `Rectangle`)
- [ ] Icon names match the target icon theme (GNOME) or `qrc:/` resource system (Qt)
- [ ] Compare `get_screenshot` to running app for visual parity
