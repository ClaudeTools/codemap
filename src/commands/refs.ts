/**
 * 'refs' command - Find all references to a symbol
 */

import { Command } from 'commander';
import { findProjectRoot } from '../utils/paths.js';
import { getDatabase, findSymbolByName } from '../db/index.js';
import { searchForSymbol, groupMatchesByFile } from '../search/index.js';

export function createRefsCommand(): Command {
  const cmd = new Command('refs')
    .description('Find all references to a symbol')
    .argument('<symbol>', 'Name of symbol to find references for')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show all references (not truncated)')
    .option('-n, --max <count>', 'Maximum number of results', '50')
    .action(async (symbol: string, options) => {
      try {
        const projectRoot = findProjectRoot();
        const db = getDatabase(projectRoot);

        // First, check if symbol exists in index
        const definitions = findSymbolByName(db, symbol);

        // Search for references
        const maxResults = parseInt(options.max, 10) || 50;
        const searchResult = await searchForSymbol(symbol, projectRoot, {
          maxResults: options.verbose ? 500 : maxResults,
        });

        if (searchResult.error) {
          throw new Error(`Search failed: ${searchResult.error}`);
        }

        const grouped = groupMatchesByFile(searchResult.matches);

        if (options.json) {
          const files: {
            path: string;
            matches: { line: number; content: string }[];
          }[] = [];

          for (const [path, matches] of grouped) {
            files.push({
              path,
              matches: matches.map((m) => ({
                line: m.lineNumber,
                content: m.lineContent,
              })),
            });
          }

          console.log(
            JSON.stringify(
              {
                query: symbol,
                definitions: definitions.map((d) => ({
                  path: d.file_path,
                  line: d.line_start,
                })),
                totalMatches: searchResult.matches.length,
                truncated: searchResult.truncated,
                files,
              },
              null,
              2
            )
          );
        } else {
          const total = searchResult.matches.length;
          console.log(
            `References to "${symbol}" (${total} found${searchResult.truncated ? '+' : ''}):\n`
          );

          // Show definitions first
          if (definitions.length > 0) {
            console.log('Definitions:');
            for (const def of definitions) {
              console.log(`  ${def.file_path}:${def.line_start} [${def.kind}]`);
            }
            console.log();
          }

          // Show references grouped by file
          let filesShown = 0;
          const maxFiles = options.verbose ? grouped.size : 10;

          for (const [path, matches] of grouped) {
            if (filesShown >= maxFiles) {
              const remaining = grouped.size - maxFiles;
              console.log(
                `\n[...${remaining} more files, use --verbose for all]`
              );
              break;
            }

            console.log(path);
            const linesToShow = options.verbose ? matches.length : Math.min(matches.length, 5);

            for (let i = 0; i < linesToShow; i++) {
              const m = matches[i];
              console.log(`  :${m.lineNumber}  ${m.lineContent.trim()}`);
            }

            if (!options.verbose && matches.length > 5) {
              console.log(`  ...${matches.length - 5} more in this file`);
            }

            console.log();
            filesShown++;
          }

          if (searchResult.truncated) {
            console.log('\nNote: Results truncated. Use --verbose or --max to see more.');
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
