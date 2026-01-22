/**
 * Path resolution utilities
 */

import { existsSync, statSync } from 'fs';
import { dirname, join, resolve, relative, normalize } from 'path';
import { ProjectRootNotFoundError } from './errors.js';

const PROJECT_ROOT_MARKERS = ['package.json', '.git', 'codemap.config.json'];

/**
 * Find the project root by walking up the directory tree
 */
export function findProjectRoot(startDir: string = process.cwd()): string {
  let current = resolve(startDir);
  const root = dirname(current);

  while (current !== root) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      const markerPath = join(current, marker);
      if (existsSync(markerPath)) {
        return current;
      }
    }
    current = dirname(current);
  }

  // Check root directory as well
  for (const marker of PROJECT_ROOT_MARKERS) {
    if (existsSync(join(root, marker))) {
      return root;
    }
  }

  throw new ProjectRootNotFoundError();
}

/**
 * Get the path to the .codemap directory
 */
export function getCodemapDir(projectRoot: string): string {
  return join(projectRoot, '.codemap');
}

/**
 * Get the path to the index database
 */
export function getIndexDbPath(projectRoot: string): string {
  return join(getCodemapDir(projectRoot), 'index.db');
}

/**
 * Check if the index database exists
 */
export function indexExists(projectRoot: string): boolean {
  return existsSync(getIndexDbPath(projectRoot));
}

/**
 * Normalize a file path relative to project root
 */
export function normalizeFilePath(
  filePath: string,
  projectRoot: string
): string {
  const absolutePath = resolve(projectRoot, filePath);
  return relative(projectRoot, absolutePath);
}

/**
 * Resolve an import path relative to the importing file
 */
export function resolveImportPath(
  importPath: string,
  importerPath: string,
  projectRoot: string
): string | null {
  // External package imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const importerDir = dirname(join(projectRoot, importerPath));
  let resolvedPath = normalize(join(importerDir, importPath));

  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', ''];
  const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      return relative(projectRoot, fullPath);
    }
  }

  // Try directory with index file
  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    for (const indexFile of indexFiles) {
      const indexPath = join(resolvedPath, indexFile);
      if (existsSync(indexPath)) {
        return relative(projectRoot, indexPath);
      }
    }
  }

  return null;
}

/**
 * Get file extension without the dot
 */
export function getExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Determine language from file extension
 */
export function getLanguageFromExtension(
  filePath: string
): 'typescript' | 'javascript' | null {
  const ext = getExtension(filePath).toLowerCase();

  if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) {
    return 'typescript';
  }

  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
    return 'javascript';
  }

  return null;
}
