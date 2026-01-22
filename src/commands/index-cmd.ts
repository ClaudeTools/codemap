/**
 * 'index' command - Build or rebuild the codebase index
 */

import { Command } from 'commander';
import { watch } from 'fs';
import { findProjectRoot, getLanguageFromExtension } from '../utils/paths.js';
import { buildIndex, updateIndex } from '../indexer/indexer.js';
import { formatDuration, pluralize } from '../utils/output.js';

export function createIndexCommand(): Command {
  const cmd = new Command('index')
    .description('Build or rebuild the codebase index')
    .option('-f, --force', 'Rebuild entire index, ignoring cache')
    .option('-w, --watch', 'Watch for changes and update index automatically')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const projectRoot = findProjectRoot();

        // Initial index
        if (!options.json) {
          console.log('Indexing project...');
        }

        const result = options.force
          ? await buildIndex(projectRoot, {
              force: true,
              onProgress: options.json
                ? undefined
                : (progress) => {
                    if (progress.phase === 'parsing' && progress.currentFile) {
                      process.stdout.write(
                        `\r  Processing: ${progress.current}/${progress.total} - ${progress.currentFile.slice(0, 50)}`
                      );
                    }
                  },
            })
          : await updateIndex(projectRoot, {
              onProgress: options.json
                ? undefined
                : (progress) => {
                    if (progress.phase === 'parsing' && progress.currentFile) {
                      process.stdout.write(
                        `\r  Processing: ${progress.current}/${progress.total} - ${progress.currentFile.slice(0, 50)}`
                      );
                    }
                  },
            });

        if (options.json && !options.watch) {
          console.log(
            JSON.stringify(
              {
                success: true,
                filesIndexed: result.filesIndexed,
                symbols: result.symbolsExtracted,
                imports: result.importsExtracted,
                exports: result.exportsExtracted,
                errors: result.errors,
                duration: result.duration,
              },
              null,
              2
            )
          );
        } else if (!options.watch) {
          // Clear the progress line
          process.stdout.write('\r' + ' '.repeat(80) + '\r');

          console.log(`  Scanned: ${pluralize(result.filesIndexed, 'file')}`);
          console.log(`  Symbols: ${result.symbolsExtracted}`);
          console.log(`  Imports: ${result.importsExtracted}`);
          console.log(`  Time: ${formatDuration(result.duration)}`);

          if (result.errors.length > 0) {
            console.log(`\nWarnings (${result.errors.length}):`);
            for (const error of result.errors.slice(0, 5)) {
              console.log(`  ${error.file}: ${error.error}`);
            }
            if (result.errors.length > 5) {
              console.log(`  ... and ${result.errors.length - 5} more`);
            }
          }

          console.log('\nIndex saved to .codemap/index.db');
        } else {
          // Watch mode - show initial stats
          process.stdout.write('\r' + ' '.repeat(80) + '\r');
          console.log(`  Indexed: ${pluralize(result.filesIndexed, 'file')} (${result.symbolsExtracted} symbols)`);
          console.log(`\nWatching for changes... (Ctrl+C to stop)\n`);
        }

        // Start watch mode if requested
        if (options.watch) {
          await startWatchMode(projectRoot, options.json);
        }
      } catch (e) {
        const error = e as Error;
        if (options.json) {
          console.log(
            JSON.stringify({ success: false, error: error.message }, null, 2)
          );
        } else {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Start watch mode - monitor for file changes and re-index
 */
async function startWatchMode(projectRoot: string, jsonOutput: boolean): Promise<void> {
  // Directories to ignore
  const ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.codemap',
    'coverage',
    '__pycache__',
  ]);

  // Track pending changes for debouncing
  let pendingChanges = new Set<string>();
  let debounceTimer: NodeJS.Timeout | null = null;
  const DEBOUNCE_MS = 300;

  // Process accumulated changes
  const processChanges = async () => {
    if (pendingChanges.size === 0) return;

    const changedFiles = Array.from(pendingChanges);
    pendingChanges.clear();

    const timestamp = new Date().toLocaleTimeString();

    if (!jsonOutput) {
      console.log(`[${timestamp}] Changes detected: ${changedFiles.length} file(s)`);
    }

    try {
      const result = await updateIndex(projectRoot);

      if (jsonOutput) {
        console.log(
          JSON.stringify({
            event: 'update',
            timestamp: new Date().toISOString(),
            filesChanged: changedFiles,
            filesIndexed: result.filesIndexed,
            symbols: result.symbolsExtracted,
            duration: result.duration,
          })
        );
      } else {
        if (result.filesIndexed > 0) {
          console.log(`  Updated: ${pluralize(result.filesIndexed, 'file')} in ${formatDuration(result.duration)}`);
        } else {
          console.log(`  No indexable changes`);
        }
      }
    } catch (e) {
      const error = e as Error;
      if (jsonOutput) {
        console.log(JSON.stringify({ event: 'error', error: error.message }));
      } else {
        console.error(`  Error: ${error.message}`);
      }
    }
  };

  // Debounced change handler
  const handleChange = (filePath: string) => {
    pendingChanges.add(filePath);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      processChanges();
    }, DEBOUNCE_MS);
  };

  // Check if a file should be watched
  const shouldWatch = (filePath: string): boolean => {
    // Check if it's in an ignored directory
    const parts = filePath.split('/');
    for (const part of parts) {
      if (ignoreDirs.has(part)) return false;
    }

    // Check if it's a supported language
    const lang = getLanguageFromExtension(filePath);
    return lang !== null;
  };

  // Set up recursive watcher
  const watcher = watch(
    projectRoot,
    { recursive: true },
    (_eventType, filename) => {
      if (!filename) return;

      const relativePath = filename.toString();

      // Skip if not a file we care about
      if (!shouldWatch(relativePath)) return;

      handleChange(relativePath);
    }
  );

  // Handle graceful shutdown
  const cleanup = () => {
    if (!jsonOutput) {
      console.log('\nStopping watch mode...');
    }
    watcher.close();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep the process running
  await new Promise(() => {});
}
