# Commands Reference

## Basic Command

```csharp
[VisualStudioContribution]
internal class SampleCommand : Command
{
    public override CommandConfiguration CommandConfiguration => new("%SampleCommand.DisplayName%")
    {
        Placements = [CommandPlacement.KnownPlacements.ToolsMenu],
        Icon = new(ImageMoniker.KnownValues.Extension, IconSettings.IconAndText),
    };

    public override Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
    {
        // Implementation
        return Task.CompletedTask;
    }
}
```

## Command Placement & Parenting

Place commands in existing menus using VSCT GUIDs:

```csharp
Placements =
[
    CommandPlacement.KnownPlacements.ToolsMenu,
    CommandPlacement.VsctParent(new Guid("guid-here"), id: 0x0100, priority: 0x0100),
],
```

Place commands under a parent group or menu:

```csharp
public override CommandConfiguration CommandConfiguration => new("%MyCommand.DisplayName%")
{
    Placements =
    [
        CommandPlacement.FromCommand<ParentCommand>(),
    ],
};
```

## Toolbar Configuration

Create custom toolbars:

```csharp
[VisualStudioContribution]
internal static ToolbarConfiguration MyToolbar => new("%MyToolbar.DisplayName%")
{
    Children =
    [
        ToolbarChild.Command<MyCommand>(),
        ToolbarChild.Separator,
        ToolbarChild.Command<OtherCommand>(),
    ],
};
```

## Menu Configuration

Group commands with separators:

```csharp
[VisualStudioContribution]
internal static MenuConfiguration MyMenu => new("%MyMenu.DisplayName%")
{
    Children =
    [
        MenuChild.Command<FirstCommand>(),
        MenuChild.Separator,
        MenuChild.Command<SecondCommand>(),
    ],
};
```

## Activation Constraints

Control when commands are visible or enabled:

```csharp
public override CommandConfiguration CommandConfiguration => new("%MyCommand.DisplayName%")
{
    Placements = [CommandPlacement.KnownPlacements.ToolsMenu],
    VisibleWhen = ActivationConstraint.ClientContext(ClientContextKey.Shell.ActiveSelectionFileName, @"\.(cs|vb)$"),
    EnabledWhen = ActivationConstraint.ClientContext(ClientContextKey.Shell.ActiveEditorContentType, "text"),
};
```

## Text Manipulation in Commands

Use `Editor().EditAsync()` for text operations:

```csharp
public override async Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
{
    using var editor = await Extensibility.Editor().EditAsync(
        batch =>
        {
            var document = context.GetActiveTextView().Document;
            batch.Replace(document.CreateTextRange(start, length), "replacement");
        },
        ct);
}
```

Multi-caret support via `ITextViewSnapshot.Selections`:

```csharp
var selections = textView.Selections;
foreach (var selection in selections)
{
    batch.Replace(selection.Extent, TransformText(selection.Extent.CopyToString()));
}
```

## Progress Reporting

Show progress during long operations:

```csharp
public override async Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
{
    using var reporter = await Extensibility.Shell().StartProgressReportingAsync("Processing...", ct);

    for (int i = 0; i < total; i++)
    {
        reporter.Report(new ProgressStatus(i, total, $"Step {i}"));
        await ProcessItemAsync(i, ct);
    }
}
```

## String Resources

Localize display names in `.vsextension/string-resources.json`:

```json
{
  "SampleCommand.DisplayName": "My Sample Command",
  "MyToolbar.DisplayName": "My Toolbar"
}
```

Reference with `%Key%` syntax in configuration properties.
