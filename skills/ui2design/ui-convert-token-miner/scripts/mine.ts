#!/usr/bin/env node
/**
 * mine.ts — Design-token miner main entry point.
 *
 * Reads .ui-convert/project.json and .ui-convert/index.json, routes each
 * "style" artifact to the appropriate extractor, deduplicates all tokens,
 * and writes .ui-convert/tokens.json.
 *
 * Usage:
 *   npx ts-node scripts/mine.ts [project-root]
 */

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import fg from 'fast-glob';

import type { RawTokenBag } from './css-extractor.js';
import { extractFromCss } from './css-extractor.js';
import { extractFromTailwindConfig } from './tailwind-extractor.js';
import { extractFromThemeFile } from './theme-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execFileAsync = promisify(execFile);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectJson {
    _v: number;
    root: string;
    tech: string;
    uiFramework: string | null;
}

interface Artifact {
    id: string;
    path: string;
    category: string;
}

interface IndexJson {
    _v: number;
    artifacts: Artifact[];
}

interface ColorEntry { value: string; name: string; source: string }
interface FontEntry { family: string; weights: number[]; source: string }
interface SpacingEntry { value: number; name: string; source: string }
interface ShadowEntry { value: Record<string, unknown>; name: string; source: string }
interface RadiusEntry { value: number; name: string; source: string }

interface TokensJson {
    _v: number;
    source: string;
    colors: Record<string, ColorEntry>;
    fonts: Record<string, FontEntry>;
    spacing: Record<string, SpacingEntry>;
    shadows: Record<string, ShadowEntry>;
    radii: Record<string, RadiusEntry>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
    try { await access(p); return true; } catch { return false; }
}

async function runPython(script: string, args: string[]): Promise<unknown[] | null> {
    const scriptPath = join(__dirname, script);
    if (!(await fileExists(scriptPath))) return null;
    try {
        const { stdout } = await execFileAsync('python3', [scriptPath, ...args], { timeout: 30_000 });
        return JSON.parse(stdout.trim()) as unknown[];
    } catch {
        return null;
    }
}

/** Short sequential ID generator. */
function makeIdGen(prefix: string): () => string {
    let n = 0;
    return () => `${prefix}${++n}`;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

/** Merge all RawTokenBags into deduplicated token maps. */
function deduplicate(bags: RawTokenBag[]): Omit<TokensJson, '_v' | 'source'> {
    const colorMap = new Map<string, ColorEntry>();   // key: hex value
    const fontMap = new Map<string, FontEntry>();    // key: lowercased family name
    const spacingMap = new Map<number, SpacingEntry>(); // key: px number
    const shadowMap = new Map<string, ShadowEntry>();  // key: serialised shadow
    const radiusMap = new Map<number, RadiusEntry>();  // key: px number

    const cId = makeIdGen('c');
    const fId = makeIdGen('f');
    const sId = makeIdGen('s');
    const shId = makeIdGen('sh');
    const rId = makeIdGen('r');

    // Semantic "weight" — prefer names that look like design tokens
    const isSemanticName = (name: string) =>
        /primary|secondary|accent|brand|neutral|surface|background|text|foreground|body|heading/.test(name.toLowerCase());

    for (const bag of bags) {
        // Colors
        for (const c of bag.colors) {
            const existing = colorMap.get(c.value);
            if (!existing) {
                colorMap.set(c.value, { value: c.value, name: c.name, source: c.source });
            } else if (!isSemanticName(existing.name) && isSemanticName(c.name)) {
                // Prefer more semantic name but keep original source
                colorMap.set(c.value, { ...existing, name: c.name });
            }
        }

        // Fonts
        for (const f of bag.fonts) {
            const key = f.family.toLowerCase();
            const existing = fontMap.get(key);
            if (!existing) {
                fontMap.set(key, { family: f.family, weights: [...f.weights], source: f.source });
            } else {
                // Merge weight lists
                const merged = Array.from(new Set([...existing.weights, ...f.weights])).sort((a, b) => a - b);
                fontMap.set(key, { ...existing, weights: merged });
            }
        }

        // Spacing
        for (const sp of bag.spacing) {
            if (!spacingMap.has(sp.value)) {
                spacingMap.set(sp.value, { value: sp.value, name: sp.name, source: sp.source });
            }
        }

        // Shadows
        for (const sh of bag.shadows) {
            const key = JSON.stringify(sh.value);
            if (!shadowMap.has(key)) {
                shadowMap.set(key, { value: sh.value as Record<string, unknown>, name: sh.name, source: sh.source });
            }
        }

        // Radii
        for (const r of bag.radii) {
            if (!radiusMap.has(r.value)) {
                radiusMap.set(r.value, { value: r.value, name: r.name, source: r.source });
            }
        }
    }

    // Assign short IDs
    const colors: Record<string, ColorEntry> = {};
    const fonts: Record<string, FontEntry> = {};
    const spacing: Record<string, SpacingEntry> = {};
    const shadows: Record<string, ShadowEntry> = {};
    const radii: Record<string, RadiusEntry> = {};

    for (const v of colorMap.values()) colors[cId()] = v;
    for (const v of fontMap.values()) fonts[fId()] = v;
    // Sort spacing ascending before assigning IDs
    const spacingSorted = Array.from(spacingMap.values()).sort((a, b) => a.value - b.value);
    for (const v of spacingSorted) spacing[sId()] = v;
    for (const v of shadowMap.values()) shadows[shId()] = v;
    const radiiSorted = Array.from(radiusMap.values()).sort((a, b) => a.value - b.value);
    for (const v of radiiSorted) radii[rId()] = v;

    return { colors, fonts, spacing, shadows, radii };
}

// ── Routing logic ─────────────────────────────────────────────────────────────

/** Decide which extractor to use for a given file. */
type ExtractorTag = 'css' | 'tailwind' | 'theme' | 'xaml' | 'dart' | 'skip';

function routeArtifact(filePath: string, tech: string, uiFramework: string | null): ExtractorTag {
    const ext = extname(filePath).toLowerCase();
    const name = basename(filePath).toLowerCase();

    if (name.startsWith('tailwind.config')) return 'tailwind';
    if (/theme\.(js|ts|jsx|tsx)$/.test(name)) return 'theme';
    if (/(createtheme|extendtheme|createvuetify)/i.test(name)) return 'theme';

    if (ext === '.xaml') return 'xaml';
    if (ext === '.dart') return 'dart';
    if (['.css', '.scss', '.sass', '.less'].includes(ext)) return 'css';

    return 'skip';
}

// ── Load existing tokens (additive mode) ──────────────────────────────────────

async function loadExistingTokens(tokensPath: string): Promise<TokensJson | null> {
    if (!(await fileExists(tokensPath))) return null;
    try {
        return JSON.parse(await readFile(tokensPath, 'utf-8')) as TokensJson;
    } catch {
        return null;
    }
}

/** Merge new dedup result into existing tokens (additive — never removes). */
function mergeIntoExisting(
    existing: TokensJson | null,
    fresh: Omit<TokensJson, '_v' | 'source'>,
): Omit<TokensJson, '_v' | 'source'> {
    if (!existing) return fresh;

    // Build reverse maps so we don't re-add duplicates
    const existingColorValues = new Set(Object.values(existing.colors).map(c => c.value));
    const existingFamilies = new Set(Object.values(existing.fonts).map(f => f.family.toLowerCase()));
    const existingSpacingValues = new Set(Object.values(existing.spacing).map(s => s.value));
    const existingRadiiValues = new Set(Object.values(existing.radii).map(r => r.value));

    const cOffset = Object.keys(existing.colors).length;
    const fOffset = Object.keys(existing.fonts).length;
    const sOffset = Object.keys(existing.spacing).length;
    const shOffset = Object.keys(existing.shadows).length;
    const rOffset = Object.keys(existing.radii).length;

    const newColors: Record<string, ColorEntry> = {};
    const newFonts: Record<string, FontEntry> = {};
    const newSpacing: Record<string, SpacingEntry> = {};
    const newShadows: Record<string, ShadowEntry> = {};
    const newRadii: Record<string, RadiusEntry> = {};

    let ci = cOffset + 1, fi = fOffset + 1, si = sOffset + 1, shi = shOffset + 1, ri = rOffset + 1;

    for (const v of Object.values(fresh.colors)) {
        if (!existingColorValues.has(v.value)) { newColors[`c${ci++}`] = v; }
    }
    for (const v of Object.values(fresh.fonts)) {
        if (!existingFamilies.has(v.family.toLowerCase())) { newFonts[`f${fi++}`] = v; }
    }
    for (const v of Object.values(fresh.spacing)) {
        if (!existingSpacingValues.has(v.value)) { newSpacing[`s${si++}`] = v; }
    }
    for (const v of Object.values(fresh.shadows)) {
        newShadows[`sh${shi++}`] = v;  // shadows don't deduplicate across runs
    }
    for (const v of Object.values(fresh.radii)) {
        if (!existingRadiiValues.has(v.value)) { newRadii[`r${ri++}`] = v; }
    }

    return {
        colors: { ...existing.colors, ...newColors },
        fonts: { ...existing.fonts, ...newFonts },
        spacing: { ...existing.spacing, ...newSpacing },
        shadows: { ...existing.shadows, ...newShadows },
        radii: { ...existing.radii, ...newRadii },
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const [, , argPath] = argv;
    const searchRoot = argPath ? resolve(argPath) : resolve('.');
    const stateDir = join(searchRoot, '.ui-convert');

    const projectJsonPath = join(stateDir, 'project.json');
    const indexJsonPath = join(stateDir, 'index.json');
    const tokensJsonPath = join(stateDir, 'tokens.json');

    if (!(await fileExists(projectJsonPath))) {
        console.error(`Error: project.json not found at ${projectJsonPath}`);
        exit(1);
    }
    if (!(await fileExists(indexJsonPath))) {
        console.error(`Error: index.json not found at ${indexJsonPath}`);
        exit(1);
    }

    let projectJson: ProjectJson;
    let indexJson: IndexJson;
    try {
        projectJson = JSON.parse(await readFile(projectJsonPath, 'utf-8'));
        indexJson = JSON.parse(await readFile(indexJsonPath, 'utf-8'));
    } catch (err: unknown) {
        console.error('Error parsing state files:', (err as Error).message);
        exit(1);
    }

    const { root, tech, uiFramework } = projectJson;

    // Filter to style artifacts
    const styleArtifacts = indexJson.artifacts.filter(a => a.category === 'style');

    // Also always scan tailwind.config.* if present (may be classified as irrelevant)
    const tailwindConfigs = await fg(
        ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'],
        { cwd: root, onlyFiles: true, deep: 2 },
    );
    const allStylePaths = new Set([
        ...styleArtifacts.map(a => a.path),
        ...tailwindConfigs,
    ]);

    const bags: RawTokenBag[] = [];

    // Collect files by extractor type for batching Python calls
    const xamlFiles: string[] = [];
    const dartFiles: string[] = [];

    for (const relPath of allStylePaths) {
        const absPath = join(root, relPath);
        const tag = routeArtifact(relPath, tech, uiFramework);

        switch (tag) {
            case 'css':
                bags.push(await extractFromCss(absPath));
                break;
            case 'tailwind':
                bags.push(await extractFromTailwindConfig(absPath));
                break;
            case 'theme':
                bags.push(await extractFromThemeFile(absPath));
                break;
            case 'xaml':
                xamlFiles.push(absPath);
                break;
            case 'dart':
                dartFiles.push(absPath);
                break;
            default:
                break;
        }
    }

    // Batch XAML extraction via Python
    if (xamlFiles.length > 0) {
        const results = await runPython('xaml-extractor.py', xamlFiles);
        if (Array.isArray(results)) {
            for (const r of results) {
                tabs: if (r && typeof r === 'object') {
                    const bag = r as RawTokenBag;
                    bags.push(bag);
                }
            }
        }
    }

    // Batch Dart extraction via Python
    if (dartFiles.length > 0) {
        const results = await runPython('dart-extractor.py', dartFiles);
        if (Array.isArray(results)) {
            for (const r of results) {
                if (r && typeof r === 'object') {
                    const bag = r as RawTokenBag;
                    bags.push(bag);
                }
            }
        }
    }

    // Deduplicate
    const fresh = deduplicate(bags);

    // Additive merge with existing tokens
    const existing = await loadExistingTokens(tokensJsonPath);
    const merged = mergeIntoExisting(existing, fresh);

    // Primary source label
    const primarySource =
        tailwindConfigs[0] ??
        styleArtifacts[0]?.path ??
        tech;

    const tokensJson: TokensJson = {
        _v: 1,
        source: primarySource,
        ...merged,
    };

    await mkdir(stateDir, { recursive: true });
    const output = JSON.stringify(tokensJson, null, 2) + '\n';
    await writeFile(tokensJsonPath, output);
    process.stdout.write(output);
}

main().catch(err => {
    console.error('Token mining failed:', (err as Error).message);
    exit(1);
});
