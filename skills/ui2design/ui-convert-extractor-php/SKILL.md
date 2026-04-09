---
name: ui-convert-extractor-php
description: >
  PHP template (Blade, Twig, vanilla PHP) to Design IR extractor for the ui2design pipeline. Converts
  PHP-based view files into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is php, php-blade, or php-twig and the pipeline needs
  to extract visual structure from PHP template files.
  Handles Laravel Blade (@extends, @section, @component), Symfony Twig ({% extends %}, {% block %}),
  vanilla PHP with embedded HTML, and common CSS frameworks used with PHP projects.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, php, blade, twig, laravel, symfony]
---

# PHP Template Extractor

Converts PHP template files (Blade, Twig, vanilla PHP) into Design IR.

## Supported Variants

| Variant | File Extension | Framework |
|---------|---------------|-----------|
| Blade | `.blade.php` | Laravel |
| Twig | `.twig` | Symfony |
| Vanilla PHP | `.php` | None |

---

## Blade (Laravel) Extraction

### Template Syntax

```blade
@extends('layouts.app')

@section('content')
<div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold">{{ $title }}</h1>
    <form method="POST" action="{{ route('login') }}">
        @csrf
        <div class="form-group mb-4">
            <label for="email">Email</label>
            <input type="email" name="email" class="form-control rounded-lg p-2 border" />
        </div>
        @if ($errors->has('email'))
            <span class="text-red-500 text-sm">{{ $errors->first('email') }}</span>
        @endif
        <button type="submit" class="btn btn-primary">Sign In</button>
    </form>
</div>
@endsection
```

### Blade Directive Handling

| Directive | Extraction Rule |
|-----------|----------------|
| `@extends('layout')` | Reference layout as parent |
| `@section('content')` | Section content |
| `@yield('content')` | Content placeholder |
| `@component('alert')` | Component reference |
| `@include('partial')` | Inline the partial |
| `@if (cond)` | Truthy branch |
| `@foreach ($items as $item)` | One iteration |
| `@forelse` | Non-empty branch |
| `{{ $var }}` | Text placeholder |
| `@csrf`, `@method` | Ignore (non-visual) |
| `@auth` / `@guest` | Extract primary branch |

---

## Twig (Symfony) Extraction

### Template Syntax

```twig
{% extends 'base.html.twig' %}

{% block body %}
<div class="container">
    <h1>{{ title }}</h1>
    <form method="POST" action="{{ path('login') }}">
        <input type="email" name="email" class="form-control" />
        {% if errors is defined %}
            <span class="text-danger">{{ errors }}</span>
        {% endif %}
        <button type="submit" class="btn btn-primary">Sign In</button>
    </form>
</div>
{% endblock %}
```

### Twig Handling

| Syntax | Extraction Rule |
|--------|----------------|
| `{% extends 'base' %}` | Reference layout |
| `{% block name %}` | Section content |
| `{% include 'partial' %}` | Inline |
| `{% if cond %}` | Truthy branch |
| `{% for item in items %}` | One iteration |
| `{{ var }}` | Text placeholder |
| `{{ var\|filter }}` | Text placeholder (ignore filter) |

---

## Vanilla PHP Extraction

```php
<?php include 'header.php'; ?>
<div class="container">
    <h1><?= htmlspecialchars($title) ?></h1>
    <?php if ($loggedIn): ?>
        <p>Welcome, <?= $username ?></p>
    <?php else: ?>
        <form method="POST">
            <input type="email" name="email" class="form-control" />
            <button type="submit" class="btn">Login</button>
        </form>
    <?php endif; ?>
</div>
<?php include 'footer.php'; ?>
```

Extract HTML structure. Treat `<?php ?>` and `<?= ?>` as text placeholders or control flow.
`include` → inline the included file.

---

## Style Resolution

PHP projects commonly use:
- **Bootstrap** — via CDN or npm (check `<link>` tags)
- **Tailwind** — via CDN or build process (check classes)
- **Custom CSS** — in `public/css/` or `assets/css/`
- **Laravel Mix / Vite** — check build config for CSS processing

Map CSS classes to IR tokens per the standard approach.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "php"`, `"php-blade"`, or `"php-twig"`)
