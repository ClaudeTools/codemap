/**
 * Search layer barrel export
 */

export * from './ripgrep.js';
export * from './fallback.js';

import { isRipgrepAvailable, searchWithRipgrep, type SearchResult } from './ripgrep.js';
import { searchWithFallback } from './fallback.js';

/**
 * Search for a symbol using the best available method
 */
export async function searchForSymbol(
  symbol: string,
  projectRoot: string,
  options: {
    maxResults?: number;
    includeGlobs?: string[];
    excludeGlobs?: string[];
  } = {}
): Promise<SearchResult> {
  if (isRipgrepAvailable()) {
    return searchWithRipgrep(symbol, projectRoot, options);
  }

  return searchWithFallback(symbol, projectRoot, options);
}
