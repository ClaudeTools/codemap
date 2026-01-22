/**
 * File discovery and scanning
 */

import { statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import ignoreModule from 'ignore';
import type { Ignore } from 'ignore';

const ignore = ignoreModule.default ?? ignoreModule;
import { glob } from 'glob';
import { loadConfig, type CodemapConfig } from '../utils/config.js';
import { getLanguageFromExtension } from '../utils/paths.js';

export interface ScannedFile {
  path: string; // Relative to project root
  absolutePath: string;
  language: 'typescript' | 'javascript';
  mtime: number;
  content?: string;
}

/**
 * Load .gitignore patterns
 */
function loadGitignore(projectRoot: string): Ignore {
  const ig = ignore();

  // Always ignore these
  ig.add(['.git', 'node_modules', '.codemap']);

  // Load .gitignore if exists
  const gitignorePath = join(projectRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    ig.add(content);
  }

  return ig;
}

/**
 * Scan a directory for source files
 */
export async function scanDirectory(
  projectRoot: string,
  config?: CodemapConfig
): Promise<ScannedFile[]> {
  const effectiveConfig = config ?? loadConfig(projectRoot);
  const gitignore = loadGitignore(projectRoot);
  const files: ScannedFile[] = [];

  // Use glob to find files matching include patterns
  const allFiles = await glob(effectiveConfig.include, {
    cwd: projectRoot,
    ignore: effectiveConfig.exclude,
    nodir: true,
    absolute: false,
  });

  for (const relativePath of allFiles) {
    // Check gitignore
    if (gitignore.ignores(relativePath)) {
      continue;
    }

    const absolutePath = join(projectRoot, relativePath);

    // Check if file exists and get stats
    try {
      const stats = statSync(absolutePath);
      if (!stats.isFile()) {
        continue;
      }

      const language = getLanguageFromExtension(relativePath);
      if (!language) {
        continue;
      }

      files.push({
        path: relativePath,
        absolutePath,
        language,
        mtime: stats.mtimeMs,
      });
    } catch {
      // File doesn't exist or can't be accessed
      continue;
    }
  }

  return files;
}

/**
 * Get a map of current files with their modification times
 */
export async function getFileModTimes(
  projectRoot: string,
  config?: CodemapConfig
): Promise<Map<string, number>> {
  const files = await scanDirectory(projectRoot, config);
  const modTimes = new Map<string, number>();

  for (const file of files) {
    modTimes.set(file.path, file.mtime);
  }

  return modTimes;
}

/**
 * Read file content
 */
export function readFileContent(absolutePath: string): string {
  return readFileSync(absolutePath, 'utf-8');
}

/**
 * Count lines of code in content
 */
export function countLines(content: string): number {
  return content.split('\n').length;
}

/**
 * Scan and load file contents
 */
export async function scanAndLoadFiles(
  projectRoot: string,
  config?: CodemapConfig,
  filePaths?: string[]
): Promise<ScannedFile[]> {
  let files: ScannedFile[];

  if (filePaths) {
    // Load specific files
    files = [];
    for (const relativePath of filePaths) {
      const absolutePath = join(projectRoot, relativePath);
      try {
        const stats = statSync(absolutePath);
        const language = getLanguageFromExtension(relativePath);
        if (language) {
          files.push({
            path: relativePath,
            absolutePath,
            language,
            mtime: stats.mtimeMs,
          });
        }
      } catch {
        continue;
      }
    }
  } else {
    files = await scanDirectory(projectRoot, config);
  }

  // Load content for each file
  for (const file of files) {
    try {
      file.content = readFileContent(file.absolutePath);
    } catch {
      // Skip files that can't be read
      file.content = '';
    }
  }

  return files;
}
