# UI Components Reference

## Tool Windows

```csharp
[VisualStudioContribution]
internal class MyToolWindow : ToolWindow
{
    public MyToolWindow(VisualStudioExtensibility extensibility)
        : base(extensibility)
    {
        Title = "My Tool Window";
    }

    public override ToolWindowConfiguration ToolWindowConfiguration => new()
    {
        Placement = ToolWindowPlacement.DocumentWell,
    };

    public override Task<IRemoteUserControl> GetContentAsync(CancellationToken ct)
    {
        return Task.FromResult<IRemoteUserControl>(new MyToolWindowControl());
    }
}
```

### Showing a Tool Window from a Command

```csharp
public override async Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
{
    await Extensibility.Shell().ShowToolWindowAsync<MyToolWindow>(activate: true, ct);
}
```

### Remote UI Control with Data Binding

```csharp
internal class MyToolWindowControl : RemoteUserControl
{
    public MyToolWindowControl()
        : base(dataContext: new MyDataContext())
    {
    }
}

internal class MyDataContext : NotifyPropertyChangedObject
{
    private string _message = "Hello";

    public string Message
    {
        get => _message;
        set => SetProperty(ref _message, value);
    }

    [DataMember]
    public IAsyncCommand MyCommand => new AsyncCommand(async (parameter, ct) =>
    {
        Message = "Clicked!";
    });
}
```

XAML template:

```xml
<DataTemplate xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <StackPanel>
        <TextBlock Text="{Binding Message}" />
        <Button Content="Click Me" Command="{Binding MyCommand}" />
    </StackPanel>
</DataTemplate>
```

## Dialogs

```csharp
public override async Task ExecuteCommandAsync(IClientContext context, CancellationToken ct)
{
    await Extensibility.Shell().ShowDialogAsync(
        new MyDialogControl(),
        "Dialog Title",
        DialogOption.OKCancel,
        ct);
}
```

`DialogOption` values: `OK`, `OKCancel`, `Close`, `None`.

## User Prompts

### Simple Prompt (OK/Cancel)

```csharp
bool confirmed = await Extensibility.Shell().ShowPromptAsync(
    "Are you sure?",
    PromptOptions.OKCancel,
    ct);
```

### Custom Options

```csharp
var result = await Extensibility.Shell().ShowPromptAsync(
    "Choose an action:",
    new PromptOptions<MyEnum>
    {
        Choices =
        {
            { "Option A", MyEnum.A },
            { "Option B", MyEnum.B },
        },
        DefaultChoiceIndex = 0,
    },
    ct);
```

### Input Prompt (Text Input)

```csharp
string? input = await Extensibility.Shell().ShowPromptAsync(
    "Enter a name:",
    new InputPromptOptions { DefaultText = "Default" },
    ct);
```

## File Pickers

### Open File

```csharp
var file = await Extensibility.Shell().ShowOpenFileDialogAsync(
    new FileDialogOptions
    {
        Title = "Select a file",
        Filters = { new FileDialogFilter("Text Files", "*.txt") },
    },
    ct);
```

### Save As

```csharp
var path = await Extensibility.Shell().ShowSaveAsFileDialogAsync(
    new FileDialogOptions { Title = "Save file" },
    ct);
```

### Open Folder

```csharp
var folder = await Extensibility.Shell().ShowOpenFolderDialogAsync(
    new FolderDialogOptions { Title = "Select folder" },
    ct);
```

## Output Window

> **Preview API** — Requires `#pragma warning disable VSEXTPREVIEW_OUTPUTWINDOW` or `<NoWarn>$(NoWarn);VSEXTPREVIEW_OUTPUTWINDOW</NoWarn>` in csproj.

```csharp
#pragma warning disable VSEXTPREVIEW_OUTPUTWINDOW

// Create in InitializeAsync or on first use (not per-command invocation)
OutputChannel? outputChannel = await Extensibility.Views().Output
    .CreateOutputChannelAsync("My Extension Output", ct);

if (outputChannel != null)
{
    await outputChannel.Writer.WriteLineAsync("Hello from my extension!");
}

#pragma warning restore VSEXTPREVIEW_OUTPUTWINDOW
```

- Display name is a plain string (not `%Key%` resource reference)
- Returns `OutputChannel` (not `OutputWindow`)
- Use `CreateOutputChannelAsync()` (not `GetChannelAsync()`)
- Writer supports `WriteAsync` and `WriteLineAsync`
- Channels are lazily created on first access; best stored as a field initialized once
