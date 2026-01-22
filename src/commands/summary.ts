/**
 * 'summary' command - Show project overview
 */

import { Command } from 'commander';
import { basename } from 'path';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findProjectRoot } from '../utils/paths.js';
import {
  getDatabase,
  getIndexStats,
  getAllFiles,
  getExternalPackages,
  getDatabaseStats,
} from '../db/index.js';
import { formatRelativeTime, formatSize, pluralize } from '../utils/output.js';

export function createSummaryCommand(): Command {
  const cmd = new Command('summary')
    .description('Show project overview')
    .option('--json', 'Output as JSON')
    .option('-v, --verbose', 'Show additional details')
    .action(async (options) => {
      try {
        const projectRoot = findProjectRoot();
        const db = getDatabase(projectRoot);
        const stats = getIndexStats(db);
        const dbStats = getDatabaseStats(projectRoot);

        // Get project name from package.json
        let projectName = basename(projectRoot);
        const packageJsonPath = join(projectRoot, 'package.json');
        if (existsSync(packageJsonPath)) {
          try {
            const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            projectName = pkg.name || projectName;
          } catch {
            // Use directory name
          }
        }

        // Get entry points (index.ts, main files)
        const files = getAllFiles(db);
        const entryPoints = files.filter(
          (f) =>
            f.path === 'index.ts' ||
            f.path === 'index.js' ||
            f.path === 'src/index.ts' ||
            f.path === 'src/index.js' ||
            f.path === 'src/main.ts' ||
            f.path === 'src/main.js'
        );

        // Get key directories
        const dirCounts = new Map<string, number>();
        for (const file of files) {
          const parts = file.path.split('/');
          if (parts.length > 1) {
            const dir = parts[0];
            dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
          }
        }

        const topDirs = Array.from(dirCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([dir, count]) => ({ dir, count }));

        // Get external packages
        const packages = getExternalPackages(db);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                project: projectName,
                root: projectRoot,
                stats: {
                  files: stats.files,
                  filesByLanguage: stats.filesByLanguage,
                  symbols: stats.symbols,
                  symbolsByKind: stats.symbolsByKind,
                  imports: stats.imports,
                  exports: stats.exports,
                  loc: stats.loc,
                },
                entryPoints: entryPoints.map((e) => e.path),
                keyDirectories: topDirs,
                externalPackages: packages.slice(0, 20),
                index: {
                  path: dbStats.path,
                  size: dbStats.size,
                  lastModified: dbStats.lastModified?.toISOString(),
                },
              },
              null,
              2
            )
          );
        } else {
          console.log(`Project: ${projectName}`);
          console.log(`Root: ${projectRoot}`);
          console.log();

          console.log('Stats:');
          const langBreakdown = stats.filesByLanguage
            .map((l) => `${l.count} ${l.language}`)
            .join(', ');
          console.log(`  Files: ${stats.files} (${langBreakdown})`);

          const symbolBreakdown = stats.symbolsByKind
            .slice(0, 4)
            .map((s) => `${s.count} ${s.kind}s`)
            .join(', ');
          console.log(`  Symbols: ${stats.symbols} (${symbolBreakdown})`);
          console.log(`  Lines: ${stats.loc.toLocaleString()}`);
          console.log();

          if (entryPoints.length > 0) {
            console.log('Entry Points:');
            for (const entry of entryPoints) {
              console.log(`  ${entry.path}`);
            }
            console.log();
          }

          if (topDirs.length > 0) {
            console.log('Key Directories:');
            for (const { dir, count } of topDirs) {
              console.log(`  ${dir}/ - ${pluralize(count, 'file')}`);
            }
            console.log();
          }

          console.log(
            `External Dependencies: ${packages.length} ${packages.length === 1 ? 'package' : 'packages'}`
          );
          if (packages.length > 0) {
            const topPackages = packages.slice(0, 10).map((p) => p.package_name);
            console.log(`  ${topPackages.join(', ')}${packages.length > 10 ? '...' : ''}`);
          }
          console.log();

          if (dbStats.lastModified) {
            console.log(
              `Last indexed: ${formatRelativeTime(dbStats.lastModified.getTime())} (${formatSize(dbStats.size)})`
            );
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
