---
name: ui-convert-extractor-python-templates
description: >
  Python template engine (Jinja2, Django, Flask) to Design IR extractor for the ui2design pipeline.
  Converts Python-based HTML templates into the Design IR format defined by ui-convert-ir-schema.
  Use this skill when the detected technology is jinja2, django, or flask and the pipeline needs to
  extract visual structure from HTML template files used by Python web frameworks.
  Handles Jinja2 template inheritance ({% extends %}, {% block %}), Django template tags, Flask
  templates, and CSS frameworks commonly used with Python web projects.
version: 1.0.0
author: ui2design
tags: [ui-convert, extractor, python, jinja2, django, flask, templates]
---

# Python Template Extractor

Converts Python web framework templates (Jinja2, Django, Flask) into Design IR.

## Supported Variants

| Variant | Template Engine | Framework |
|---------|----------------|-----------|
| Django | Django Template Language | Django |
| Jinja2 | Jinja2 | Flask, FastAPI, standalone |
| Flask | Jinja2 (same engine) | Flask |

All use similar `{{ }}` / `{% %}` syntax with minor differences.

---

## Extraction Process

### Template Syntax

```html
{% extends "base.html" %}

{% block content %}
<div class="container">
    <h1>{{ page_title }}</h1>
    <form method="POST" action="{% url 'login' %}">
        {% csrf_token %}
        <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            {{ form.email }}
        </div>
        {% if form.errors %}
            <div class="alert alert-danger">{{ form.errors }}</div>
        {% endif %}
        <button type="submit" class="btn btn-primary">Sign In</button>
    </form>
</div>
{% endblock %}
```

### Step 1: Parse Templates

Extract HTML structure from template files (typically in `templates/` directory).
Template tags become:
- `{{ variable }}` → text placeholder
- `{% if %}` → conditional (extract truthy branch)
- `{% for item in items %}` → one iteration
- `{% extends %}` → layout reference
- `{% block name %}` → section content
- `{% include "partial.html" %}` → inline the partial
- `{% url 'name' %}` → link target (extract as text)

### Step 2: Django-Specific Handling

| Django Tag | Extraction Rule |
|-----------|----------------|
| `{% csrf_token %}` | Ignore (non-visual) |
| `{% load static %}` | Ignore |
| `{% static 'path' %}` | Resolve file path |
| `{{ form.field }}` | Input node (`inp`) |
| `{{ form.field.label }}` | Text node (`txt`) |
| `{{ form.field.errors }}` | Text node (error message) |
| `{% for field in form %}` | Extract standard form fields |
| `{{ value\|filter }}` | Text placeholder |
| `{% with var=expr %}` | Ignore (scoping) |
| `{% comment %}` | Ignore |

### Step 3: Jinja2/Flask-Specific Handling

| Jinja2 Syntax | Extraction Rule |
|--------------|----------------|
| `{% macro name() %}` | Component (reusable template) |
| `{% call macro() %}` | Component reference |
| `{{ super() }}` | Parent block content |
| `{{ loop.index }}` | Ignore (loop variable) |
| `{% set var = expr %}` | Ignore (local binding) |

### Step 4: Resolve Styles

Python web projects commonly use:
- **Bootstrap** — most common with Django/Flask
- **Tailwind CSS** — increasingly popular
- **Custom CSS** — in `static/css/` (Django) or `static/` (Flask)
- **django-crispy-forms** — maps form fields to Bootstrap/Tailwind classes

Check `<link>` tags in base template and `static/` directory.

### Step 5: Write IR File

One IR per template page. Partials/includes are inlined. Macros are separate components.

---

## Cross-references

- **IR format** → `ui-convert-ir-schema`
- **Token lookup** → `tokens.json` from `ui-convert-token-miner`
- **Called by** → `ui-convert-coordinator` (when `tech: "django"`, `"jinja2"`, or `"flask"`)
