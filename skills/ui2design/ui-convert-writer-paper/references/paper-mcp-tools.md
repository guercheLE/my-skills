# Paper MCP Tool Signatures

## Required Tools

### Canvas Management
- `get_canvas()` → canvas state
- `create_artboard({ name, width, height, x, y })` → artboardId
- `list_artboards()` → artboards[]

### Element Creation
- `create_frame({ name, width, height, x, y, layout?, alignItems?, justifyContent?, gap?, padding?, fill?, stroke?, cornerRadius?, shadow?, opacity?, parentId? })` → frameId
- `create_text({ content, fontFamily, fontSize, fontWeight, fill, x, y, width?, parentId? })` → nodeId
- `create_shape({ type, width, height, x, y, fill?, stroke?, cornerRadius?, opacity?, parentId? })` → nodeId
- `create_image({ src, width, height, x, y, parentId? })` → nodeId

### Components
- `create_component(frameId)` → componentId
- `create_instance(componentId, { x, y, parentId?, overrides? })` → instanceId

### Design Tokens
- `set_variables({ colors?, spacing?, radii?, fonts?, shadows? })` → void
- `get_variables()` → variables object
- `apply_variable(nodeId, property, variableName)` → void

### Node Operations
- `update_node(nodeId, properties)` → void
- `delete_node(nodeId)` → void
- `move_node(nodeId, parentId, index?)` → void

### Export
- `export_node(nodeId, { format })` → imageBytes
