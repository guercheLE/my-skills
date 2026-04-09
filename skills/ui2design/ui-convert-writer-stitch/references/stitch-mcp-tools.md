# Stitch MCP Tool Signatures

## Required Tools

### Project Management
- `get_project()` → project metadata
- `create_page(name)` → pageId
- `list_pages()` → pages[]

### Element Creation
- `create_frame({ name, width, height, x, y, layout?, alignItems?, justifyContent?, gap?, padding?, fill?, stroke?, cornerRadius?, shadow?, opacity?, parentId? })` → frameId
- `create_text({ content, fontFamily, fontSize, fontWeight, fill, x, y, width?, parentId? })` → nodeId
- `create_rectangle({ name, width, height, x, y, fill?, stroke?, cornerRadius?, opacity?, parentId? })` → nodeId
- `create_image({ src, width, height, x, y, parentId? })` → nodeId

### Components
- `create_component(frameId)` → componentId
- `instantiate_component(componentId, { x, y, parentId?, overrides? })` → instanceId

### Design Tokens
- `set_tokens({ colors?, spacing?, radii?, fonts?, shadows? })` → void
- `get_tokens()` → tokens object
- `apply_token(nodeId, property, tokenName)` → void

### Node Operations
- `update_node(nodeId, properties)` → void
- `delete_node(nodeId)` → void
- `move_node(nodeId, parentId, index?)` → void

### Export
- `export_node(nodeId, { format })` → imageBytes
