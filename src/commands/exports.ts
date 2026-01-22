/**
 * 'exports' command - Show what a file exports
 */

import { Command } from 'commander';
import { findProjectRoot, normalizeFilePath } from '../utils/paths.js';
import { getDatabase, getFile, getExportsWithSymbolsByFile } from '../db/index.js';
import { FileNotFoundError, FileNotIndexedError } from '../utils/errors.js';
import { existsSync } from 'fs';
import { join } from 'path';

export function createExportsCommand(): Command {
  const cmd = new Command('exports')
    .description('Show what a file exports')
    .argument('<file>', 'Path to file (relative to project root)')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show additional details')
    .action(async (file: string, options) => {
      try {
        const projectRoot = findProjectRoot();
        const normalizedPath = normalizeFilePath(file, projectRoot);

        // Check if file exists
        const absolutePath = join(projectRoot, normalizedPath);
        if (!existsSync(absolutePath)) {
          throw new FileNotFoundError(normalizedPath);
        }

        const db = getDatabase(projectRoot);

        // Check if file is indexed
        const fileRecord = getFile(db, normalizedPath);
        if (!fileRecord) {
          throw new FileNotIndexedError(normalizedPath);
        }

        // Get exports with symbol info
        const exports = getExportsWithSymbolsByFile(db, normalizedPath);

        // Group by type
        const grouped: Record<
          string,
          {
            name: string;
            line: number;
            signature?: string;
            isReexport: boolean;
            source?: string;
          }[]
        > = {
          function: [],
          class: [],
          variable: [],
          type: [],
          interface: [],
          enum: [],
          other: [],
        };

        let defaultExport: {
          name: string;
          line: number;
          kind?: string;
        } | null = null;

        const reexports: { name: string; source: string; line: number }[] = [];

        for (const exp of exports) {
          if (exp.exported_name === 'default') {
            defaultExport = {
              name: exp.symbol_name || 'default',
              line: exp.line_number,
              kind: exp.symbol_kind,
            };
            continue;
          }

          if (exp.is_reexport && exp.source_path) {
            reexports.push({
              name: exp.exported_name,
              source: exp.source_path,
              line: exp.line_number,
            });
            continue;
          }

          const kind = exp.symbol_kind || 'other';
          const group = grouped[kind] || grouped.other;
          group.push({
            name: exp.exported_name,
            line: exp.symbol_line_start || exp.line_number,
            signature: exp.symbol_signature,
            isReexport: exp.is_reexport === 1,
            source: exp.source_path || undefined,
          });
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                file: normalizedPath,
                default: defaultExport,
                exports: Object.entries(grouped)
                  .filter(([_, items]) => items.length > 0)
                  .map(([kind, items]) => ({
                    kind,
                    items: items.map((i) => ({
                      name: i.name,
                      line: i.line,
                      signature: i.signature,
                    })),
                  })),
                reexports,
              },
              null,
              2
            )
          );
        } else {
          console.log(`Exports from ${normalizedPath}:\n`);

          // Show exports by kind
          for (const [kind, items] of Object.entries(grouped)) {
            if (items.length === 0) continue;

            const kindTitle = kind.charAt(0).toUpperCase() + kind.slice(1) + 's';
            console.log(`${kindTitle} (${items.length}):`);

            for (const item of items) {
              const lineInfo = `:${item.line}`;
              if (item.signature && options.verbose) {
                console.log(`  ${item.name.padEnd(20)} ${lineInfo}  ${item.signature}`);
              } else if (item.signature) {
                // Truncate signature for non-verbose
                const sig =
                  item.signature.length > 60
                    ? item.signature.slice(0, 57) + '...'
                    : item.signature;
                console.log(`  ${item.name.padEnd(20)} ${lineInfo}  ${sig}`);
              } else {
                console.log(`  ${item.name.padEnd(20)} ${lineInfo}`);
              }
            }
            console.log();
          }

          // Show re-exports
          if (reexports.length > 0) {
            console.log(`Re-exports (${reexports.length}):`);
            for (const re of reexports) {
              if (re.name === '*') {
                console.log(`  * from '${re.source}'`);
              } else {
                console.log(`  ${re.name} from '${re.source}'`);
              }
            }
            console.log();
          }

          // Show default export
          if (defaultExport) {
            console.log(
              `Default: ${defaultExport.name}${defaultExport.kind ? ` (${defaultExport.kind})` : ''}`
            );
          } else {
            console.log('Default: none');
          }
        }
      } catch (e) {
        const error = e as Error;
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                file,
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
