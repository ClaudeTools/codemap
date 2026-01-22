/**
 * ripgrep integration for fast text search
 */

import { execSync, spawnSync } from 'child_process';

export interface SearchMatch {
  path: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResult {
  matches: SearchMatch[];
  truncated: boolean;
  error?: string;
}

/**
 * Check if ripgrep is available
 */
export function isRipgrepAvailable(): boolean {
  try {
    execSync('rg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search for a symbol using ripgrep
 */
export function searchWithRipgrep(
  symbol: string,
  projectRoot: string,
  options: {
    maxResults?: number;
    includeGlobs?: string[];
    excludeGlobs?: string[];
  } = {}
): SearchResult {
  const maxResults = options.maxResults ?? 100;

  try {
    const args = [
      '--json',
      '--word-regexp',
      '--max-count',
      String(maxResults),
      '--type',
      'ts',
      '--type',
      'js',
    ];

    // Add include globs
    if (options.includeGlobs) {
      for (const glob of options.includeGlobs) {
        args.push('--glob', glob);
      }
    }

    // Add exclude globs
    if (options.excludeGlobs) {
      for (const glob of options.excludeGlobs) {
        args.push('--glob', `!${glob}`);
      }
    }

    // Always exclude common directories
    args.push('--glob', '!node_modules');
    args.push('--glob', '!.git');
    args.push('--glob', '!dist');
    args.push('--glob', '!build');
    args.push('--glob', '!.codemap');

    args.push(symbol, projectRoot);

    const result = spawnSync('rg', args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      return { matches: [], truncated: false, error: result.error.message };
    }

    // Parse JSON output
    const matches: SearchMatch[] = [];
    const lines = (result.stdout || '').split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.type === 'match') {
          const data = json.data;
          const path = data.path.text;
          const lineNumber = data.line_number;
          const lineContent = data.lines.text.trimEnd();

          // Get match positions from submatches
          for (const submatch of data.submatches || []) {
            matches.push({
              path,
              lineNumber,
              lineContent,
              matchStart: submatch.start,
              matchEnd: submatch.end,
            });
          }
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    return {
      matches,
      truncated: matches.length >= maxResults,
    };
  } catch (e) {
    const error = e as Error;
    return { matches: [], truncated: false, error: error.message };
  }
}

/**
 * Group search matches by file
 */
export function groupMatchesByFile(
  matches: SearchMatch[]
): Map<string, SearchMatch[]> {
  const grouped = new Map<string, SearchMatch[]>();

  for (const match of matches) {
    const existing = grouped.get(match.path) || [];
    existing.push(match);
    grouped.set(match.path, existing);
  }

  return grouped;
}
