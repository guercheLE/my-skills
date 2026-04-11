---
name: vs-extensibility-dotnet
description: >-
  Build Visual Studio extensions using the VisualStudio.Extensibility new out-of-proc model with C# and .NET 8.
  Use when creating VS extensions, adding commands, tool windows, editor features (taggers, CodeLens, margins),
  debug visualizers, language server providers, project query, settings, dialogs, prompts, output windows,
  or migrating from VSSDK to the new extensibility model. Triggers on "VS extensibility", "VisualStudio.Extensibility",
  "out-of-proc extension", "Visual Studio extension C#", "new extensibility model", "Remote UI",
  "VisualStudioContribution", "ExtensionEntrypoint", "tool window extension", "VS command",
  "editor tagger", "CodeLens provider", "debug visualizer", "language server provider",
  "VSSDK migration", "composite extension".
---

# VisualStudio.Extensibility — New Out-of-Proc Model

Build Visual Studio extensions using the modern VisualStudio.Extensibility model. Extensions run **out-of-process** by default for reliability and performance. Uses C# / .NET 8, NuGet package `Microsoft.VisualStudio.Extensibility.Sdk`.

## Quick Start

Every extension needs an entry point class:

```csharp
[VisualStudioContribution]
internal class MyExtension : Extension
{
    public override ExtensionConfiguration ExtensionConfiguration => new()
    {
        Metadata = new("MyExtension", ExtensionAssemblyVersion, "Publisher",
            description: "My extension description"),
    };
}
```

## Core Patterns

- **`[VisualStudioContribution]`** — Register all contributions (commands, tool windows, providers)
- **Static configuration properties** — Loaded before class instantiation; define metadata, placement, activation
- **Constructor injection** — Use DI for services; `Extensibility` property is the VS services gateway
- **Async everywhere** — All VS API operations are async with `CancellationToken`
- **Remote UI** — XAML data templates + `RemoteUserControl` for all UI (tool windows, dialogs, visualizers)
- **Activation constraints** — `VisibleWhen`/`EnabledWhen` client context expressions control when contributions appear

## Commands

Inherit `Command`, override `ExecuteCommandAsync()`:

```csharp
[VisualStudioContribution]
internal class MyCommand : Command
{
    public override CommandConfiguration CommandConfiguration => new("%MyCommand.DisplayName%")
    {
        Placements = [CommandPlacement.KnownPlacements.ToolsMenu],
    };

    public override Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
    {
        // Command logic here
    }
}
```

- Multi-placement via `KnownPlacements` or VSCT GUIDs for existing menus/toolbars
- Toolbar creation via `ToolbarConfiguration`
- Localized display names with `%Key%` referencing `.vsextension/string-resources.json`

See [reference-commands.md](reference-commands.md) for parenting, toolbars, and activation constraints.

## Editor Features

- **Taggers**: `TextViewTagger<T>` with `ITextViewTaggerProvider<T>` — fast (visible spans) or slow (full document)
- **Classification**: `ClassificationTag` with `ClassificationTypeNames.*` for syntax coloring
- **CodeLens**: `InvokableCodeLens` (clickable) or `VisualCodeLens` (custom Remote UI)
- **Margins**: `TextViewMarginProvider` with `ContainerMarginPlacement` and XAML content
- **Text manipulation**: `Editor().EditAsync()` with `ITextViewSnapshot.Selections` for multi-caret
- **Document selectors**: `DocumentFilter.FromGlobPattern()` for file-type targeting

See [reference-editor.md](reference-editor.md) for tagger patterns, CodeLens, and margin details.

## UI Components

- **Tool Windows**: `ToolWindow` base class + `ToolWindowConfiguration` + Remote UI control
- **Dialogs**: `Shell().ShowDialogAsync()` with `RemoteUserControl` content and `DialogOption`
- **User Prompts**: `ShellExtensibility.ShowPromptAsync()` with `PromptOptions<T>` or `InputPromptOptions`
- **File Pickers**: `ShowOpenFileDialogAsync()`, `ShowSaveAsFileDialogAsync()`, `ShowOpenFolderDialogAsync()`
- **Output Window**: `Extensibility.Views().Output.GetChannelAsync()` with resource-based display names

See [reference-ui.md](reference-ui.md) for tool window, dialog, and prompt patterns.

## Advanced Features

- **Debug Visualizers**: `DebuggerVisualizerProvider` + `VisualizerObjectSource` (two-project architecture)
- **Language Servers**: `LanguageServerProvider` returning `IDuplexPipe` from `CreateServerConnectionAsync()`
- **Project Query**: `Workspaces().QueryProjectsAsync()` with fluent `.With()/.Where()` builder
- **Settings**: `SettingCategory` + typed `Setting.Boolean`/`Setting.String`/`Setting.Enum`
- **Local services**: `InitializeServices()` + `IServiceCollection` for extension-scoped DI

See [reference-advanced.md](reference-advanced.md) for visualizers, language servers, project query, and settings.

## Legacy Interop & Migration

- **Composite extensions**: In-proc + out-of-proc in single VSIX with brokered services for cross-process
- **VSSDK interop**: `AsyncServiceProviderInjection<T>` and `MefInjection<T>` for accessing traditional services
- **Brokered services**: `ServiceJsonRpcDescriptor` + `IBrokeredServiceFactory` for inter-process communication
- **Assembly isolation**: Use subfolder layout to avoid conflicts between .NET 8 and .NET Framework

## Samples Reference

Official samples: https://github.com/microsoft/VSExtensibility — `New_Extensibility_Model/Samples/`

| Category | Samples |
|----------|---------|
| Commands | SimpleRemoteCommandSample, CommandParentingSample, InsertGuid, EncodeDecodeBase64, CommentRemover |
| Editor | TaggersSample, ClassificationSample, CodeLensSample, WordCountMargin, DocumentSelectorSample |
| UI | DialogSample, ToolWindowSample, UserPromptSample, FilePickerSample, OutputWindowSample |
| Debug | RegexMatchDebugVisualizer, MemoryStreamDebugVisualizer |
| Language | RustLanguageServerProvider |
| Project | VSProjectQueryAPISample |
| Settings | SettingsSample |
| Complex | MarkdownLinter, CompositeExtension, ExtensionWithTraditionalComponents, AsyncPackageAndMEF |
