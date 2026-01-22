/**
 * 'status' command - Show index status and health
 */

import { Command } from 'commander';
import { findProjectRoot, indexExists } from '../utils/paths.js';
import {
  getDatabase,
  getDatabaseStats,
  getIndexStats,
  getStaleFiles,
  getNewFiles,
  getDeletedFiles,
} from '../db/index.js';
import { getFileModTimes } from '../indexer/scanner.js';
import { formatRelativeTime, formatSize } from '../utils/output.js';

export function createStatusCommand(): Command {
  const cmd = new Command('status')
    .description('Show index status and health')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show additional details')
    .action(async (options) => {
      try {
        const projectRoot = findProjectRoot();

        if (!indexExists(projectRoot)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  exists: false,
                  message: 'Index not found. Run "codemap index" to build it.',
                },
                null,
                2
              )
            );
          } else {
            console.log('Index Status: Not found');
            console.log('\nRun "codemap index" to build the index.');
          }
          return;
        }

        const dbStats = getDatabaseStats(projectRoot);
        const db = getDatabase(projectRoot);
        const indexStats = getIndexStats(db);

        // Get current file state
        const currentFiles = await getFileModTimes(projectRoot);
        const staleFiles = getStaleFiles(db, currentFiles);
        const newFiles = getNewFiles(db, currentFiles);
        const deletedFiles = getDeletedFiles(db, currentFiles);

        const isUpToDate =
          staleFiles.length === 0 &&
          newFiles.length === 0 &&
          deletedFiles.length === 0;

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                exists: true,
                path: dbStats.path,
                size: dbStats.size,
                lastModified: dbStats.lastModified?.toISOString(),
                upToDate: isUpToDate,
                indexed: indexStats.files,
                stale: staleFiles.map((f) => f.path),
                new: newFiles,
                deleted: deletedFiles,
              },
              null,
              2
            )
          );
        } else {
          console.log('Index Status:');
          console.log(`  Location: ${dbStats.path}`);
          console.log(`  Size: ${formatSize(dbStats.size)}`);
          if (dbStats.lastModified) {
            console.log(
              `  Last updated: ${formatRelativeTime(dbStats.lastModified.getTime())}`
            );
          }
          console.log();

          console.log('Coverage:');
          console.log(`  Indexed: ${indexStats.files} files`);
          console.log(
            `  Stale: ${staleFiles.length} ${staleFiles.length === 1 ? 'file' : 'files'} (modified since last index)`
          );
          console.log(
            `  New: ${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} (not yet indexed)`
          );
          if (deletedFiles.length > 0) {
            console.log(
              `  Deleted: ${deletedFiles.length} ${deletedFiles.length === 1 ? 'file' : 'files'} (in index but removed)`
            );
          }

          if (staleFiles.length > 0 || newFiles.length > 0) {
            console.log();

            if (staleFiles.length > 0) {
              console.log('Stale files:');
              const toShow = options.verbose
                ? staleFiles
                : staleFiles.slice(0, 5);
              for (const file of toShow) {
                const age = formatRelativeTime(file.modified_at);
                console.log(`  ${file.path} (indexed ${age})`);
              }
              if (!options.verbose && staleFiles.length > 5) {
                console.log(`  ...and ${staleFiles.length - 5} more`);
              }
            }

            if (newFiles.length > 0) {
              console.log('New files:');
              const toShow = options.verbose ? newFiles : newFiles.slice(0, 5);
              for (const file of toShow) {
                console.log(`  ${file}`);
              }
              if (!options.verbose && newFiles.length > 5) {
                console.log(`  ...and ${newFiles.length - 5} more`);
              }
            }

            console.log();
            console.log('Run "codemap index" to update.');
          } else {
            console.log();
            console.log('Index is up to date.');
          }
        }
      } catch (e) {
        const error = e as Error;
        if (options.json) {
          console.log(JSON.stringify({ error: error.message }, null, 2));
        } else {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}
