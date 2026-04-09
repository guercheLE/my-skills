# Penpot MCP Tool Signatures

## Required Tools

### Project & Page
- `list_projects()` → projects[]
- `get_project(projectId)` → project details
- `create_page(projectId, name)` → pageId
- `get_page(projectId, pageId)` → page with nodes

### Frame & Shape Creation
- `create_frame(pageId, { name, width, height, x, y, layout?, alignItems?, justifyContent?, gap?, padding?, fills?, strokes?, cornerRadius?, shadow?, opacity? })` → frameId
- `create_rect(pageId, parentId, { name, width, height, x, y, fills?, strokes?, cornerRadius?, shadow?, opacity? })` → nodeId
- `create_ellipse(pageId, parentId, { ... })` → nodeId
- `create_path(pageId, parentId, { ... })` → nodeId

### Text
- `create_text(pageId, parentId, { content, fontFamily, fontSize, fontWeight, fill, x, y, width?, height?, textAlign?, lineHeight? })` → nodeId

### Components & Libraries
- `create_component(pageId, frameId)` → componentId
- `create_component_instance(pageId, parentId, componentId, { x, y })` → instanceId
- `update_component_override(instanceId, overrides)` → void
- `add_to_library(projectId, componentId)` → void

### Design Tokens
- `create_token_set(projectId, name)` → tokenSetId
- `create_token(tokenSetId, { name, type, value })` → tokenId
  - type: "color" | "dimension" | "typography" | "shadow"
- `apply_token(nodeId, property, tokenId)` → void

### Node Manipulation
- `update_node(nodeId, properties)` → updated node
- `delete_node(nodeId)` → void
- `move_node(nodeId, parentId, index?)` → void
- `group_nodes(nodeIds[])` → groupId

### Export
- `export_frame(frameId, { format, scale })` → imageBytes
