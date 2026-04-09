/**
 * normalize.ts — Design-token value normalization utilities.
 *
 * Converts raw CSS / theme values into the canonical forms used in tokens.json:
 *   - Colors   → lowercase hex6 or rgba(…) string
 *   - Spacing   → number (px equivalent)
 *   - Fonts     → first font-family name (string)
 *   - Shadows   → { x, y, b, s, c } object
 *   - Radii     → number (px)
 */

// ── Color normalization ───────────────────────────────────────────────────────

/** Named CSS colors → hex6 (common subset). */
const NAMED_COLORS: Record<string, string> = {
    white: '#ffffff', black: '#000000',
    red: '#ff0000', green: '#008000', blue: '#0000ff',
    yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', gray: '#808080', grey: '#808080',
    transparent: 'transparent',
};

/** hex3 → hex6, e.g. #abc → #aabbcc */
function expandHex3(hex: string): string {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
        return '#' + clean.split('').map(c => c + c).join('');
    }
    return hex;
}

/**
 * Parse RGB(A) channel values from an `rgb(…)` or `rgba(…)` string.
 * Returns null if parsing fails.
 */
function parseRgb(value: string): { r: number; g: number; b: number; a?: number } | null {
    const m = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!m) return null;
    return {
        r: Math.round(Number(m[1])),
        g: Math.round(Number(m[2])),
        b: Math.round(Number(m[3])),
        ...(m[4] !== undefined ? { a: Number(m[4]) } : {}),
    };
}

/** Convert integer 0-255 to 2-char hex string. */
function toHex2(n: number): string {
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
}

/**
 * Normalise any colour value to lowercase hex6 or `rgba(…)`.
 * Returns null if the input is not a recognisable colour.
 */
export function normalizeColor(raw: string): string | null {
    const v = raw.trim().toLowerCase();
    if (!v) return null;

    // Named color
    if (NAMED_COLORS[v]) return NAMED_COLORS[v];

    // Hex: #rgb, #rrggbb, #rrggbbaa
    if (/^#[0-9a-f]{3}$/.test(v)) return expandHex3(v);
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    if (/^#[0-9a-f]{8}$/.test(v)) return '#' + v.slice(1, 7); // strip alpha

    // rgb() → hex
    const rgb = parseRgb(v);
    if (rgb) {
        if (rgb.a !== undefined && rgb.a < 1) {
            return `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
        }
        return '#' + toHex2(rgb.r) + toHex2(rgb.g) + toHex2(rgb.b);
    }

    // hsl() — keep as raw since converting requires trig; mark as-is
    if (/^hsl/.test(v)) return v;

    // Flutter/Android 0xFF notation
    const flutterMatch = v.match(/^0xff([0-9a-f]{6})$/);
    if (flutterMatch) return '#' + flutterMatch[1];

    // WPF: #FFRRGGBB (8-char with alpha prefix)
    const wpfMatch = raw.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{6})$/);
    if (wpfMatch) return '#' + wpfMatch[2].toLowerCase();

    return null;
}

// ── Spacing normalization ─────────────────────────────────────────────────────

const REM_BASE = 16; // standard browser rem base

/**
 * Normalise a spacing/size value to a pixel number.
 * Returns null if the value cannot be parsed.
 */
export function normalizeSpacing(raw: string): number | null {
    const v = raw.trim().toLowerCase();

    // Plain px
    const px = v.match(/^([\d.]+)px$/);
    if (px) return parseFloat(px[1]);

    // rem
    const rem = v.match(/^([\d.]+)rem$/);
    if (rem) return Math.round(parseFloat(rem[1]) * REM_BASE);

    // em (assume 16px base; imprecise but useful as approximation)
    const em = v.match(/^([\d.]+)em$/);
    if (em) return Math.round(parseFloat(em[1]) * REM_BASE);

    // Bare number (already px)
    const bare = v.match(/^([\d.]+)$/);
    if (bare) return parseFloat(bare[1]);

    // pt (1pt ≈ 1.333px)
    const pt = v.match(/^([\d.]+)pt$/);
    if (pt) return Math.round(parseFloat(pt[1]) * 1.333);

    return null;
}

// ── Font normalization ────────────────────────────────────────────────────────

/**
 * Extract the primary font-family name from a CSS font-family string.
 * e.g. `'Inter', sans-serif` → `Inter`
 */
export function normalizeFontFamily(raw: string): string | null {
    if (!raw?.trim()) return null;
    // Take the first font family (before the first comma)
    const first = raw.split(',')[0].trim().replace(/['"]/g, '');
    return first || null;
}

// ── Shadow normalization ──────────────────────────────────────────────────────

export interface ShadowToken {
    x: number;
    y: number;
    b: number;   // blur
    s: number;   // spread
    c: string;   // color
    inset: boolean;
}

/**
 * Parse a CSS box-shadow value into structured components.
 * Handles single-layer shadows only (use the first layer for multi-layer).
 */
export function normalizeShadow(raw: string): ShadowToken | null {
    if (!raw?.trim() || raw.trim() === 'none') return null;

    // Take only the first shadow layer (split on ',' not within parens)
    const firstLayer = raw.split(/,(?![^(]*\))/)[0].trim();
    const inset = /\binset\b/.test(firstLayer);
    const withoutInset = firstLayer.replace(/\binset\b/, '').trim();

    // Extract color (could be at start or end, hex or rgb/rgba)
    const colorMatch =
        withoutInset.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/) ?? null;
    const rawColor = colorMatch ? colorMatch[1] : 'rgba(0,0,0,0.1)';
    const colorNorm = normalizeColor(rawColor) ?? rawColor;

    // Remove color from the string and parse numeric parts
    const withoutColor = withoutInset.replace(colorMatch ? colorMatch[1] : '', '').trim();
    const numbers = withoutColor.match(/-?[\d.]+(?:px|rem|em)?/g) ?? [];
    const values = numbers.map(n => normalizeSpacing(n) ?? parseFloat(n));

    const [x = 0, y = 0, b = 0, s = 0] = values;

    return { x, y, b, s, c: colorNorm, inset };
}
