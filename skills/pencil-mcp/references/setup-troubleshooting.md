# Pencil Setup & Troubleshooting

> **Authoritative sources:**
> - https://docs.pencil.dev/getting-started/installation
> - https://docs.pencil.dev/getting-started/authentication
> - https://docs.pencil.dev/troubleshooting

---

## Installation

### VS Code / Cursor Extension

1. Open Extensions panel (`Cmd/Ctrl + Shift + X`)
2. Search for **"Pencil"**
3. Click **Install**
4. Create a `.pen` file — Pencil activates automatically on open

### Desktop App

- **macOS:** Download `.dmg`, drag to Applications. macOS may show a security warning — right-click → Open.
- **Linux:** Download `.deb` or `.AppImage`. X11 environments are more stable than Wayland/Hyprland.
- **Windows:** No desktop app — use the VS Code or Cursor extension instead.

### Claude Code CLI (required for AI features)

```bash
# Install
npm install -g @anthropic-ai/claude-code-cli

# Authenticate
claude
# Follow browser authentication flow
```

---

## Activation

1. Launch Pencil (extension or desktop app)
2. Enter your email when prompted
3. Check email for activation code and enter it in Pencil
4. Run `claude` CLI and complete authentication

---

## MCP Server

The Pencil MCP server starts **automatically** when Pencil is running. No manual configuration needed.

**Verify connection:**
- **Cursor:** Settings → Tools & MCP → Pencil should appear
- **VS Code:** Check MCP configuration in settings
- **Codex CLI:** Run `/mcp` — Pencil should be listed

---

## Common Issues & Solutions

### Extension doesn't connect

| Symptom | Solution |
|---------|----------|
| No Pencil icon after installing | Create a `.pen` file and open it; check extension is enabled |
| Extension installed but not functioning | Verify Claude Code is logged in (`claude`); restart IDE |
| "Claude Code not connected" | Open terminal in project dir, run `claude`, authenticate |

### Authentication errors

| Error | Likely cause | Solution |
|-------|-------------|---------|
| "Invalid API key" / "Please run /login" | Incomplete or conflicting auth | Run `claude` CLI; remove `ANTHROPIC_API_KEY` env var if using CLI auth |
| "Invite for your email address was not found" | Activation issue | Reinstall extension, try again; contact support |
| Repeatedly prompted for activation | Known bug in some versions | Restart IDE; reinstall if persists |
| Claude CLI works but Pencil says not logged in | Custom provider conflict | Remove custom provider configs; restart IDE |

### Cursor-specific

| Issue | Solution |
|-------|---------|
| Prompt editor missing | Check activation/login status; restart Cursor; verify MCP in settings |
| "You need Cursor Pro" | Some features require Cursor Pro subscription |

### Saving & version control

| Limitation | Workaround |
|-----------|-----------|
| No auto-save | Save frequently with `Cmd/Ctrl + S` |
| Limited undo/redo | Commit to Git before major changes; use Git history to revert |
| No real-time collaboration | Use Git branches; review designs in pull requests |

### Import/export

| Issue | Solution |
|-------|---------|
| Image import fails on macOS | Use drag-and-drop instead of File menu |
| Images don't paste from Figma | Re-import images separately; copy SVG instead |
| Export to Claude Code fails with "exit code 1" | Re-authenticate (`claude`); check folder permissions |
| Exported output doesn't match canvas | Re-export; take canvas screenshot for reference |

### MCP / AI issues

| Issue | Solution |
|-------|---------|
| MCP server not appearing | Verify Pencil is running; restart both Pencil and IDE |
| "AI can't access folders" | Accept permission prompts; check system folder permissions |
| Codex config.toml modified | Backup config before first use; known issue under investigation |
| Wayland/Hyprland UI issues (Linux) | Use X11; or try desktop app |

---

## Reporting Bugs

Include in your bug report:
- OS and version
- IDE (VS Code / Cursor / Desktop) and version
- Pencil version
- Claude Code CLI version
- Exact error message and steps to reproduce
- Screenshots or console logs if applicable
- Minimal `.pen` file that reproduces the issue (if relevant)

---

## File Organization Best Practices

```
my-project/
├── src/
│   ├── components/
│   └── styles/
├── design.pen      ← Keep .pen files alongside code
└── package.json
```

- Commit `.pen` files to Git like any source file — they are JSON and diff cleanly
- Use descriptive names: `dashboard.pen`, `components.pen`
- Save before major changes; make incremental commits
