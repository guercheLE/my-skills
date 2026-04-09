/**
 * deps.ts — Import/dependency detection for the artifact scanner.
 *
 * Parses static import and require statements in source files and matches
 * them against the set of already-scanned artifacts to build the
 * `deps` array recorded in index.json.
 */

import { readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

export interface ArtifactRef {
    id: string;
    path: string;  // relative path from project root (forward slashes)
}

// ── Regex bank ────────────────────────────────────────────────────────────────

// ES module: import ... from '...'  or  export ... from '...'
const RE_ESM_FROM = /(?:import|export)\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;

// Dynamic import(): import('...')
const RE_DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// CommonJS require('...')
const RE_REQUIRE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Vue/Angular: template src="..." or styleUrls: [...]
const RE_SRC_ATTR = /\bsrc\s*=\s*['"]([^'"]+)['"]/g;
const RE_STYLE_URLS = /styleUrls\s*:\s*\[([^\]]*)\]/g;
const RE_TEMPLATE_URL = /templateUrl\s*:\s*['"]([^'"]+)['"]/g;

// CSS @import
const RE_CSS_IMPORT = /@import\s+(?:url\s*\()?\s*['"]([^'"]+)['"]/g;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractAllSpecifiers(content: string, fileExt: string): string[] {
    const specifiers: string[] = [];

    const collect = (re: RegExp) => {
        const clone = new RegExp(re.source, re.flags);
        let m: RegExpExecArray | null;
        while ((m = clone.exec(content)) !== null) {
            specifiers.push(m[1]);
        }
    };

    if (['.css', '.scss', '.sass', '.less'].includes(fileExt)) {
        collect(RE_CSS_IMPORT);
        return specifiers;
    }

    collect(RE_ESM_FROM);
    collect(RE_DYNAMIC_IMPORT);
    collect(RE_REQUIRE);
    collect(RE_SRC_ATTR);
    collect(RE_TEMPLATE_URL);

    // styleUrls: ['./foo.css', './bar.scss']
    const reStyleUrls = new RegExp(RE_STYLE_URLS.source, RE_STYLE_URLS.flags);
    let m: RegExpExecArray | null;
    while ((m = reStyleUrls.exec(content)) !== null) {
        const inner = m[1];
        const rePath = /['"]([^'"]+)['"]/g;
        let mp: RegExpExecArray | null;
        while ((mp = rePath.exec(inner)) !== null) {
            specifiers.push(mp[1]);
        }
    }

    return specifiers;
}

/**
 * Resolve a raw import specifier to a normalised project-relative path,
 * trying common extensions if the specifier has none.
 */
function resolveSpecifier(
    specifier: string,
    fromFile: string,
    projectRoot: string,
): string | null {
    // Skip node_modules, built-ins, URLs, and non-relative specifiers
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
    if (specifier.startsWith('http') || specifier.startsWith('//')) return null;

    const fromDir = dirname(join(projectRoot, fromFile));
    let absoluteTarget = resolve(fromDir, specifier);

    // Make relative to project root
    const relTarget = relative(projectRoot, absoluteTarget).replace(/\\/g, '/');

    // If specifier already has a recognised extension, return as-is
    const ext = extname(relTarget);
    if (ext && ext !== '.') return relTarget;

    // Try common extensions in priority order
    const EXTS = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.css', '.scss', '.module.css', '.module.scss'];
    for (const candidate of EXTS) {
        const withExt = relTarget + candidate;
        // We can't stat files here (we only have artifact list), so just return
        // the first match found in the artifact set (done in caller).
        // We store all candidates for matching.
        void withExt; // silence lint
    }

    return relTarget;
}

/**
 * Build a lookup map: normalised path (no leading ./) → artifact id.
 */
function buildArtifactMap(artifacts: ArtifactRef[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const a of artifacts) {
        const normalised = a.path.replace(/\\/g, '/').replace(/^\.\//, '');
        map.set(normalised, a.id);

        // Also store without extension for fuzzy matching
        const withoutExt = normalised.replace(/\.[^/.]+$/, '');
        if (!map.has(withoutExt)) map.set(withoutExt, a.id);
    }
    return map;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect which other artifacts a file depends on.
 *
 * @param filePath        Absolute path to the file being analysed.
 * @param projectRoot     Absolute project root path.
 * @param allArtifacts    All artifacts collected so far (for cross-referencing).
 * @returns               Array of artifact IDs that this file imports.
 */
export async function detectDeps(
    filePath: string,
    projectRoot: string,
    allArtifacts: ArtifactRef[],
): Promise<string[]> {
    let content: string;
    try {
        content = await readFile(filePath, 'utf-8');
    } catch {
        return [];
    }

    const fromFile = relative(projectRoot, filePath).replace(/\\/g, '/');
    const fileExt = extname(filePath);
    const artifactMap = buildArtifactMap(allArtifacts);

    const specifiers = extractAllSpecifiers(content, fileExt);
    const depIds = new Set<string>();

    for (const spec of specifiers) {
        const resolved = resolveSpecifier(spec, fromFile, projectRoot);
        if (!resolved) continue;

        // Direct match
        const directId = artifactMap.get(resolved.replace(/^\.\//, ''));
        if (directId) {
            depIds.add(directId);
            continue;
        }

        // Extension-stripped match (handles .js → .ts resolution in ESM)
        const withoutExt = resolved.replace(/\.[^/.]+$/, '');
        const fuzzyId = artifactMap.get(withoutExt);
        if (fuzzyId) {
            depIds.add(fuzzyId);
            continue;
        }

        // Try appending common extensions
        const EXTS = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte', '.css', '.scss'];
        for (const ext of EXTS) {
            const candidate = withoutExt + ext;
            const id = artifactMap.get(candidate);
            if (id) {
                depIds.add(id);
                break;
            }
        }
    }

    // Remove self-reference
    const selfId = artifactMap.get(fromFile.replace(/^\.\//, ''));
    if (selfId) depIds.delete(selfId);

    return Array.from(depIds);
}
