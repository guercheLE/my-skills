/**
 * classify.ts — Artifact classification rules for the ui2design scanner.
 *
 * Classifies a file path (relative to the project root) into one of:
 *   style | component | page | layout | irrelevant | unknown
 *
 * Rules are applied in strict priority order; the first match wins.
 */

import { basename, dirname, extname } from 'node:path';

export type Category = 'style' | 'component' | 'page' | 'layout' | 'irrelevant' | 'unknown';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a path to forward-slash segments for reliable matching. */
function segments(filePath: string): string[] {
    return filePath.replace(/\\/g, '/').split('/');
}

function hasSegment(parts: string[], segment: string): boolean {
    return parts.some(p => p.toLowerCase() === segment);
}

function hasSegmentMatching(parts: string[], re: RegExp): boolean {
    return parts.some(p => re.test(p.toLowerCase()));
}

// ── Rule sets ─────────────────────────────────────────────────────────────────

const IRRELEVANT_PATH_SEGMENTS = [
    '__tests__', '__mocks__', '__fixtures__',
    'test', 'tests', 'e2e', 'cypress', 'playwright',
    'storybook', '.storybook',
    'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'out',
    'coverage', '.cache', 'public', 'static', 'assets',
    'scripts', 'migrations', 'generated', '__generated__',
];

const IRRELEVANT_EXTENSIONS = new Set([
    '.d.ts', '.json', '.lock', '.log', '.md', '.txt',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.ogg', '.mp3',
    '.pdf', '.zip', '.tar', '.gz',
]);

const IRRELEVANT_FILENAME_PATTERNS = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /\.stories\.[jt]sx?$/,
    /\.story\.[jt]sx?$/,
    /\.config\.[jt]sx?$/,
    /\.config\.mjs$/,
    /^vite\.config/,
    /^webpack\.config/,
    /^babel\.config/,
    /^jest\.config/,
    /^eslint/,
    /^prettier/,
    /^rollup\.config/,
    /^postcss\.config/,
    /\.d\.ts$/,
];

const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);

const STYLE_FILENAME_PATTERNS = [
    /^global[s]?\./i,
    /^theme\./i,
    /^variables\./i,
    /^reset\./i,
    /^normalize\./i,
    /^tokens\./i,
    /\.module\.(css|scss|sass|less)$/i,
];

const STYLE_PATH_SEGMENTS = ['styles', 'style', 'theme', 'themes', 'css', 'scss', 'sass'];

const PAGE_PATH_SEGMENTS = ['pages', 'views', 'screens', 'routes', 'app'];
const PAGE_FILENAME_PATTERNS = [
    /^page\.[jt]sx?$/i,
    /^index\.[jt]sx?$/i,
    /^\[.*\]\.[jt]sx?$/,        // Next.js dynamic segments
    /^\.\.\..*\.[jt]sx?$/,
];

const LAYOUT_PATH_SEGMENTS = ['layouts', 'layout'];
const LAYOUT_FILENAME_PATTERNS = [
    /layout\.[jt]sx?$/i,
    /shell\.[jt]sx?$/i,
    /wrapper\.[jt]sx?$/i,
    /template\.[jt]sx?$/i,
    /frame\.[jt]sx?$/i,
    /^_app\.[jt]sx?$/i,
    /^_document\.[jt]sx?$/i,
];

const COMPONENT_PATH_SEGMENTS = ['components', 'component', 'ui', 'shared', 'common', 'widgets'];

// ── Technology-specific overrides ─────────────────────────────────────────────

interface TechRule {
    pageExtensions?: string[];
    componentExtensions?: string[];
    styleExtensions?: string[];
}

const TECH_RULES: Record<string, TechRule> = {
    angular: {
        componentExtensions: ['.component.ts', '.component.html', '.component.css', '.component.scss'],
        styleExtensions: ['.css', '.scss'],
    },
    vue: {
        componentExtensions: ['.vue'],
    },
    svelte: {
        componentExtensions: ['.svelte'],
    },
    flutter: {
        pageExtensions: ['.dart'],
    },
    wpf: {
        styleExtensions: ['.xaml'],
    },
    winui: {
        styleExtensions: ['.xaml'],
    },
    blazor: {
        componentExtensions: ['.razor'],
    },
    razor: {
        pageExtensions: ['.cshtml'],
    },
};

// ── Main classifier ───────────────────────────────────────────────────────────

/**
 * Classify a file into a visual category.
 *
 * @param filePath  Path relative to the project root (forward or back slashes ok).
 * @param tech      Detected technology from project.json (e.g. "react", "vue").
 * @returns         One of the Category string literals.
 */
export function classify(filePath: string, tech: string): Category {
    const parts = segments(filePath);
    const name = basename(filePath);
    const ext = extname(filePath);
    const dir = dirname(filePath).replace(/\\/g, '/');

    // ── 1. Irrelevant ──────────────────────────────────────────────────────────
    if (IRRELEVANT_EXTENSIONS.has(ext)) return 'irrelevant';
    if (parts.some(p => IRRELEVANT_PATH_SEGMENTS.includes(p.toLowerCase()))) return 'irrelevant';
    if (IRRELEVANT_FILENAME_PATTERNS.some(re => re.test(name))) return 'irrelevant';

    // ── 2. Style ───────────────────────────────────────────────────────────────
    if (STYLE_EXTENSIONS.has(ext)) return 'style';
    if (STYLE_FILENAME_PATTERNS.some(re => re.test(name))) return 'style';
    if (hasSegmentMatching(parts, /^(styles?|theme|themes|css|scss|sass)$/)) return 'style';

    // Tech-specific: XAML resource dictionaries (WPF / WinUI)
    if ((tech === 'wpf' || tech === 'winui') && ext === '.xaml') {
        if (hasSegment(parts, 'resources') || hasSegment(parts, 'themes') || name.toLowerCase().includes('resource')) {
            return 'style';
        }
    }

    // ── 3. Layout ─────────────────────────────────────────────────────────────
    if (LAYOUT_FILENAME_PATTERNS.some(re => re.test(name))) return 'layout';
    if (hasSegmentMatching(parts, /^(layout|layouts)$/)) return 'layout';

    // ── 4. Page ───────────────────────────────────────────────────────────────
    if (PAGE_FILENAME_PATTERNS.some(re => re.test(name))) return 'page';
    if (hasSegmentMatching(parts, /^(pages|views|screens|routes)$/)) return 'page';

    // Next.js App Router: any file named "page.[jt]sx?" inside app/
    if (tech === 'nextjs' && hasSegment(parts, 'app') && /^page\.[jt]sx?$/.test(name)) {
        return 'page';
    }

    // Angular: route-associated components referenced in routing modules (heuristic via path)
    if ((tech === 'angular') && parts.some(p => /views|pages|screens/.test(p))) {
        return 'page';
    }

    // ── 5. Component ──────────────────────────────────────────────────────────
    if (hasSegmentMatching(parts, /^(components?|ui|shared|common|widgets?)$/)) return 'component';

    // Angular: .component.ts / .component.html
    if (tech === 'angular' && /\.(component|directive|pipe)\.(ts|html|css|scss)$/.test(name)) {
        return 'component';
    }

    // Vue SFCs
    if (ext === '.vue') return 'component';

    // Svelte (non-route)
    if (ext === '.svelte') return 'component';

    // React/TSX files that don't match page/layout patterns
    if ((ext === '.tsx' || ext === '.jsx') && /^[A-Z]/.test(name)) return 'component';

    // Razor components
    if ((tech === 'blazor' || tech === 'razor') && ext === '.razor') return 'component';

    // XAML pages/controls
    if ((tech === 'wpf' || tech === 'winui') && ext === '.xaml') {
        if (/window|dialog/i.test(name)) return 'page';
        if (/control|view\./i.test(name)) return 'component';
        return 'unknown';
    }

    // Flutter widgets
    if (tech === 'flutter' && ext === '.dart') {
        if (hasSegmentMatching(parts, /^(screens?|pages?|views?)$/)) return 'page';
        if (hasSegmentMatching(parts, /^(widget|widgets)$/)) return 'component';
        return 'unknown';
    }

    // React/TS utility modules → irrelevant if they live in utils/helpers/hooks/services
    if (hasSegmentMatching(parts, /^(utils?|helpers?|hooks?|services?|api|lib|config)$/)) {
        return 'irrelevant';
    }

    return 'unknown';
}
