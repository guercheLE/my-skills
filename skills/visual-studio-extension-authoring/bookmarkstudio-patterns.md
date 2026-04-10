# BookmarkStudio Patterns Reference

This reference distills reusable Visual Studio extension creation patterns from BookmarkStudio by Mads Kristensen.

It is not a copy of the repository. It is a practical authoring guide derived from the repo's structure and implementation style.

## Credit

Primary exemplar: BookmarkStudio by Mads Kristensen

- Repository: https://github.com/madskristensen/BookmarkStudio
- Why it matters: it is the most up-to-date reference implementation here for creating a production-style Visual Studio extension using `Community.VisualStudio.Toolkit`, generated metadata helpers, background loading, shell event integration, and solid MSTest coverage.

## Creation First

Use BookmarkStudio as the default structural reference when creating a new Visual Studio extension unless the target repository already has a different established extension architecture that must be preserved.

Creation priority order:

- package shell and registration model
- command and tool window structure
- option page and option model structure
- service boundaries and persistence seams
- tests around pure logic and storage behavior

## 1. Package Structure

Use a single package class as the shell boundary.

Pattern:

- `ToolkitPackage` as the package base
- package attributes for registration and visibility
- lightweight `InitializeAsync`
- tool window and command registration during initialization

Recommended shape:

```csharp
[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
[InstalledProductRegistration(Vsix.Name, Vsix.Description, Vsix.Version)]
[ProvideMenuResource("Menus.ctmenu", 1)]
[ProvideOptionPage(typeof(OptionsProvider.GeneralOptions), Vsix.Name, "General", 0, 0, true)]
[Guid(PackageGuids.MyExtensionString)]
public sealed class MyExtensionPackage : ToolkitPackage
{
    protected override async Task InitializeAsync(
        CancellationToken cancellationToken,
        IProgress<ServiceProgressData> progress)
    {
        this.RegisterToolWindows();
        await this.RegisterCommandsAsync();

        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
        // UI-thread-only setup here
    }
}
```

Use `ProvideAutoLoad` sparingly. Only autoload into contexts that are genuinely necessary.

## 2. Generated Metadata And Command IDs

BookmarkStudio uses generated helpers such as `source.extension.cs` and `VSCommandTable.cs`.

Adopt the same principle:

- keep extension name, description, version, and author centralized
- keep GUIDs and command IDs centralized
- avoid repeating raw GUID strings and integer IDs in feature code

Review rule:

- if a command class references a literal numeric ID or a literal GUID, that is usually a structural regression

## 3. Command Design

BookmarkStudio models commands as tiny classes with `[Command(...)]` and `BaseCommand<T>`.

Prefer:

- one class per command
- `ExecuteAsync` that delegates quickly
- optional `BeforeQueryStatus` only for visibility/enabled state
- shared abstract bases for command families

Recommended shape:

```csharp
[Command(PackageIds.OpenThingCommand)]
internal sealed class OpenThingCommand : BaseCommand<OpenThingCommand>
{
    protected override async Task ExecuteAsync(OleMenuCmdEventArgs e)
    {
        await MyOperationsService.Current.OpenThingAsync();
    }
}
```

If multiple commands differ only by a small parameter, create a base class and override the parameter in leaf classes.

## 4. Options Pages

BookmarkStudio uses a nested `OptionsProvider` plus `BaseOptionPage<T>` and `BaseOptionModel<T>`.

Prefer this structure for settings:

```csharp
internal partial class OptionsProvider
{
    [ComVisible(true)]
    public class GeneralOptions : BaseOptionPage<General> { }
}

internal class General : BaseOptionModel<General>
{
    [Category("General")]
    [DisplayName("Enable feature")]
    [Description("Controls whether the feature is enabled.")]
    [DefaultValue(true)]
    public bool EnableFeature { get; set; } = true;
}
```

Guidelines:

- always provide `Category`, `DisplayName`, `Description`, and `DefaultValue`
- use enums for constrained option sets
- add `TypeConverter(typeof(EnumConverter))` where needed for enum display and serialization
- write descriptions for real users, not internal implementation details

## 5. Service Layering

BookmarkStudio separates shell, operations, repository/state, and persistence concerns.

Recommended layering:

- package/commands/tool windows: shell boundary
- operations/session services: orchestration and synchronization
- repository services: pure state mutations and lookups
- metadata/store services: persistence and serialization
- editor/shell monitor services: Visual Studio integration points

Keep as much code as possible in pure, deterministic classes that do not depend on the VS shell.

## 6. MEF For Editor Integration

BookmarkStudio uses MEF `[Export]` and `[Import]` for editor/classification services.

Use MEF when you need editor infrastructure such as:

- classifiers
- tag aggregators
- text views and projection buffers
- other Visual Studio editor components

Pattern:

```csharp
[Export(typeof(MyEditorService))]
internal sealed class MyEditorService
{
    [Import]
    private ISomeEditorDependency Dependency { get; set; } = null!;
}
```

Rules:

- keep imports private and narrow
- expose a small public surface
- catch and log shell/editor failures near the shell boundary

## 7. Threading Model

BookmarkStudio consistently treats the UI thread as an edge concern.

Use this discipline:

- start async and stay async
- switch to main thread only for shell APIs that require it
- use `ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(...)` explicitly
- avoid doing real work inside UI-thread sections
- unadvise shell event sinks on disposal

Review rule:

- any heavy file I/O, parsing, sorting, or normalization on the UI thread is a defect unless proven unavoidable

## 8. Storage And Compatibility

BookmarkStudio shows strong patterns for persistence:

- normalize values before comparing or saving
- tolerate missing or unknown JSON properties
- support legacy paths or formats when practical
- keep storage location decisions centralized

Guidance:

- define normalization helpers for paths, IDs, or labels
- make equality keys explicit
- isolate serialization format logic in one service
- do not spread path-comparison rules across the codebase

## 9. Shell Event Monitoring

BookmarkStudio uses `IVsTrackProjectDocumentsEvents2` to react to file moves, renames, and deletions.

Use this pattern when your extension tracks file-backed state.

Guidance:

- subscribe during package or service initialization
- keep handlers small and dispatch into services
- update stored paths atomically where possible
- always clean up subscriptions in `Dispose`

## 10. Tool Windows And UI

BookmarkStudio uses a tool window plus view-model-backed UI.

Guidance:

- keep tool window code-behind focused on shell/UI glue
- push state transitions into a view model or operations service
- treat context-menu handlers and button handlers as adapters, not business logic containers
- if WPF helpers are needed for theming or menus, isolate them into helper classes instead of inflating the control code-behind

## 11. Testing Strategy

BookmarkStudio's tests focus heavily on pure logic and persistence behavior.

Recommended coverage:

- normalization helpers
- repository state mutations
- folder rename/move/delete behavior
- serialization and deserialization round-trips
- fallback behavior for missing fields
- naming heuristics and parsing helpers

Recommended style:

- MSTest for consistency with Visual Studio extension ecosystem
- small, explicit test names
- temp-directory-based tests for storage code
- `DoNotParallelize` when static state, temp-file reuse, or shell-adjacent assumptions would make parallel execution noisy

## 12. Review Checklist

When reviewing a Visual Studio extension, check the following.

- Package initialization is background-loadable and minimal.
- Commands are small and parameterized cleanly.
- Command IDs and GUIDs are centralized.
- Options use `BaseOptionModel<T>` and are user-readable.
- Shell code and pure logic are clearly separated.
- UI thread switches are explicit and narrow.
- Persistence code is normalization-driven and backward-tolerant.
- Editor integration uses MEF or editor services appropriately.
- Shell subscriptions are unregistered and disposable resources are cleaned up.
- Tests exist for path normalization, state mutation, and persistence edge cases.

## 13. Anti-Patterns To Avoid

- Large command classes that manipulate storage, shell state, and UI all at once
- Literal GUIDs and numeric command IDs scattered across feature code
- Package initialization that performs real business logic
- Persisted path comparisons without normalization
- UI-thread file I/O or JSON parsing
- Options with no defaults or vague descriptions
- View models that directly own persistence format details
- Extensions that only test happy-path command execution and skip data model tests

## 14. Default Implementation Bias

If the repo resembles BookmarkStudio, bias toward this stack:

- `Community.VisualStudio.Toolkit`
- `ToolkitPackage`
- `BaseCommand<T>`
- `BaseOptionPage<T>` and `BaseOptionModel<T>`
- generated extension metadata helpers
- MSTest for pure logic and persistence coverage

If the target repo already uses a different but coherent Visual Studio extension pattern, preserve that pattern unless the user explicitly asks for modernization.