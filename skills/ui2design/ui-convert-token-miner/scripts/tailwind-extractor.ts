/**
 * tailwind-extractor.ts — Tailwind CSS config token extractor.
 *
 * Reads tailwind.config.js / .ts / .mjs and extracts theme values using
 * text-based heuristics (no eval / dynamic import of arbitrary user code).
 *
 * Handles the two most common Tailwind structures:
 *   module.exports = { theme: { colors: {...}, ... } }
 *   export default { theme: { colors: {...}, ... } }
 * and the `theme.extend` variant.
 */

import { readFile } from 'node:fs/promises';

import type { RawTokenBag } from './css-extractor.js';
import { normalizeColor, normalizeFontFamily, normalizeShadow, normalizeSpacing } from './normalize.js';

// ── Simple AST simulator using regex ─────────────────────────────────────────

/**
 * Extract a top-level object literal body that starts after `key:`.
 * Returns the raw string content inside the braces (not including the braces).
 */
function extractObjectBlock(source: string, key: string): string | null {
    const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*\\{`, 'g');
    const m = re.exec(source);
    if (!m) return null;

    let depth = 1;
    let i = m.index + m[0].length;
    while (i < source.length && depth > 0) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
    }
    return source.slice(m.index + m[0].length, i - 1);
}

/** Extract key-value pairs from a flat object body: `sm: '4px'` etc. */
function extractKeyValues(block: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    // Match: 'key': 'value' or key: "value" (simple scalar values only)
    const re = /['"]?([\w-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
        pairs.push([m[1], m[2]]);
    }
    return pairs;
}

/** Extract nested key-values for structures like colors: { primary: { main: '#...' } } */
function extractNestedKeyValues(block: string): Array<[string, string]> {
    const results: Array<[string, string]> = [];

    // First try flat pairs
    results.push(...extractKeyValues(block));

    // Then recurse one level into sub-objects
    const nestedRe = /['"]?([\w-]+)['"]?\s*:\s*\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = nestedRe.exec(block)) !== null) {
        const prefix = m[1];
        const inner = m[2];
        const innerPairs = extractKeyValues(inner);
        for (const [k, v] of innerPairs) {
            results.push([`${prefix}.${k}`, v]);
        }
    }

    return results;
}

// ── Section extractors ────────────────────────────────────────────────────────

function extractColors(themeBlock: string, filePath: string): RawTokenBag['colors'] {
    const colors: RawTokenBag['colors'] = [];
    const colorsBlock = extractObjectBlock(themeBlock, 'colors')
        ?? extractObjectBlock(themeBlock, 'backgroundColor')
        ?? extractObjectBlock(themeBlock, 'textColor');
    if (!colorsBlock) return colors;

    for (const [name, rawValue] of extractNestedKeyValues(colorsBlock)) {
        const norm = normalizeColor(rawValue);
        if (norm) colors.push({ value: norm, name: name.replace(/\./g, '_'), source: `colors.${name}` });
    }
    return colors;
}

function extractFonts(themeBlock: string): RawTokenBag['fonts'] {
    const fonts: RawTokenBag['fonts'] = [];
    const fontBlock = extractObjectBlock(themeBlock, 'fontFamily');
    if (!fontBlock) return fonts;

    const re = /['"]?([\w-]+)['"]?\s*:\s*\[([^\]]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fontBlock)) !== null) {
        const name = m[1];
        const listContent = m[2];
        const firstFamily = (listContent.match(/['"]([^'"]+)['"]/) ?? [])[1];
        if (firstFamily) {
            const family = normalizeFontFamily(firstFamily);
            if (family) fonts.push({ family, weights: [], source: `fontFamily.${name}` });
        }
    }
    return fonts;
}

function extractSpacing(themeBlock: string): RawTokenBag['spacing'] {
    const spacing: RawTokenBag['spacing'] = [];
    const block = extractObjectBlock(themeBlock, 'spacing');
    if (!block) return spacing;

    for (const [name, rawValue] of extractKeyValues(block)) {
        const norm = normalizeSpacing(rawValue);
        if (norm !== null) spacing.push({ value: norm, name: `spacing_${name}`, source: `spacing.${name}` });
    }
    return spacing;
}

function extractRadii(themeBlock: string): RawTokenBag['radii'] {
    const radii: RawTokenBag['radii'] = [];
    const block = extractObjectBlock(themeBlock, 'borderRadius');
    if (!block) return radii;

    for (const [name, rawValue] of extractKeyValues(block)) {
        const norm = normalizeSpacing(rawValue);
        if (norm !== null) radii.push({ value: norm, name: `radius_${name}`, source: `borderRadius.${name}` });
    }
    return radii;
}

function extractShadows(themeBlock: string): RawTokenBag['shadows'] {
    const shadows: RawTokenBag['shadows'] = [];
    const block = extractObjectBlock(themeBlock, 'boxShadow');
    if (!block) return shadows;

    for (const [name, rawValue] of extractKeyValues(block)) {
        const norm = normalizeShadow(rawValue);
        if (norm) shadows.push({ value: norm, name: `shadow_${name}`, source: `boxShadow.${name}` });
    }
    return shadows;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract design tokens from a Tailwind config file.
 */
export async function extractFromTailwindConfig(filePath: string): Promise<RawTokenBag> {
    const empty: RawTokenBag = { filePath, colors: [], fonts: [], spacing: [], shadows: [], radii: [] };

    let source: string;
    try {
        source = await readFile(filePath, 'utf-8');
    } catch {
        return empty;
    }

    // Strip comments
    const stripped = source
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ');

    // Extract theme block — try `theme` then `theme.extend`
    const themeBlock = extractObjectBlock(stripped, 'theme') ?? '';
    const extendBlock = extractObjectBlock(themeBlock, 'extend') ?? '';

    // Merge theme and extend (extend wins over base in Tailwind, but we want all tokens)
    const combined = themeBlock + '\n' + extendBlock;

    return {
        filePath,
        colors: extractColors(combined, filePath),
        fonts: extractFonts(combined),
        spacing: extractSpacing(combined),
        shadows: extractShadows(combined),
        radii: extractRadii(combined),
    };
}
