/**
 * hash.ts — SHA-256 file hashing utility for the artifact scanner.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Compute the SHA-256 hash of a file's content.
 * Returns a prefixed string like `sha256:abc123...`.
 */
export async function hashFile(filePath: string): Promise<string> {
    const content = await readFile(filePath);
    const digest = createHash('sha256').update(content).digest('hex');
    return `sha256:${digest}`;
}
