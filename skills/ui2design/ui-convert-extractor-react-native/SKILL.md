---
name: ui-convert-extractor-react-native
description: >
  React Native to Design IR extractor for the ui2design pipeline. Converts React Native components
  (JSX/TSX with StyleSheet) into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is react-native and the pipeline needs to extract visual
  structure from React Native component files.
  Handles View, Text, Image, ScrollView, FlatList, StyleSheet.create(), NativeWind/Tailwind classes,
  Expo components, React Navigation screens, and third-party UI libraries (React Native Paper,
  NativeBase, React Native Elements).
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, react-native, mobile, expo, jsx, tsx]
---

# React Native Extractor

Converts React Native components (JSX/TSX) into Design IR. Handles the StyleSheet-based
styling system and React Native's component primitives.

## What This Extracts

| Source Pattern | IR Output |
|---------------|-----------|
| `<View style={...}>` | Frame (`fr`) |
| `<Text style={...}>` | Text (`txt`) |
| `<Image source={...}>` | Image (`img`) |
| `<TextInput .../>` | Input (`inp`) |
| `<TouchableOpacity>` / `<Pressable>` | Button (`btn`) |
| `<ScrollView>` | Transparent (extract children) |
| `<FlatList>` | List (`lst`) |
| `<SectionList>` | List (`lst`) |
| `<Modal>` | Modal (`mdl`) |
| `<SafeAreaView>` | Transparent (extract children) |

---

## Extraction Process

### Step 1: Parse JSX

```jsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
      />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#0f172a',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Step 2: Resolve StyleSheet Styles

Parse `StyleSheet.create()` objects. Map RN style properties to IR:

| RN Style Property | IR Key |
|-------------------|--------|
| `width` | `w` |
| `height` | `h` |
| `backgroundColor` | `bg` (create token) |
| `color` | `fg` (create token) |
| `fontSize` | `fn.sz` |
| `fontWeight` | `fn.wt` |
| `fontFamily` | `fn.fm` |
| `padding` | `p` |
| `paddingHorizontal` | `p[1]`, `p[3]` |
| `paddingVertical` | `p[0]`, `p[2]` |
| `margin` | Spacing (gap or position) |
| `borderRadius` | `br.r` |
| `borderWidth` | `br.w` |
| `borderColor` | `br.c` |
| `flexDirection: 'row'` | `d: "h"` |
| `flexDirection: 'column'` | `d: "v"` (default) |
| `alignItems` | `al` |
| `justifyContent` | `jc` |
| `gap` | `g` |
| `opacity` | `op` |
| `flex: 1` | Stretch to fill |

### Step 3: Map RN Components to IR

| React Native Component | IR Type |
|------------------------|---------|
| `View` | `fr` |
| `Text` | `txt` |
| `Image` | `img` |
| `TextInput` | `inp` |
| `TouchableOpacity` / `Pressable` / `Button` | `btn` |
| `ScrollView` | Transparent |
| `FlatList` / `SectionList` | `lst` |
| `Modal` | `mdl` |
| `SafeAreaView` / `KeyboardAvoidingView` | Transparent |
| `ActivityIndicator` | `fr` (loading) |
| `Switch` | `inp` |

### Step 4: Handle NativeWind (Tailwind for RN)

```jsx
<View className="flex-1 p-6 justify-center bg-white">
  <Text className="text-3xl font-bold mb-6">Sign In</Text>
</View>
```

Same Tailwind class mapping as React extractor.

### Step 5: Handle UI Libraries

#### React Native Paper

| Paper Component | IR Type |
|----------------|---------|
| `Button` | `btn` |
| `TextInput` | `inp` |
| `Card` | `crd` |
| `Dialog` | `mdl` |
| `Appbar` | `hdr` |
| `Drawer` | `sdb` |
| `List` | `lst` |
| `DataTable` | `tbl` |

### Step 6: React Navigation Screens

- Stack screens → pages (`pg`)
- Tab screens → tab container (`tab`)
- Drawer screens → sidebar navigation

### Step 7: Write IR File

One IR per screen/component. Follow `ui-convert-ir-schema` format.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "react-native"`)
