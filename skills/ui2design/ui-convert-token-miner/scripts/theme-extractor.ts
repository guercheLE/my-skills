/**
 * theme-extractor.ts — MUI / Chakra UI / Vuetify theme object token extractor.
 *
 * Uses text-based heuristics to extract tokens from JS/TS theme definition files.
 * Supports:
 *   - Material UI: createTheme({ palette, typography, spacing, shape })
 *   - Chakra UI:   extendTheme({ colors, fonts, space, radii, shadows })
 *   - Vuetify:     createVuetify({ theme: { themes: { light: { colors } } } })
 */

import { readFile } from 'node:fs/promises';
import type { RawTokenBag } from './css-extractor.js';
import { normalizeColor, normalizeFontFamily, normalizeShadow, normalizeSpacing } from './normalize.js';

// ── Key-value extraction helpers ──────────────────────────────────────────────

/** Advance i past matching braces/brackets, returning the inner content. */
function extractBlock(source: string, startIndex: number): string {
    const open = source[startIndex];
    const close = open === '{' ? '}' : ']';
    let depth = 1;
    let i = startIndex + 1;
    while (i < source.length && depth > 0) {
        if (source[i] === open) depth++;
        else if (source[i] === close) depth--;
        i++;
    }
    return source.slice(startIndex + 1, i - 1);
}

/** Find first occurrence of `key:` (or `"key":`) and extract block after it. */
function findBlock(source: string, key: string): string | null {
    const re = new RegExp(`['"]?${key}['"]?\\s*:\\s*([\\[{])`, 'g');
    const m = re.exec(source);
    if (!m) return null;
    const blockStart = m.index + m[0].length - 1;
    return extractBlock(source, blockStart);
}

/** Extract flat key→string-value pairs from a block. */
function flatPairs(block: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    const re = /['"]?([\w-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) pairs.push([m[1], m[2]]);
    return pairs;
}

/** Recursively collect all leaf string values with dotted key paths. */
function deepPairs(block: string, prefix = ''): Array<[string, string]> {
    const results = flatPairs(block).map(([k, v]) => [`${prefix}${k}`, v] as [string, string]);

    // Nested objects one level deeper
    const nestedRe = /['"]?([\w-]+)['"]?\s*:\s*\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = nestedRe.exec(block)) !== null) {
        for (const [k, v] of flatPairs(m[2])) {
            results.push([`${prefix}${m[1]}.${k}`, v]);
        }
    }
    return results;
}

// ── MUI ───────────────────────────────────────────────────────────────────────

function extractMui(source: string): Partial<RawTokenBag> {
    const colors: RawTokenBag['colors'] = [];
    const fonts: RawTokenBag['fonts'] = [];
    const spacing: RawTokenBag['spacing'] = [];
    const radii: RawTokenBag['radii'] = [];

    const paletteBlock = findBlock(source, 'palette');
    if (paletteBlock) {
        for (const [path, rawValue] of deepPairs(paletteBlock)) {
            const color = normalizeColor(rawValue);
            if (color) colors.push({ value: color, name: path.replace(/\./g, '_'), source: `palette.${path}` });
        }
    }

    const typoBlock = findBlock(source, 'typography');
    if (typoBlock) {
        for (const [k, v] of flatPairs(typoBlock)) {
            if (k === 'fontFamily') {
                const family = normalizeFontFamily(v);
                if (family) fonts.push({ family, weights: [], source: `typography.${k}` });
            }
        }
    }

    const shapeBlock = findBlock(source, 'shape');
    if (shapeBlock) {
        for (const [k, v] of flatPairs(shapeBlock)) {
            const r = normalizeSpacing(v);
            if (r !== null) radii.push({ value: r, name: k, source: `shape.${k}` });
        }
    }

    // spacing(n) — MUI default is 8px per unit, or custom value
    const spacingMatch = source.match(/spacing\s*:\s*([\d.]+)/);
    if (spacingMatch) {
        const base = parseFloat(spacingMatch[1]);
        if (!isNaN(base)) spacing.push({ value: base, name: 'spacing_unit', source: 'spacing (MUI base)' });
    }

    return { colors, fonts, spacing, radii };
}

// ── Chakra UI ─────────────────────────────────────────────────────────────────

function extractChakra(source: string): Partial<RawTokenBag> {
    const colors: RawTokenBag['colors'] = [];
    const fonts: RawTokenBag['fonts'] = [];
    const spacing: RawTokenBag['spacing'] = [];
    const shadows: RawTokenBag['shadows'] = [];
    const radii: RawTokenBag['radii'] = [];

    const colorsBlock = findBlock(source, 'colors');
    if (colorsBlock) {
        for (const [path, rawValue] of deepPairs(colorsBlock)) {
            const color = normalizeColor(rawValue);
            if (color) colors.push({ value: color, name: path.replace(/\./g, '_'), source: `colors.${path}` });
        }
    }

    const fontsBlock = findBlock(source, 'fonts');
    if (fontsBlock) {
        for (const [k, v] of flatPairs(fontsBlock)) {
            const family = normalizeFontFamily(v);
            if (family) fonts.push({ family, weights: [], source: `fonts.${k}` });
        }
    }

    const spaceBlock = findBlock(source, 'space');
    if (spaceBlock) {
        for (const [k, v] of flatPairs(spaceBlock)) {
            const sp = normalizeSpacing(v);
            if (sp !== null) spacing.push({ value: sp, name: `space_${k}`, source: `space.${k}` });
        }
    }

    const radiiBlock = findBlock(source, 'radii');
    if (radiiBlock) {
        for (const [k, v] of flatPairs(radiiBlock)) {
            const r = normalizeSpacing(v);
            if (r !== null) radii.push({ value: r, name: k, source: `radii.${k}` });
        }
    }

    const shadowsBlock = findBlock(source, 'shadows');
    if (shadowsBlock) {
        for (const [k, v] of flatPairs(shadowsBlock)) {
            const sh = normalizeShadow(v);
            if (sh) shadows.push({ value: sh, name: k, source: `shadows.${k}` });
        }
    }

    return { colors, fonts, spacing, shadows, radii };
}

// ── Vuetify ───────────────────────────────────────────────────────────────────

function extractVuetify(source: string): Partial<RawTokenBag> {
    const colors: RawTokenBag['colors'] = [];

    // Vuetify: theme: { themes: { light/dark: { colors: {...} } } }
    const themeBlock = findBlock(source, 'theme');
    if (!themeBlock) return { colors };
    const themesBlock = findBlock(themeBlock, 'themes');
    if (!themesBlock) return { colors };

    // Check light/dark sub-themes
    for (const variant of ['light', 'dark', 'myCustomTheme']) {
        const variantBlock = findBlock(themesBlock, variant);
        if (!variantBlock) continue;
        const colorBlock = findBlock(variantBlock, 'colors');
        if (!colorBlock) continue;
        for (const [k, v] of flatPairs(colorBlock)) {
            const color = normalizeColor(v);
            if (color) colors.push({ value: color, name: `${variant}_${k}`, source: `themes.${variant}.colors.${k}` });
        }
    }

    return { colors };
}

// ── Public API ────────────────────────────────────────────────────────────────

type ThemeKind = 'mui' | 'chakra' | 'vuetify' | 'unknown';

function detectThemeKind(source: string): ThemeKind {
    if (/createTheme|@mui\/material/.test(source)) return 'mui';
    if (/extendTheme|@chakra-ui/.test(source)) return 'chakra';
    if (/createVuetify|vuetify/.test(source)) return 'vuetify';
    return 'unknown';
}

/**
 * Extract design tokens from a JS/TS theme definition file (MUI, Chakra, Vuetify).
 */
export async function extractFromThemeFile(filePath: string): Promise<RawTokenBag> {
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

    const kind = detectThemeKind(stripped);
    let partial: Partial<RawTokenBag> = {};

    if (kind === 'mui') partial = extractMui(stripped);
    else if (kind === 'chakra') partial = extractChakra(stripped);
    else if (kind === 'vuetify') partial = extractVuetify(stripped);
    else {
        // Generic fallback: try Chakra-style extraction
        partial = extractChakra(stripped);
    }

    return {
        filePath,
        colors: partial.colors ?? [],
        fonts: partial.fonts ?? [],
        spacing: partial.spacing ?? [],
        shadows: partial.shadows ?? [],
        radii: partial.radii ?? [],
    };
}
