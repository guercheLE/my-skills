# Figma MCP Tool Signatures

## Required Tools

### File & Page Management
- `get_file(fileKey)` → file metadata, pages, components
- `get_file_nodes(fileKey, nodeIds[])` → specific node details
- `create_page(fileKey, name)` → new page

### Frame & Shape Creation
- `create_frame(fileKey, parentId, { name, width, height, x, y, layoutMode?, primaryAxisAlignItems?, counterAxisAlignItems?, paddingTop?, paddingRight?, paddingBottom?, paddingLeft?, itemSpacing?, fills?, strokes?, cornerRadius?, effects?, opacity? })` → nodeId
- `create_rectangle(fileKey, parentId, { name, width, height, x, y, fills?, strokes?, cornerRadius?, effects?, opacity? })` → nodeId
- `create_ellipse(fileKey, parentId, { ... })` → nodeId

### Text
- `create_text(fileKey, parentId, { name, characters, fontSize, fontFamily, fontWeight, fills?, x, y, width?, height?, textAlignHorizontal?, textAlignVertical?, lineHeight? })` → nodeId

### Components
- `create_component(fileKey, nodeId)` → componentId — converts frame to component
- `create_instance(fileKey, parentId, componentId, { x, y, overrides? })` → instanceId
- `set_overrides(fileKey, instanceId, overrides)` → updated instance

### Styles & Variables
- `create_variable_collection(fileKey, name)` → collectionId
- `create_variable(fileKey, collectionId, { name, type, value })` → variableId
  - type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
- `create_style(fileKey, { name, type, properties })` → styleId
  - type: "FILL" | "TEXT" | "EFFECT" | "GRID"
- `apply_variable(fileKey, nodeId, property, variableId)` → void

### Node Manipulation
- `update_node(fileKey, nodeId, properties)` → updated node
- `delete_node(fileKey, nodeId)` → void
- `move_node(fileKey, nodeId, parentId, index?)` → void
- `set_auto_layout(fileKey, nodeId, { layoutMode, paddingTop, paddingRight, paddingBottom, paddingLeft, itemSpacing, primaryAxisAlignItems, counterAxisAlignItems })` → void

### Image
- `set_image_fill(fileKey, nodeId, imageUrl)` → void
- `export_node(fileKey, nodeId, { format, scale })` → imageBytes
