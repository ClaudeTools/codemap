/**
 * 'where' command - Find where a symbol is defined
 */

import { Command } from 'commander';
import { findProjectRoot } from '../utils/paths.js';
import { getDatabase, findSymbolByName, findSymbolByNameCaseInsensitive, findSymbolByPrefix, getSimilarSymbolNames } from '../db/index.js';
import { formatLocation, formatKind, formatExported } from '../utils/output.js';
import { SymbolNotFoundError } from '../utils/errors.js';

export function createWhereCommand(): Command {
  const cmd = new Command('where')
    .description('Find where a symbol is defined')
    .argument('<symbol>', 'Name of function, class, variable, or type to find')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show additional details')
    .action(async (symbol: string, options) => {
      try {
        const projectRoot = findProjectRoot();
        const db = getDatabase(projectRoot);

        // Try exact match first
        let results = findSymbolByName(db, symbol);

        // If no exact match, try case-insensitive
        if (results.length === 0) {
          results = findSymbolByNameCaseInsensitive(db, symbol);
        }

        // If still no match, try prefix
        if (results.length === 0) {
          results = findSymbolByPrefix(db, symbol);
        }

        // If still no match, provide suggestions
        if (results.length === 0) {
          const suggestions = getSimilarSymbolNames(db, symbol, 5);
          throw new SymbolNotFoundError(symbol, suggestions);
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                query: symbol,
                results: results.map((r) => ({
                  path: r.file_path,
                  line_start: r.line_start,
                  line_end: r.line_end,
                  kind: r.kind,
                  signature: r.signature,
                  exported: r.exported === 1,
                  is_default: r.is_default === 1,
                })),
              },
              null,
              2
            )
          );
        } else {
          console.log(
            `Found ${results.length} ${results.length === 1 ? 'definition' : 'definitions'} of "${symbol}":\n`
          );

          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const location = formatLocation(r.file_path, r.line_start, r.line_end);
            const kind = formatKind(r.kind);
            const exportStatus = formatExported(r.exported === 1, r.is_default === 1);

            console.log(`${i + 1}. ${location} ${kind} ${exportStatus}`);
            if (r.signature) {
              console.log(`   ${r.signature}`);
            }
            console.log();
          }
        }
      } catch (e) {
        const error = e as Error;
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                query: symbol,
                error: error.message,
                suggestions:
                  error instanceof SymbolNotFoundError ? error.suggestions : [],
              },
              null,
              2
            )
          );
        } else {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}
