---
name: visual-studio-extension-authoring
description: >
   Use when creating a Visual Studio extension/VSIX in C#, or when updating one
   while preserving modern creation patterns.
  Triggers on Visual Studio extension, VSIX, ToolkitPackage, Community.VisualStudio.Toolkit,
  source.extension.cs, VSCommandTable.cs, BaseCommand, BaseOptionModel, ProvideToolWindow,
   ProvideOptionPage, command table, tool window, or options page. Uses BookmarkStudio
   by Mads Kristensen as the most up-to-date reference implementation for current
   Visual Studio extension creation patterns.
---

# Visual Studio Extension Authoring

## Overview

Use this skill for Visual Studio extension creation and extension feature work, not VS Code extension work.

BookmarkStudio by Mads Kristensen is the primary reference for this skill because it is the most up-to-date example available here of a modern C# Visual Studio extension built around `Community.VisualStudio.Toolkit`, background loading, generated VSIX metadata, centralized command tables, and focused MSTest coverage.

Kudos and reference: Mads Kristensen's BookmarkStudio repository is the exemplar behind these creation patterns.

Repo: https://github.com/madskristensen/BookmarkStudio

## When To Use

- Creating a new Visual Studio extension package from scratch
- Creating a new command, tool window, options page, or editor-integrated feature inside a VSIX
- Adding commands, tool windows, or options pages to an existing VSIX
- Reviewing a Visual Studio extension for structure, threading, or maintainability
- Refactoring old `AsyncPackage` or VSCT-heavy code toward modern toolkit patterns
- Working in files like `source.extension.cs`, `VSCommandTable.cs`, package classes, command classes, options models, or MEF editor services

Do not use this skill for VS Code extensions. Use VS Code extension skills for those.

## Core Guidance

1. Start from a background-loadable package.
2. Keep package initialization thin and push behavior into services.
3. Model commands as small classes that delegate real work.
4. Centralize generated metadata instead of scattering GUIDs and IDs.
5. Keep editor- and shell-facing code at the edges and pure logic in testable services.
6. Treat threading and shell event subscription as first-class design constraints.

## Creation Bias

When there is a choice, prefer the creation style demonstrated by BookmarkStudio:

- `ToolkitPackage` over older package patterns
- generated metadata helpers over scattered constants
- small toolkit command classes over large command handlers
- explicit option models over ad hoc settings access
- testable service and repository layers over shell-heavy feature code
- narrow UI-thread sections over broad main-thread execution

## Workflow

1. Package shell
   Use a `ToolkitPackage` with package attributes for registration, menus, tool windows, and options.

2. Metadata and IDs
   Keep VSIX metadata centralized in generated files such as `source.extension.cs` and command IDs/GUIDs in a generated command table helper like `VSCommandTable.cs`.

3. Commands
   Implement one command class per command with `[Command(...)]` and inherit from `BaseCommand<T>` or a small project-specific command base.

4. Services
   Move logic into services for repository/state manipulation, storage, editor integration, and shell integration.

5. Options
   Expose options through `BaseOptionPage<T>` and `BaseOptionModel<T>` with clear categories, display names, defaults, and descriptions.

6. Tests
   Cover normalization, persistence, repository operations, and naming or parsing heuristics with MSTest.

7. Verification
   Build, run tests, and verify shell-facing behavior manually in the Experimental Instance or the repo's established debug flow.

## Quick Rules

- Prefer `AllowsBackgroundLoading = true` and switch to the UI thread only where required.
- Keep `InitializeAsync` focused on registration and startup wiring.
- Put menu and command IDs in one place; do not hardcode them throughout the codebase.
- Use toolkit helpers such as `VS.*` and `BaseCommand<T>` consistently instead of mixing several patterns.
- Use MEF exports/imports for editor-facing composition points.
- Normalize persisted paths and identifiers before storage and comparisons.
- Make JSON loading tolerant of old or partially populated data.
- Keep view models thin enough that repository and normalization logic stay unit-testable.

## Reference File

Read `bookmarkstudio-patterns.md` in this skill for the concrete creation blueprint, architecture templates, and review checks.

## Related Skills

- `csharp-mstest`
- `writing-mstest-tests`
- `dotnet-best-practices`
- `mcp-csharp-create`