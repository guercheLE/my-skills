---
name: ui-convert-mcp-validator
description: >
  Preflight MCP server validation for the ui2design pipeline. Verifies that the MCP server for the chosen
  design tool is reachable, responsive, and exposes the required tools before any write operations begin.
  Use this skill during pipeline preflight, before any extraction or writing. If MCP validation fails,
  the pipeline must halt — never attempt writes to an unverified server.
  Also use when debugging MCP connectivity issues or when a writer reports unexpected failures.
version: 1.0.0
author: ui2design
tags: [ui-convert, core, mcp, validation, preflight]
---

# MCP Validator

Verifies the target design tool's MCP server is ready before the pipeline proceeds to writing.
This is a hard gate — if validation fails, the pipeline stops.

## Non-negotiable Rules

1. **Run before any writes** — never skip validation, even on resume.
2. **Fail fast** — if the server is unreachable, stop immediately. Do not retry indefinitely.
3. **Check required tools** — verify the specific MCP tools each writer needs are available.
4. **Report clearly** — on failure, tell the user exactly what's wrong and how to fix it.

---

## Validation Steps

### Step 1: Server Reachability

Attempt to call a lightweight MCP tool for the target server. Each tool has a preferred probe:

| Tool | Probe Call | What It Tests |
|------|-----------|---------------|
| Pencil | `get_editor_state()` | Server running, Pencil app open |
| Figma | List available tools | Server running, auth configured |
| Penpot | List available tools | Server running, auth configured |
| Stitch | List available tools | Server running |
| Paper | List available tools | Server running |

If the probe fails (timeout, connection refused, auth error), report and halt.

### Step 2: Required Tools Check

Each writer needs specific MCP tools. Verify they're available:

#### Pencil Requirements
- `get_editor_state` — canvas state
- `batch_get` — node discovery
- `batch_design` — insert/update/delete operations
- `get_variables` — read design tokens
- `set_variables` — write design tokens
- `open_document` — create/open files
- `find_empty_space_on_canvas` — layout planning
- `get_screenshot` — visual validation

#### Figma Requirements
- `get_file` — file access
- `create_frame` — frame creation with auto-layout
- `create_text` — text node creation
- `create_component` — component creation
- `create_instance` — component instantiation
- `create_variable_collection` — design token collections
- `create_variable` — individual token creation
- `apply_variable` — binding tokens to nodes
- `create_style` — text/fill/effect styles
- `update_node` — property updates
- `delete_node` — cleanup
- Full contract: `skills/ui-convert-writer-figma/references/figma-mcp-tools.md`

#### Penpot Requirements
- `create_frame` — frame creation with flex layout
- `create_text` — text node creation
- `create_component` — component creation
- `create_component_instance` — component instantiation
- `create_token_set` — design token sets
- `create_token` — individual token creation
- `apply_token` — binding tokens to nodes
- `update_node` — property updates
- `delete_node` — cleanup
- Full contract: `skills/ui-convert-writer-penpot/references/penpot-mcp-tools.md`

#### Stitch Requirements
- `create_frame` — frame/container creation
- `create_text` — text creation
- `create_component` — component creation
- `instantiate_component` — component instantiation
- `set_tokens` — bulk design token creation
- `apply_token` — binding tokens to nodes
- `update_node` — property updates
- `delete_node` — cleanup
- Full contract: `skills/ui-convert-writer-stitch/references/stitch-mcp-tools.md`

#### Paper Requirements
- `create_frame` — frame/container creation
- `create_text` — text creation
- `create_component` — component creation
- `create_instance` — component instantiation
- `set_variables` — design token/variable creation
- `apply_variable` — binding variables to nodes
- `update_node` — property updates
- `delete_node` — cleanup
- Full contract: `skills/ui-convert-writer-paper/references/paper-mcp-tools.md`

### Step 3: Document Readiness (Pencil-specific)

For Pencil, also verify:
- A `.pen` document is open OR we can create a new one
- The canvas is accessible

---

## Failure Messages

Provide actionable error messages:

```
❌ MCP Validation Failed: Pencil.dev

Problem: Pencil MCP server is not reachable.

To fix:
1. Open the Pencil.dev application
2. Verify MCP server is enabled in Pencil settings
3. Check your IDE's MCP configuration points to the correct server
4. Try again

Documentation: https://pencil.dev/docs/mcp
```

```
❌ MCP Validation Failed: Figma

Problem: Missing required tools: create_frame, create_component

To fix:
1. Verify the Figma MCP server is running
2. Check authentication credentials are valid
3. Ensure the MCP server version supports the required tools
```

---

## On Resume

Even when resuming from a checkpoint, re-run MCP validation. The server may have gone down
between sessions. This is a fast check (< 2 seconds) and prevents frustrating failures mid-write.

---

## Cross-references

- **Called by** → `ui-convert-coordinator` (preflight step)
- **Required before** → any `ui-convert-writer-*` skill
- **Pencil MCP details** → `pencil-mcp` skill (reference for tool names and syntax)
