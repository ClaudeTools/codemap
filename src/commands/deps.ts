/**
 * 'deps' command - Show dependencies of a file
 */

import { Command } from 'commander';
import { findProjectRoot, normalizeFilePath } from '../utils/paths.js';
import { getDatabase, getFile, getImportsByFile } from '../db/index.js';
import { FileNotFoundError, FileNotIndexedError } from '../utils/errors.js';
import { existsSync } from 'fs';
import { join } from 'path';

export function createDepsCommand(): Command {
  const cmd = new Command('deps')
    .description('Show dependencies of a file')
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

        // Get imports
        const imports = getImportsByFile(db, normalizedPath);

        // Separate internal and external imports
        const internal: {
          path: string;
          imports: { name: string; alias?: string }[];
        }[] = [];

        const external: {
          package: string;
          imports: { name: string; alias?: string }[];
        }[] = [];

        // Group imports
        const internalMap = new Map<
          string,
          { name: string; alias?: string }[]
        >();
        const externalMap = new Map<
          string,
          { name: string; alias?: string }[]
        >();

        for (const imp of imports) {
          if (imp.is_external) {
            const pkg = imp.package_name || 'unknown';
            const existing = externalMap.get(pkg) || [];
            existing.push({
              name: imp.imported_name,
              alias: imp.alias || undefined,
            });
            externalMap.set(pkg, existing);
          } else if (imp.imported_path) {
            const existing = internalMap.get(imp.imported_path) || [];
            existing.push({
              name: imp.imported_name,
              alias: imp.alias || undefined,
            });
            internalMap.set(imp.imported_path, existing);
          }
        }

        for (const [path, imps] of internalMap) {
          internal.push({ path, imports: imps });
        }

        for (const [pkg, imps] of externalMap) {
          external.push({ package: pkg, imports: imps });
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                file: normalizedPath,
                internal: internal.map((i) => ({
                  path: i.path,
                  imports: i.imports.map((imp) => imp.alias || imp.name),
                })),
                external: external.map((e) => ({
                  package: e.package,
                  imports: e.imports.map((imp) => imp.alias || imp.name),
                })),
              },
              null,
              2
            )
          );
        } else {
          console.log(`Dependencies of ${normalizedPath}:\n`);

          if (internal.length > 0) {
            console.log(`Internal (${internal.length}):`);
            for (const dep of internal) {
              console.log(`  ${dep.path}`);
              const importNames = dep.imports
                .map((i) => {
                  if (i.name === 'default') {
                    return i.alias ? `${i.alias} (default)` : 'default';
                  }
                  return i.alias ? `${i.name} as ${i.alias}` : i.name;
                })
                .join(', ');
              console.log(`    → ${importNames}`);
            }
          } else {
            console.log('Internal: none');
          }

          console.log();

          if (external.length > 0) {
            console.log(`External (${external.length}):`);
            for (const dep of external) {
              console.log(`  ${dep.package}`);
              const importNames = dep.imports
                .map((i) => {
                  if (i.name === '*') {
                    return i.alias ? `* as ${i.alias}` : '*';
                  }
                  if (i.name === 'default') {
                    return i.alias ? `${i.alias} (default)` : 'default';
                  }
                  return i.alias ? `${i.name} as ${i.alias}` : i.name;
                })
                .join(', ');
              console.log(`    → ${importNames}`);
            }
          } else {
            console.log('External: none');
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
