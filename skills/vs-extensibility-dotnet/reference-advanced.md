# Advanced Features Reference

## Debug Visualizers

Two-project architecture: **extension** (out-of-proc) + **debuggee-side** (runs in debuggee process).

### Extension-Side (Visualizer Provider)

```csharp
[VisualStudioContribution]
internal class RegexVisualizer : DebuggerVisualizerProvider
{
    public override DebuggerVisualizerProviderConfiguration DebuggerVisualizerProviderConfiguration =>
        new(new VisualizerTargetType("System.Text.RegularExpressions.Match", "."))
        {
            Style = VisualizerStyle.ToolWindow,
            VisualizerObjectSourceType =
                new("DebuggeeSideAssembly.VisualizerObjectSource, DebuggeeSideAssembly"),
        };

    public override async Task<IRemoteUserControl> CreateVisualizerAsync(
        VisualizerTarget target, CancellationToken ct)
    {
        var data = await target.ObjectSource.RequestDataAsync<MyData>(jsonContext, ct);
        return new MyVisualizerControl(data);
    }
}
```

### Debuggee-Side (Object Source)

Runs in the debuggee process to serialize debug data:

```csharp
public class MyVisualizerObjectSource : VisualizerObjectSource
{
    public override void TransferData(object target, Stream incomingData, Stream outgoingData)
    {
        // Serialize target object data to outgoingData
        JsonSerializer.Serialize(outgoingData, ConvertToDto(target));
    }
}
```

Key patterns:
- Debuggee assembly targets .NET Framework (runs in debuggee)
- Use surrogate types for serialization when target types are complex
- `TransferData` supports pagination by reading request parameters from `incomingData`

## Language Server Providers

Wrap an existing Language Server Protocol (LSP) server:

```csharp
[VisualStudioContribution]
internal class RustLspProvider : LanguageServerProvider
{
    public override LanguageServerProviderConfiguration LanguageServerProviderConfiguration => new(
        "%RustLsp.DisplayName%",
        [DocumentFilter.FromGlobPattern("**/*.rs", relativePath: true)])
    {
        ConfiguredByRule = ConfiguredByRule.LanguageServerProviderConfiguration,
    };

    public override async Task<IDuplexPipe> CreateServerConnectionAsync(CancellationToken ct)
    {
        var process = Process.Start(new ProcessStartInfo
        {
            FileName = "rust-analyzer",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
        });

        return new DuplexPipe(
            PipeReader.Create(process.StandardOutput.BaseStream),
            PipeWriter.Create(process.StandardInput.BaseStream));
    }
}
```

## Project Query API

Fluent API for querying and manipulating the solution/project system:

```csharp
// Query all projects
var projects = await Extensibility.Workspaces().QueryProjectsAsync(
    query => query.With(p => p.Name).With(p => p.Path),
    ct);

// Query with filters
var csProjects = await Extensibility.Workspaces().QueryProjectsAsync(
    query => query
        .Where(p => p.Name.EndsWith(".csproj"))
        .With(p => p.Name)
        .With(p => p.Files),
    ct);

// Build
await project.BuildAsync(ct);

// Load/Unload
await project.UnloadProject();
await project.LoadProject();

// File management
await project.AddFileAsync(filePath, ct);
```

## Settings

### Define Settings

```csharp
[VisualStudioContribution]
internal static SettingCategory MySettingsCategory => new("myExtension.settings", "%Settings.Category%");

[VisualStudioContribution]
internal static Setting.Boolean EnableFeature => new("myExtension.enableFeature", "%Settings.Enable%", MySettingsCategory, defaultValue: true);

[VisualStudioContribution]
internal static Setting.String ApiEndpoint => new("myExtension.apiEndpoint", "%Settings.Endpoint%", MySettingsCategory, defaultValue: "https://api.example.com");

[VisualStudioContribution]
internal static Setting.Enum<LogLevel> LoggingLevel => new("myExtension.logLevel", "%Settings.LogLevel%", MySettingsCategory, defaultValue: LogLevel.Warning);
```

### Read and Write Settings

```csharp
// Read
bool enabled = await EnableFeature.GetValueAsync(ct);

// Write (batch)
await Extensibility.Settings().WriteAsync(
    batch =>
    {
        batch.WriteSetting(EnableFeature, false);
        batch.WriteSetting(ApiEndpoint, "https://new-api.example.com");
    },
    "Update settings description",
    ct);
```

### Observer Pattern

Use `[GenerateObserverClass]` attribute to auto-generate a class that monitors setting changes.

## Local Scoped Services

Register extension-scoped services for dependency injection:

```csharp
[VisualStudioContribution]
internal class MyExtension : Extension
{
    protected override void InitializeServices(IServiceCollection services)
    {
        services.AddSingleton<IMyService, MyService>();
        services.AddTransient<IMyTransientService, MyTransientService>();
    }
}
```

Services are then available via constructor injection in commands, tool windows, etc.

## Legacy VSSDK Interop

### Accessing Traditional VS Services

```csharp
[VisualStudioContribution]
internal class MyCommand : Command
{
    private readonly AsyncServiceProviderInjection<SVsSolution, IVsSolution> _solutionService;
    private readonly MefInjection<IClassifierAggregatorService> _classifierService;

    public MyCommand(
        VisualStudioExtensibility extensibility,
        AsyncServiceProviderInjection<SVsSolution, IVsSolution> solutionService,
        MefInjection<IClassifierAggregatorService> classifierService)
    {
        _solutionService = solutionService;
        _classifierService = classifierService;
    }
}
```

### Composite Extensions (In-Proc + Out-of-Proc)

Single VSIX containing both:
- Out-of-proc components (.NET 8) in root
- In-proc components (.NET Framework) in subfolder (assembly isolation)
- Brokered services for cross-process communication:

```csharp
// Service descriptor (shared)
public static ServiceJsonRpcDescriptor SharedServiceDescriptor => new(
    new ServiceMoniker("MyService", new Version("1.0")),
    ServiceJsonRpcDescriptor.Formatters.MessagePack);

// Service factory (in-proc side)
public class MyServiceFactory : IBrokeredServiceFactory
{
    public Task<object?> CreateAsync(ServiceMoniker moniker, ...) =>
        Task.FromResult<object?>(new MyService());
}
```

### AsyncPackage + New Model Interop

Use `ExtensionWithTraditionalComponents` pattern:
- Traditional `AsyncPackage` for VSSDK features
- New model `Extension` class for modern features
- Strong-named assemblies when mixing frameworks
- WPF content in Remote UI via `RemoteUserControl`
