#!/usr/bin/env node
/**
 * detect.ts — Project technology detector main entry point.
 *
 * Analyses a project folder and determines its technology stack and UI
 * framework.  Writes results to <project-root>/.ui-convert/project.json.
 *
 * Usage:
 *   npx ts-node scripts/detect.ts <project-path> [--target <tool>] [--force]
 *
 * Supported --target values: pencil | figma | penpot | paper | stitch
 * Default target: pencil
 *
 * Exit codes:
 *   0 — success (project.json written or already exists)
 *   1 — unrecoverable error (empty folder, no recognised tech, etc.)
 */

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execFileAsync = promisify(execFile);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectJson {
    _v: number;
    root: string;
    tech: string;
    uiFramework: string | null;
    techVersion: string | null;
    uiFrameworkVersion: string | null;
    targetTool: string;
    createdAt: string;
    updatedAt: string;
    config: {
        excludePaths: string[];
        includeTests: boolean;
        maxDepth: number;
    };
}

interface DetectionResult {
    tech: string | null;
    version: string | null;
}

// ── CLI parsing ───────────────────────────────────────────────────────────────

interface CliArgs {
    projectPath: string;
    targetTool: string;
    force: boolean;
}

function parseArgs(args: string[]): CliArgs {
    const [, , ...rest] = args;
    let projectPath = '.';
    let targetTool = 'pencil';
    let force = false;

    for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === '--target' && rest[i + 1]) {
            targetTool = rest[++i];
        } else if (arg === '--force') {
            force = true;
        } else if (!arg.startsWith('-')) {
            projectPath = arg;
        }
    }

    return { projectPath: resolve(projectPath), targetTool, force };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
    try {
        await access(p);
        return true;
    } catch {
        return false;
    }
}

function cleanVersion(raw: string): string | null {
    const match = raw.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match ? match[1] : null;
}

// ── Step 2: Config file detection (highest priority) ─────────────────────────

const CONFIG_FILE_MAP: Array<[string, string]> = [
    ['next.config.js', 'nextjs'],
    ['next.config.mjs', 'nextjs'],
    ['next.config.ts', 'nextjs'],
    ['nuxt.config.js', 'nuxt'],
    ['nuxt.config.ts', 'nuxt'],
    ['angular.json', 'angular'],
    ['.angular-cli.json', 'angular'],
    ['svelte.config.js', 'svelte'],
    ['svelte.config.ts', 'svelte'],
    ['remix.config.js', 'remix'],
    ['remix.config.ts', 'remix'],
];

async function detectFromConfigFiles(root: string): Promise<DetectionResult | null> {
    for (const [file, tech] of CONFIG_FILE_MAP) {
        if (await fileExists(join(root, file))) {
            return { tech, version: null };
        }
    }
    return null;
}

// ── Step 3: Package.json dependency detection ─────────────────────────────────

const PKG_DEP_MAP: Array<[string, string]> = [
    ['next', 'nextjs'],
    ['@remix-run/react', 'remix'],
    ['@angular/core', 'angular'],
    ['nuxt', 'nuxt'],
    ['@sveltejs/kit', 'svelte'],
    ['svelte', 'svelte'],
    ['react-native', 'react-native'],
    ['vue', 'vue'],
    ['react', 'react'],
];

async function detectFromPackageJson(root: string): Promise<DetectionResult | null> {
    const pkgPath = join(root, 'package.json');
    if (!(await fileExists(pkgPath))) return null;

    let pkg: Record<string, unknown>;
    try {
        pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    } catch {
        return null;
    }

    const deps: Record<string, string> = {
        ...(pkg.dependencies as Record<string, string> | undefined ?? {}),
        ...(pkg.devDependencies as Record<string, string> | undefined ?? {}),
    };

    for (const [dep, tech] of PKG_DEP_MAP) {
        if (dep in deps) {
            return { tech, version: cleanVersion(deps[dep] ?? '') };
        }
    }
    return null;
}

// ── Step 4: File extension detection ─────────────────────────────────────────

const IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**'];

async function detectFromExtensions(root: string): Promise<DetectionResult | null> {
    const checks: Array<[string[], string]> = [
        [['**/*.razor'], 'blazor'],
        [['**/*.cshtml'], 'razor'],
        [['**/*.aspx', '**/*.ascx'], 'webforms'],
        [['**/*.xaml'], 'wpf'],        // further disambiguated below
        [['**/*.Designer.cs'], 'winforms'],
        [['**/*.vue'], 'vue'],
        [['**/*.svelte'], 'svelte'],
        [['**/*.blade.php'], 'php-blade'],
        [['**/*.twig'], 'php-twig'],
        [['lib/**/*.dart', 'src/**/*.dart'], 'flutter'],
    ];

    for (const [patterns, tech] of checks) {
        const files = await fg(patterns, { cwd: root, ignore: IGNORE, deep: 5, onlyFiles: true });
        if (files.length === 0) continue;

        if (tech === 'wpf') {
            // Peek first XAML file to distinguish WPF vs WinUI
            try {
                const content = await readFile(join(root, files[0]), 'utf-8');
                if (/microsoft\.ui\.xaml/i.test(content)) {
                    return { tech: 'winui', version: null };
                }
            } catch { /* fall through to wpf */ }
        }

        return { tech, version: null };
    }
    return null;
}

// ── Step 5: UI framework detection ───────────────────────────────────────────

const UI_FRAMEWORK_PKG_MAP: Array<[string, string]> = [
    ['tailwindcss', 'tailwind'],
    ['bootstrap', 'bootstrap'],
    ['@mui/material', 'mui'],
    ['@emotion/react', 'emotion'],
    ['antd', 'antd'],
    ['@chakra-ui/react', 'chakra'],
    ['vuetify', 'vuetify'],
    ['@mantine/core', 'mantine'],
    ['@headlessui/react', 'headlessui'],
    ['@radix-ui/react-icons', 'radix'],
    ['styled-components', 'styled-components'],
];

async function detectUiFramework(root: string): Promise<{ framework: string | null; version: string | null }> {
    // tailwind.config.* takes precedence
    const twConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
    for (const cfg of twConfigs) {
        if (await fileExists(join(root, cfg))) return { framework: 'tailwind', version: null };
    }

    // components.json → shadcn/ui (which wraps Tailwind + Radix)
    if (await fileExists(join(root, 'components.json'))) {
        return { framework: 'shadcn', version: null };
    }

    // package.json deps
    const pkgPath = join(root, 'package.json');
    if (await fileExists(pkgPath)) {
        let pkg: Record<string, unknown>;
        try {
            pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        } catch {
            return { framework: null, version: null };
        }
        const deps: Record<string, string> = {
            ...(pkg.dependencies as Record<string, string> | undefined ?? {}),
            ...(pkg.devDependencies as Record<string, string> | undefined ?? {}),
        };
        for (const [dep, framework] of UI_FRAMEWORK_PKG_MAP) {
            if (dep in deps) {
                return { framework, version: cleanVersion(deps[dep] ?? '') };
            }
        }
    }

    // @tailwind directive in CSS files (shallow search)
    const cssFiles = await fg(['**/*.css', '**/*.scss'], {
        cwd: root, ignore: IGNORE, deep: 3, limit: 20,
    });
    for (const cssFile of cssFiles) {
        const content = await readFile(join(root, cssFile), 'utf-8').catch(() => '');
        if (content.includes('@tailwind')) return { framework: 'tailwind', version: null };
    }

    return { framework: null, version: null };
}

// ── External Python detection ─────────────────────────────────────────────────

async function runPythonDetector(script: string, projectPath: string): Promise<DetectionResult | null> {
    const scriptPath = join(__dirname, script);
    if (!(await fileExists(scriptPath))) return null;

    try {
        const { stdout } = await execFileAsync('python3', [scriptPath, projectPath], { timeout: 15_000 });
        const result = JSON.parse(stdout.trim());
        if (result?.tech) return result;
    } catch {
        /* Python not available or script errored — silently skip */
    }
    return null;
}

// ── Logging helper ────────────────────────────────────────────────────────────

async function logError(logsDir: string, message: string, projectPath: string): Promise<void> {
    const entry = JSON.stringify({ level: 'error', message, path: projectPath, ts: new Date().toISOString() });
    await writeFile(join(logsDir, 'errors.jsonl'), entry + '\n', { flag: 'a' }).catch(() => { });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const { projectPath, targetTool, force } = parseArgs(argv);

    const stateDir = join(projectPath, '.ui-convert');
    const logsDir = join(stateDir, 'logs');
    const irDir = join(stateDir, 'ir');
    const outputPath = join(stateDir, 'project.json');

    // Idempotency: skip if already detected and --force not set
    if (!force && (await fileExists(outputPath))) {
        const existing = await readFile(outputPath, 'utf-8');
        process.stdout.write(existing);
        return;
    }

    if (!(await fileExists(projectPath))) {
        console.error(`Error: Project path not found: ${projectPath}`);
        exit(1);
    }

    // Ensure state directories exist
    await mkdir(stateDir, { recursive: true });
    await mkdir(logsDir, { recursive: true });
    await mkdir(irDir, { recursive: true });

    const now = new Date().toISOString();
    let tech: string | null = null;
    let techVersion: string | null = null;

    // Step 2: Config files
    const cfgResult = await detectFromConfigFiles(projectPath);
    if (cfgResult) { tech = cfgResult.tech; techVersion = cfgResult.version; }

    // Step 3: Package.json deps
    if (!tech) {
        const pkgResult = await detectFromPackageJson(projectPath);
        if (pkgResult) { tech = pkgResult.tech; techVersion = pkgResult.version; }
    }

    // Step 4: File extensions
    if (!tech) {
        const extResult = await detectFromExtensions(projectPath);
        if (extResult) { tech = extResult.tech; techVersion = extResult.version; }
    }

    // Step 4b: .NET detection via Python script
    if (!tech) {
        const hasCsproj = (await fg(['**/*.csproj'], { cwd: projectPath, ignore: IGNORE, deep: 3 })).length > 0;
        if (hasCsproj) {
            const r = await runPythonDetector('detect_dotnet.py', projectPath);
            if (r) { tech = r.tech; techVersion = r.version; }
        }
    }

    // Step 4c: Python project detection
    if (!tech) {
        const hasPyIndicators = (await fg(
            ['requirements.txt', 'pyproject.toml', 'manage.py', 'wsgi.py'],
            { cwd: projectPath, deep: 2, onlyFiles: true },
        )).length > 0;
        if (hasPyIndicators) {
            const r = await runPythonDetector('detect_python.py', projectPath);
            if (r) { tech = r.tech; techVersion = r.version; }
        }
    }

    if (!tech) {
        await logError(logsDir, 'No recognised technology found', projectPath);
        console.error(`Error: No recognised technology found in project: ${projectPath}`);
        exit(1);
    }

    // Step 5: UI framework
    const { framework: uiFramework, version: uiFrameworkVersion } = await detectUiFramework(projectPath);

    // Step 6: Write project.json
    const projectJson: ProjectJson = {
        _v: 1,
        root: projectPath,
        tech: tech!,
        uiFramework: uiFramework ?? null,
        techVersion: techVersion ?? null,
        uiFrameworkVersion: uiFrameworkVersion ?? null,
        targetTool,
        createdAt: now,
        updatedAt: now,
        config: {
            excludePaths: ['node_modules', 'dist', 'build', '.git', '.next', '.nuxt', 'out', 'coverage'],
            includeTests: false,
            maxDepth: 10,
        },
    };

    const output = JSON.stringify(projectJson, null, 2) + '\n';
    await writeFile(outputPath, output);
    process.stdout.write(output);
}

main().catch(err => {
    console.error('Detection failed:', (err as Error).message);
    exit(1);
});
