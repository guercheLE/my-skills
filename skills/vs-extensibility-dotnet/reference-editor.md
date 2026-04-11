# Editor Features Reference

## Taggers

Two tagger patterns — **fast** (line-based, visible spans) and **slow** (full document):

### Fast Tagger (Visible Spans Only)

```csharp
[VisualStudioContribution]
internal class MyTaggerProvider : TextViewTaggerProvider<TextMarkerTag>
{
    public override TextViewTaggerProviderConfiguration TaggerProviderConfiguration =>
        new("MyTagger")
        {
            FileExtensions = [".csv"],
        };

    public override async Task<TextViewTagger<TextMarkerTag>> CreateTaggerAsync(
        ITextView textView, CancellationToken ct)
    {
        return new MyTagger(textView, outputChannel);
    }
}
```

Fast taggers implement `TagsChanged` event and process visible spans:

```csharp
internal class MyTagger : TextViewTagger<TextMarkerTag>
{
    public override async Task<IEnumerable<TaggedTrackingTextRange<TextMarkerTag>>> GetTagsAsync(
        NormalizedTextRangeCollection spans, CancellationToken ct)
    {
        var tags = new List<TaggedTrackingTextRange<TextMarkerTag>>();
        foreach (var span in spans)
        {
            // Process only visible text ranges
            tags.Add(new TaggedTrackingTextRange<TextMarkerTag>(range, tag));
        }
        return tags;
    }
}
```

### Slow Tagger (Full Document)

Slow taggers scan the entire document for comprehensive analysis (e.g., diagnostics):

```csharp
public override async Task<IEnumerable<TaggedTrackingTextRange<TextMarkerTag>>> GetTagsAsync(
    NormalizedTextRangeCollection spans, CancellationToken ct)
{
    // Process entire document text, not just visible spans
    var documentText = textView.Document.CopyToString();
    // Return tags for all matches in document
}
```

## Classification

Syntax coloring with `ClassificationTag`:

```csharp
internal class CsvTagger : TextViewTagger<ClassificationTag>
{
    public override async Task<IEnumerable<TaggedTrackingTextRange<ClassificationTag>>> GetTagsAsync(
        NormalizedTextRangeCollection spans, CancellationToken ct)
    {
        var tag = new ClassificationTag(ClassificationTypeNames.Comment);
        // Return tagged ranges
    }
}
```

Available classification types: `ClassificationTypeNames.Comment`, `.Keyword`, `.StringLiteral`, `.NumberLiteral`, `.Operator`, `.Identifier`, etc.

## CodeLens

### Clickable CodeLens (InvokableCodeLens)

```csharp
[VisualStudioContribution]
internal class ClickCountCodeLensProvider : ExtensionPart, ICodeLensProvider
{
    public CodeLensProviderConfiguration CodeLensProviderConfiguration => new("ClickCount")
    {
        FileExtensions = [".cs"],
    };

    public Task<CodeLens?> GetCodeLensAsync(CodeLensContext context, CancellationToken ct)
    {
        return Task.FromResult<CodeLens?>(
            new InvokableCodeLens(context.Position, "Click me", this));
    }

    public Task InvokeAsync(CodeLensInvocationContext context, CancellationToken ct)
    {
        // Handle click
        return Task.CompletedTask;
    }
}
```

### Visual CodeLens (Custom Remote UI)

```csharp
public Task<CodeLens?> GetCodeLensAsync(CodeLensContext context, CancellationToken ct)
{
    return Task.FromResult<CodeLens?>(
        new VisualCodeLens(context.Position, new WordCountCodeLensVisual(wordCount), this));
}
```

With XAML visual:

```xml
<DataTemplate xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <TextBlock Text="{Binding WordCount}" Foreground="DarkGreen" />
</DataTemplate>
```

## Text View Margins

```csharp
[VisualStudioContribution]
internal class WordCountMarginProvider : TextViewMarginProvider
{
    public TextViewMarginProviderConfiguration TextViewMarginProviderConfiguration => new(
        marginContainer: ContainerMarginPlacement.KnownValues.BottomRightCorner)
    {
        FileExtensions = [".md", ".txt"],
    };

    public async Task<ITextViewMarginControl> CreateVisualElementAsync(
        ITextViewSnapshot textView, CancellationToken ct)
    {
        var control = new WordCountControl();
        return new TextViewMarginControl(control);
    }
}
```

Margin XAML:

```xml
<DataTemplate xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <TextBlock Text="{Binding WordCount}" Margin="5,0" />
</DataTemplate>
```

Margin placement options: `BottomRightCorner`, `BottomLeftCorner`, `TopRightCorner`, `TopLeftCorner`, `LeftMargin`, `RightMargin`.

## Document Selectors

Target operations to specific file types:

```csharp
var filter = DocumentFilter.FromGlobPattern("**/*.cs", relativePath: true);
var filter2 = DocumentFilter.FromDocumentType("CSharp");
```

Use in providers or for background document monitoring.
