#!/usr/bin/env node
/**
 * scan.ts — Artifact scanner main entry point.
 *
 * Reads .ui-convert/project.json, walks the project directory, classifies
 * every source file, computes SHA-256 hashes, resolves inter-artifact
 * dependencies, assigns priority scores, and writes .ui-convert/index.json.
 *
 * Usage:
 *   npx ts-node scripts/scan.ts [project-root]
 *   npx ts-node scripts/scan.ts /path/to/project
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';

import type { Entry } from 'fast-glob';
import fg from 'fast-glob';

import { classify } from './classify.js';
import { detectDeps } from './deps.js';
import { hashFile } from './hash.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectJson {
    _v: number;
    root: string;
    tech: string;
    config: {
        excludePaths: string[];
        maxDepth: number;
    };
}

interface Artifact {
    id: string;
    path: string;
    category: string;
    name: string;
    hash: string;
    deps: string[];
    priority: number;
    size: number;
    lastModified: string;
}

interface IndexJson {
    _v: number;
    total: number;
    artifacts: Artifact[];
}

// ── Tech → file extensions ────────────────────────────────────────────────────

const TECH_EXTENSIONS: Record<string, string[]> = {
    react: ['.jsx', '.tsx', '.js', '.ts', '.css', '.scss', '.module.css', '.module.scss'],
    nextjs: ['.jsx', '.tsx', '.js', '.ts', '.css', '.scss', '.module.css', '.module.scss'],
    remix: ['.jsx', '.tsx', '.js', '.ts', '.css', '.scss'],
    vue: ['.vue', '.js', '.ts', '.css', '.scss'],
    nuxt: ['.vue', '.js', '.ts', '.css', '.scss'],
    angular: ['.ts', '.html', '.css', '.scss'],
    svelte: ['.svelte', '.js', '.ts', '.css'],
    sveltekit: ['.svelte', '.js', '.ts', '.css'],
    html: ['.html', '.css', '.js'],
    blazor: ['.razor', '.cs', '.css'],
    razor: ['.cshtml', '.cs', '.css'],
    webforms: ['.aspx', '.ascx', '.cs', '.vb', '.css'],
    wpf: ['.xaml', '.cs'],
    winui: ['.xaml', '.cs'],
    winforms: ['.cs', '.resx'],
    'php-blade': ['.php', '.blade.php', '.css'],
    'php-twig': ['.php', '.twig', '.css'],
    flutter: ['.dart'],
    'react-native': ['.jsx', '.tsx', '.js', '.ts'],
    'web-components': ['.js', '.ts', '.css'],
    django: ['.html', '.py', '.css'],
    flask: ['.html', '.py', '.css'],
    jinja2: ['.html', '.py', '.css'],
};

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html'];

function getExtensionsForTech(tech: string): string[] {
    return TECH_EXTENSIONS[tech] ?? DEFAULT_EXTENSIONS;
}

// ── Priority assignment ───────────────────────────────────────────────────────

const CATEGORY_BASE_PRIORITY: Record<string, number> = {
    style: 10,
    component: 20,
    layout: 30,
    page: 40,
    unknown: 50,
    irrelevant: 99,
};

/**
 * Assign priority scores using topological-ish ordering:
 * depended-on artifacts get lower numbers (processed first).
 */
function assignPriority(artifacts: Artifact[]): void {
    const idToArtifact = new Map<string, Artifact>(artifacts.map(a => [a.id, a]));

    // Compute in-degree (how many others depend on this artifact)
    const dependedOnCount = new Map<string, number>();
    for (const a of artifacts) {
        for (const dep of a.deps) {
            dependedOnCount.set(dep, (dependedOnCount.get(dep) ?? 0) + 1);
        }
    }

    artifacts.sort((a, b) => {
        const catA = CATEGORY_BASE_PRIORITY[a.category] ?? 50;
        const catB = CATEGORY_BASE_PRIORITY[b.category] ?? 50;
        if (catA !== catB) return catA - catB;

        // Artifacts depended-on by more others go first
        const depA = dependedOnCount.get(a.id) ?? 0;
        const depB = dependedOnCount.get(b.id) ?? 0;
        if (depB !== depA) return depB - depA;

        // Smaller files go first
        return a.size - b.size;
    });

    artifacts.forEach((a, i) => { a.priority = i + 1; });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
    try {
        await access(p);
        return true;
    } catch {
        return false;
    }
}

function buildGlobPatterns(extensions: string[]): string[] {
    return extensions.map(ext => `**/*${ext}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const [, , argPath] = argv;

    // Locate project.json — prefer CLI arg, then current directory
    const searchRoot = argPath ? resolve(argPath) : resolve('.');
    const projectJsonPath = join(searchRoot, '.ui-convert', 'project.json');

    if (!(await fileExists(projectJsonPath))) {
        console.error(`Error: project.json not found at ${projectJsonPath}`);
        console.error('Run the detector first: npx ts-node detect.ts <project-path>');
        exit(1);
    }

    let projectJson: ProjectJson;
    try {
        projectJson = JSON.parse(await readFile(projectJsonPath, 'utf-8'));
    } catch (err: unknown) {
        console.error('Error: Failed to parse project.json:', (err as Error).message);
        exit(1);
    }

    const { root, tech, config } = projectJson;
    const excludePaths: string[] = config?.excludePaths ?? [
        'node_modules', 'dist', 'build', '.git', '.next', '.nuxt', 'out',
    ];
    const maxDepth: number = config?.maxDepth ?? 10;

    const ignorePatterns = excludePaths.map(p => `**/${p}/**`);
    const includePatterns = buildGlobPatterns(getExtensionsForTech(tech));

    // Enumerate files with metadata
    let entries: Entry[];
    try {
        entries = await fg(includePatterns, {
            cwd: root,
            ignore: ignorePatterns,
            deep: maxDepth,
            onlyFiles: true,
            stats: true,
            dot: false,
        });
    } catch (err: unknown) {
        console.error('Error: Directory scan failed:', (err as Error).message);
        exit(1);
    }

    // Build artifact list (without deps first, then fill them in)
    const artifacts: Artifact[] = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const filePath = join(root, entry.path);
        const category = classify(entry.path, tech);
        let hash: string;
        try {
            hash = await hashFile(filePath);
        } catch {
            hash = 'sha256:error';
        }
        const name = basename(entry.path, extname(entry.path));
        const size = entry.stats?.size ?? 0;
        const lastModified = (entry.stats?.mtime ?? new Date()).toISOString();

        artifacts.push({
            id: `a${String(i + 1).padStart(3, '0')}`,
            path: entry.path,
            category,
            name,
            hash,
            deps: [],
            priority: 0,
            size,
            lastModified,
        });
    }

    // Detect dependencies for each artifact
    const artifactRefs = artifacts.map(a => ({ id: a.id, path: a.path }));
    for (const artifact of artifacts) {
        const filePath = join(root, artifact.path);
        artifact.deps = await detectDeps(filePath, root, artifactRefs);
    }

    // Assign priority scores
    assignPriority(artifacts);

    // Write index.json
    const indexJson: IndexJson = {
        _v: 1,
        total: artifacts.length,
        artifacts,
    };

    const indexPath = join(root, '.ui-convert', 'index.json');
    await mkdir(join(root, '.ui-convert'), { recursive: true });
    await writeFile(indexPath, JSON.stringify(indexJson, null, 2) + '\n');

    console.log(JSON.stringify(indexJson, null, 2));
}

main().catch(err => {
    console.error('Scan failed:', (err as Error).message);
    exit(1);
});
