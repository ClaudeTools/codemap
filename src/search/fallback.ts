/**
 * Node.js fallback search when ripgrep is not available
 */

import { readFileSync } from 'fs';
import { scanDirectory } from '../indexer/scanner.js';
import type { SearchMatch, SearchResult } from './ripgrep.js';

/**
 * Search for a symbol using Node.js file reading
 */
export async function searchWithFallback(
  symbol: string,
  projectRoot: string,
  options: {
    maxResults?: number;
  } = {}
): Promise<SearchResult> {
  const maxResults = options.maxResults ?? 100;
  const matches: SearchMatch[] = [];

  try {
    // Scan for all files
    const files = await scanDirectory(projectRoot);

    // Create regex for word boundary matching
    const regex = new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'g');

    for (const file of files) {
      if (matches.length >= maxResults) {
        return { matches, truncated: true };
      }

      try {
        const content = readFileSync(file.absolutePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match: RegExpExecArray | null;

          // Reset regex state
          regex.lastIndex = 0;

          while ((match = regex.exec(line)) !== null) {
            matches.push({
              path: file.path,
              lineNumber: i + 1,
              lineContent: line.trimEnd(),
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
            });

            if (matches.length >= maxResults) {
              return { matches, truncated: true };
            }
          }
        }
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    return { matches, truncated: false };
  } catch (e) {
    const error = e as Error;
    return { matches: [], truncated: false, error: error.message };
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
