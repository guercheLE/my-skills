---
name: ui-convert-extractor-flutter
description: >
  Flutter (Dart) widget tree to Design IR extractor for the ui2design pipeline. Converts Flutter widget
  build methods into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is flutter and the pipeline needs to extract visual structure
  from Dart widget files.
  Handles StatelessWidget, StatefulWidget, Material widgets, Cupertino widgets, layout widgets
  (Column, Row, Stack, Container), theme data, and the nested widget tree pattern.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, flutter, dart, mobile, widget]
---

# Flutter Extractor

Converts Flutter Dart widget files into Design IR. Navigates the deeply nested widget tree
pattern characteristic of Flutter.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `Scaffold` | Page (`pg`) |
| `AppBar` | Header (`hdr`) |
| `Column` | Frame (`fr`) with `d: "v"` |
| `Row` | Frame (`fr`) with `d: "h"` |
| `Container` | Frame (`fr`) with styling |
| `ElevatedButton` | Button (`btn`) |
| `TextField` | Input (`inp`) |
| `Text` | Text (`txt`) |
| `Image.asset/network` | Image (`img`) |
| `Icon` | Icon (`ico`) |
| `Card` | Card (`crd`) |
| `AlertDialog` | Modal (`mdl`) |
| `ListView` | List (`lst`) |
| `DataTable` | Table (`tbl`) |
| `TabBar` + `TabBarView` | Tab (`tab`) |
| `Drawer` | Sidebar (`sdb`) |
| `BottomNavigationBar` | Nav (`nav`) |
| `ExpansionPanel` | Accordion (`acc`) |

---

## Extraction Process

### Step 1: Parse Widget Build Method

```dart
class LoginPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Sign In')),
      body: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Welcome Back', style: Theme.of(context).textTheme.headlineMedium),
            SizedBox(height: 24),
            TextField(
              decoration: InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              child: Text('Sign In'),
            ),
          ],
        ),
      ),
    );
  }
}
```

Parse the `build()` method return value as a widget tree.

### Step 2: Map Widget Types

| Flutter Widget | IR Type | Property Mapping |
|---------------|---------|-----------------|
| `Container` | `fr` | `color` → `bg`, `padding` → `p`, `decoration` → border/shadow |
| `SizedBox` | `div` (spacer) | `width` → `w`, `height` → `h` |
| `Padding` | Transparent (apply `p` to child) | `padding` → `p` on child |
| `Center` | Transparent (apply `al: "c"`, `jc: "c"`) | |
| `Align` | Transparent (apply alignment to child) | |
| `Expanded` / `Flexible` | Set child to stretch | |
| `Stack` | `fr` (absolute-positioned children) | |
| `Positioned` | Child with `x`, `y` in Stack | |
| `SingleChildScrollView` | Transparent (extract child) | |
| `SafeArea` | Transparent (extract child) | |
| `GestureDetector` / `InkWell` | Transparent (extract child) | |
| `Opacity` | Apply `op` to child | |
| `ClipRRect` | Apply `br.r` to child | |

### Step 3: Resolve Theme Data

```dart
final theme = ThemeData(
  colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFF6366F1)),
  textTheme: TextTheme(
    headlineMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
    bodyMedium: TextStyle(fontSize: 14),
  ),
);
```

- `Theme.of(context)` references → resolve from `ThemeData` in `MaterialApp`
- `ColorScheme` → map to color tokens
- `TextTheme` → map to font tokens
- `EdgeInsets` → map to spacing tokens

### Step 4: Handle SizedBox as Spacer

Flutter uses `SizedBox(height: 16)` as vertical spacer between Column children.
Convert to `g` (gap) on the parent Column when spacing is consistent,
or to `div` (spacer) nodes when spacing varies.

### Step 5: Handle Conditional/List Rendering

```dart
if (isLoggedIn) Widget1() else Widget2()  // → extract Widget1
items.map((item) => ListTile(...)).toList()  // → extract one ListTile
```

### Step 6: Write IR File

One IR per screen/widget file. Follow `ui-convert-ir-schema` format.

---

## Cupertino Widgets

| Cupertino Widget | IR Type |
|-----------------|---------|
| `CupertinoButton` | `btn` |
| `CupertinoTextField` | `inp` |
| `CupertinoNavigationBar` | `hdr` |
| `CupertinoTabBar` | `nav` |
| `CupertinoAlertDialog` | `mdl` |
| `CupertinoPageScaffold` | `pg` |

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "flutter"`)
