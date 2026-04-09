/**
 * css-extractor.ts — CSS / SCSS / LESS design-token extractor.
 *
 * Extracts tokens from:
 *   1. CSS custom properties in :root { --var: value; }
 *   2. Inline declarations for common properties (font-family, border-radius, …)
 *
 * Returns a RawTokenBag that mine.ts merges into the final tokens.json.
 */

import { readFile } from 'node:fs/promises';
import type { ShadowToken } from './normalize.js';
import { normalizeColor, normalizeFontFamily, normalizeShadow, normalizeSpacing } from './normalize.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawColor { value: string; name: string; source: string }
export interface RawFont { family: string; weights: number[]; source: string }
export interface RawSpacing { value: number; name: string; source: string }
export interface RawShadow { value: ShadowToken; name: string; source: string }
export interface RawRadius { value: number; name: string; source: string }

export interface RawTokenBag {
    filePath: string;
    colors: RawColor[];
    fonts: RawFont[];
    spacing: RawSpacing[];
    shadows: RawShadow[];
    radii: RawRadius[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract semantic name from a CSS custom property name. */
function propToName(prop: string): string {
    return prop.replace(/^--/, '').replace(/-+/g, '_');
}

/** Heuristically determine token type from the property name. */
function classifyProp(prop: string): 'color' | 'spacing' | 'font' | 'shadow' | 'radius' | 'unknown' {
    const p = prop.toLowerCase();
    if (/color|colou?r|palette|bg|background|foreground|text|fill|stroke|border-color|primary|secondary|accent/.test(p)) return 'color';
    if (/shadow/.test(p)) return 'shadow';
    if (/radius|rounded|corner/.test(p)) return 'radius';
    if (/font-family|typeface|font$/.test(p)) return 'font';
    if (/font-size|spacing|space|gap|margin|padding|size|width|height|indent/.test(p)) return 'spacing';
    return 'unknown';
}

// ── Custom property extraction ────────────────────────────────────────────────

const RE_CUSTOM_PROP = /--([a-zA-Z][\w-]*):\s*([^;}\n]+)/g;

function extractCustomProperties(content: string, filePath: string): RawTokenBag {
    const bag: RawTokenBag = { filePath, colors: [], fonts: [], spacing: [], shadows: [], radii: [] };

    // Only scan :root and :host blocks for custom properties
    const rootBlocks = content.match(/:root\s*{[^}]*}/gs) ?? [];
    const hostBlocks = content.match(/:host\s*{[^}]*}/gs) ?? [];
    const blocksToScan = [...rootBlocks, ...hostBlocks, content]; // fallback: full file

    for (const block of blocksToScan) {
        const re = new RegExp(RE_CUSTOM_PROP.source, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(block)) !== null) {
            const propName = `--${m[1]}`;
            const rawValue = m[2].trim();
            const name = propToName(propName);
            const type = classifyProp(propName);

            if (type === 'color' || type === 'unknown') {
                const color = normalizeColor(rawValue);
                if (color) bag.colors.push({ value: color, name, source: propName });
            }
            if (type === 'spacing' || type === 'unknown') {
                const sp = normalizeSpacing(rawValue);
                if (sp !== null) bag.spacing.push({ value: sp, name, source: propName });
            }
            if (type === 'font') {
                const family = normalizeFontFamily(rawValue);
                if (family) bag.fonts.push({ family, weights: [], source: propName });
            }
            if (type === 'shadow') {
                const sh = normalizeShadow(rawValue);
                if (sh) bag.shadows.push({ value: sh, name, source: propName });
            }
            if (type === 'radius') {
                const r = normalizeSpacing(rawValue);
                if (r !== null) bag.radii.push({ value: r, name, source: propName });
            }
        }
    }

    return bag;
}

// ── Inline declaration extraction ─────────────────────────────────────────────

/** Extract font-family from `body { font-family: … }` style declarations. */
const RE_FONT_FAMILY = /font-family:\s*([^;}\n]+)/g;
const RE_BORDER_RADIUS = /border-radius:\s*([\d.]+(?:px|rem|em)?)/g;
const RE_BOX_SHADOW = /box-shadow:\s*([^;}\n]+)/g;

function extractInlineDeclarations(content: string, filePath: string): RawTokenBag {
    const bag: RawTokenBag = { filePath, colors: [], fonts: [], spacing: [], shadows: [], radii: [] };

    let m: RegExpExecArray | null;
    const reFf = new RegExp(RE_FONT_FAMILY.source, 'g');
    while ((m = reFf.exec(content)) !== null) {
        const family = normalizeFontFamily(m[1]);
        if (family) bag.fonts.push({ family, weights: [], source: 'font-family (declaration)' });
    }

    const reBr = new RegExp(RE_BORDER_RADIUS.source, 'g');
    while ((m = reBr.exec(content)) !== null) {
        const r = normalizeSpacing(m[1]);
        if (r !== null) bag.radii.push({ value: r, name: 'border_radius', source: 'border-radius (declaration)' });
    }

    const reSh = new RegExp(RE_BOX_SHADOW.source, 'g');
    while ((m = reSh.exec(content)) !== null) {
        const sh = normalizeShadow(m[1]);
        if (sh) bag.shadows.push({ value: sh, name: 'box_shadow', source: 'box-shadow (declaration)' });
    }

    return bag;
}

// ── Merge helper ──────────────────────────────────────────────────────────────

function mergeBags(a: RawTokenBag, b: RawTokenBag): RawTokenBag {
    return {
        filePath: a.filePath,
        colors: [...a.colors, ...b.colors],
        fonts: [...a.fonts, ...b.fonts],
        spacing: [...a.spacing, ...b.spacing],
        shadows: [...a.shadows, ...b.shadows],
        radii: [...a.radii, ...b.radii],
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract design tokens from a single CSS / SCSS / LESS file.
 */
export async function extractFromCss(filePath: string): Promise<RawTokenBag> {
    let content: string;
    try {
        content = await readFile(filePath, 'utf-8');
    } catch {
        return { filePath, colors: [], fonts: [], spacing: [], shadows: [], radii: [] };
    }

    // Strip comments before parsing
    const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
        .replace(/\/\/[^\n]*/g, ' ');         // line comments (SCSS/LESS)

    const fromCustomProps = extractCustomProperties(stripped, filePath);
    const fromDeclarations = extractInlineDeclarations(stripped, filePath);
    return mergeBags(fromCustomProps, fromDeclarations);
}
