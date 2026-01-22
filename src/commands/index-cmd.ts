/**
 * 'index' command - Build or rebuild the codebase index
 */

import { Command } from 'commander';
import { watch } from 'fs';
import { findProjectRoot, getLanguageFromExtension } from '../utils/paths.js';
import { buildIndex, updateIndex } from '../indexer/indexer.js';
import { formatDuration, pluralize } from '../utils/output.js';

// Colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const gray = '\x1b[90m';
const brightGreen = '\x1b[92m';
const brightCyan = '\x1b[96m';
const brightYellow = '\x1b[93m';
const brightMagenta = '\x1b[95m';

const check = `${brightGreen}✓${reset}`;

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
          // Watch mode - hand off to TUI
          process.stdout.write('\r' + ' '.repeat(80) + '\r');
          await startWatchMode(projectRoot, options.json, result);
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

interface WatchStats {
  filesIndexed: number;
  symbolsExtracted: number;
  totalUpdates: number;
  totalFilesChanged: number;
  startTime: Date;
  lastUpdate: Date | null;
}

/**
 * Start watch mode with nice TUI
 */
async function startWatchMode(
  projectRoot: string,
  jsonOutput: boolean,
  initialResult: { filesIndexed: number; symbolsExtracted: number }
): Promise<void> {
  // Stats tracking
  const stats: WatchStats = {
    filesIndexed: initialResult.filesIndexed,
    symbolsExtracted: initialResult.symbolsExtracted,
    totalUpdates: 0,
    totalFilesChanged: 0,
    startTime: new Date(),
    lastUpdate: null,
  };

  // Activity log (keep last 8 entries)
  const activityLog: string[] = [];
  const MAX_LOG_ENTRIES = 8;

  const addLogEntry = (entry: string) => {
    activityLog.push(entry);
    if (activityLog.length > MAX_LOG_ENTRIES) {
      activityLog.shift();
    }
  };

  // Render the TUI
  const render = (status: 'watching' | 'updating' | 'error', _message?: string) => {
    if (jsonOutput) return;

    // Strip ANSI codes to get visible length
    const visibleLength = (str: string): number => {
      return str.replace(/\x1b\[[0-9;]*m/g, '').length;
    };

    // Pad a line to exact width (64 chars inner width)
    const BOX_WIDTH = 64;
    const padLine = (content: string): string => {
      const visible = visibleLength(content);
      const padding = Math.max(0, BOX_WIDTH - visible);
      return `${cyan}│${reset}${content}${' '.repeat(padding)}${cyan}│${reset}`;
    };

    // Clear screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');

    const uptime = formatUptime(stats.startTime);
    const statusIcon = status === 'watching' ? `${brightGreen}●${reset}` :
                       status === 'updating' ? `${brightYellow}●${reset}` :
                       `${'\x1b[91m'}●${reset}`;
    const statusText = status === 'watching' ? `${brightGreen}Watching${reset}` :
                       status === 'updating' ? `${brightYellow}Updating${reset}` :
                       `${'\x1b[91m'}Error${reset}`;

    const hr = `${cyan}├${'─'.repeat(BOX_WIDTH)}┤${reset}`;
    const top = `${cyan}┌${'─'.repeat(BOX_WIDTH)}┐${reset}`;
    const bottom = `${cyan}└${'─'.repeat(BOX_WIDTH)}┘${reset}`;
    const empty = padLine('');

    console.log('');
    console.log(top);
    console.log(padLine(`  ${brightMagenta}${bold}codemap${reset} ${dim}watch mode${reset}`));
    console.log(hr);
    console.log(empty);
    console.log(padLine(`  ${bold}Status:${reset}  ${statusIcon} ${statusText}`));
    console.log(padLine(`  ${bold}Uptime:${reset}  ${dim}${uptime}${reset}`));
    console.log(empty);
    console.log(hr);
    console.log(padLine(`  ${bold}Index Stats${reset}`));
    console.log(empty);
    console.log(padLine(`    ${gray}Files:${reset}   ${brightCyan}${stats.filesIndexed}${reset}`));
    console.log(padLine(`    ${gray}Symbols:${reset} ${brightCyan}${stats.symbolsExtracted}${reset}`));
    console.log(padLine(`    ${gray}Updates:${reset} ${brightCyan}${stats.totalUpdates}${reset} ${dim}(${stats.totalFilesChanged} files changed)${reset}`));
    console.log(empty);
    console.log(hr);
    console.log(padLine(`  ${bold}Activity${reset}`));
    console.log(empty);

    // Show activity log
    if (activityLog.length === 0) {
      console.log(padLine(`    ${dim}Waiting for file changes...${reset}`));
    } else {
      for (const entry of activityLog) {
        console.log(padLine(`    ${entry}`));
      }
    }

    // Pad remaining lines
    const remainingLines = MAX_LOG_ENTRIES - activityLog.length;
    for (let i = 0; i < remainingLines && activityLog.length > 0; i++) {
      console.log(empty);
    }

    console.log(empty);
    console.log(bottom);
    console.log(`  ${dim}Press ${bold}Ctrl+C${reset}${dim} to stop${reset}`);
    console.log('');
  };

  // Initial render
  render('watching');

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

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Show updating status
    render('updating');

    if (jsonOutput) {
      // JSON mode - just output JSON
    } else {
      addLogEntry(`${dim}${timestamp}${reset} ${yellow}↻${reset} ${changedFiles.length} file(s) changed`);
    }

    try {
      const result = await updateIndex(projectRoot);

      stats.totalUpdates++;
      stats.totalFilesChanged += changedFiles.length;
      stats.lastUpdate = new Date();

      if (result.filesIndexed > 0) {
        stats.filesIndexed = result.filesIndexed;
        stats.symbolsExtracted = result.symbolsExtracted;
      }

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
          addLogEntry(`${dim}${timestamp}${reset} ${check} Updated in ${formatDuration(result.duration)}`);
        } else {
          addLogEntry(`${dim}${timestamp}${reset} ${dim}No indexable changes${reset}`);
        }
        render('watching');
      }
    } catch (e) {
      const error = e as Error;
      if (jsonOutput) {
        console.log(JSON.stringify({ event: 'error', error: error.message }));
      } else {
        addLogEntry(`${dim}${timestamp}${reset} ${'\x1b[91m'}✗${reset} ${error.message.slice(0, 40)}`);
        render('error', error.message);
        // Go back to watching after showing error
        setTimeout(() => render('watching'), 2000);
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
    const parts = filePath.split('/');
    for (const part of parts) {
      if (ignoreDirs.has(part)) return false;
    }
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
      if (!shouldWatch(relativePath)) return;
      handleChange(relativePath);
    }
  );

  // Handle graceful shutdown
  const cleanup = () => {
    if (!jsonOutput) {
      process.stdout.write('\x1b[2J\x1b[H');
      const uptime = formatUptime(stats.startTime);
      console.log(`
${cyan}┌────────────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightMagenta}${bold}codemap${reset} ${dim}watch mode stopped${reset}                                  ${cyan}│${reset}
${cyan}├────────────────────────────────────────────────────────────────┤${reset}
${cyan}│${reset}                                                                ${cyan}│${reset}
${cyan}│${reset}  ${bold}Session Summary${reset}                                              ${cyan}│${reset}
${cyan}│${reset}                                                                ${cyan}│${reset}
${cyan}│${reset}    ${gray}Uptime:${reset}        ${brightCyan}${uptime}${reset}                                      ${cyan}│${reset}
${cyan}│${reset}    ${gray}Total updates:${reset} ${brightCyan}${stats.totalUpdates}${reset}                                           ${cyan}│${reset}
${cyan}│${reset}    ${gray}Files changed:${reset} ${brightCyan}${stats.totalFilesChanged}${reset}                                           ${cyan}│${reset}
${cyan}│${reset}    ${gray}Final index:${reset}   ${brightCyan}${stats.filesIndexed}${reset} files, ${brightCyan}${stats.symbolsExtracted}${reset} symbols            ${cyan}│${reset}
${cyan}│${reset}                                                                ${cyan}│${reset}
${cyan}└────────────────────────────────────────────────────────────────┘${reset}
`);
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

/**
 * Format uptime as human readable string
 */
function formatUptime(startTime: Date): string {
  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}
