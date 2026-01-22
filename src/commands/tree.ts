/**
 * 'tree' command - Show annotated file tree
 */

import { Command } from 'commander';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, relative, basename } from 'path';
import { findProjectRoot } from '../utils/paths.js';
import { getDatabase, getAllFiles, getExportsByFile, getReexportsByFile, getExportedSymbolsByFile } from '../db/index.js';
import ignoreModule from 'ignore';
import type { Ignore } from 'ignore';

const ignoreFactory = (ignoreModule as any).default ?? ignoreModule;

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  annotation?: string;
  exports?: string[];
}

export function createTreeCommand(): Command {
  const cmd = new Command('tree')
    .description('Show annotated file tree')
    .argument('[path]', 'Subdirectory to focus on', '')
    .option('--json', 'Output as JSON')
    .option('-d, --depth <n>', 'Maximum depth', '5')
    .option('-v, --verbose', 'Show more details')
    .action(async (targetPath: string, options) => {
      try {
        const projectRoot = findProjectRoot();
        const startPath = targetPath
          ? join(projectRoot, targetPath)
          : projectRoot;

        if (!existsSync(startPath)) {
          throw new Error(`Path not found: ${targetPath || '.'}`);
        }

        const db = getDatabase(projectRoot);
        const indexedFiles = new Set(getAllFiles(db).map((f) => f.path));

        // Load gitignore
        const ig = loadGitignore(projectRoot);

        // Build tree
        const maxDepth = parseInt(options.depth, 10) || 5;
        const tree = buildTree(
          startPath,
          projectRoot,
          indexedFiles,
          db,
          ig,
          0,
          maxDepth
        );

        if (options.json) {
          console.log(JSON.stringify(tree, null, 2));
        } else {
          console.log(targetPath || basename(projectRoot) + '/');
          printTree(tree.children || [], '', options.verbose);
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

function loadGitignore(projectRoot: string): Ignore {
  const ig = ignoreFactory();
  ig.add(['.git', 'node_modules', '.codemap', 'dist', 'build', 'coverage']);

  const gitignorePath = join(projectRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, 'utf-8'));
  }

  return ig;
}

function buildTree(
  dirPath: string,
  projectRoot: string,
  indexedFiles: Set<string>,
  db: ReturnType<typeof getDatabase>,
  ig: Ignore,
  depth: number,
  maxDepth: number
): TreeNode {
  const relativePath = relative(projectRoot, dirPath);
  const name = basename(dirPath) || relativePath;

  const node: TreeNode = {
    name,
    path: relativePath || '.',
    isDirectory: true,
  };

  if (depth >= maxDepth) {
    node.annotation = '[max depth]';
    return node;
  }

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const children: TreeNode[] = [];

    // Sort: directories first, then files
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      const entryPath = join(dirPath, entry.name);
      const entryRelative = relative(projectRoot, entryPath);

      // Skip ignored
      if (ig.ignores(entryRelative)) continue;
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        const child = buildTree(
          entryPath,
          projectRoot,
          indexedFiles,
          db,
          ig,
          depth + 1,
          maxDepth
        );
        children.push(child);
      } else {
        // File node
        const isIndexed = indexedFiles.has(entryRelative);
        const fileNode: TreeNode = {
          name: entry.name,
          path: entryRelative,
          isDirectory: false,
        };

        if (isIndexed) {
          const { annotation, exports: exportNames } = getFileAnnotation(
            db,
            entryRelative
          );
          fileNode.annotation = annotation;
          fileNode.exports = exportNames;
        }

        children.push(fileNode);
      }
    }

    node.children = children;
  } catch {
    // Can't read directory
    node.annotation = '[unreadable]';
  }

  return node;
}

function getFileAnnotation(
  db: ReturnType<typeof getDatabase>,
  filePath: string
): { annotation: string; exports: string[] } {
  const exports = getExportsByFile(db, filePath);
  const reexports = getReexportsByFile(db, filePath);
  const symbols = getExportedSymbolsByFile(db, filePath);

  const exportNames = exports
    .filter((e) => e.exported_name !== 'default' && e.exported_name !== '*')
    .map((e) => e.exported_name);

  // Determine file type annotation
  let annotation = '[module]';

  // Check if it's a barrel file (mostly re-exports)
  if (reexports.length > 0 && reexports.length >= exports.length * 0.5) {
    annotation = '[barrel]';
    const reexportNames = reexports.map((r) =>
      r.exported_name === '*' ? `* from ${r.source_path}` : r.exported_name
    );
    return { annotation, exports: reexportNames.slice(0, 5) };
  }

  // Check if it's an entry point (index.ts at root or has 'app' export)
  if (
    filePath === 'index.ts' ||
    filePath === 'src/index.ts' ||
    exportNames.includes('app') ||
    exportNames.includes('main')
  ) {
    annotation = '[entry]';
  }

  // Check if it's a config file
  if (
    filePath.includes('config') ||
    exportNames.some((n) => n.toLowerCase().includes('config'))
  ) {
    annotation = '[config]';
  }

  // Check if it's a router
  if (
    filePath.includes('route') ||
    exportNames.some((n) => n.toLowerCase().includes('router'))
  ) {
    annotation = '[router]';
  }

  // Check if it's middleware
  if (
    filePath.includes('middleware') ||
    exportNames.some((n) => n.toLowerCase().includes('middleware'))
  ) {
    annotation = '[middleware]';
  }

  // Check if it's types only
  const hasOnlyTypes = symbols.every(
    (s) => s.kind === 'type' || s.kind === 'interface'
  );
  if (hasOnlyTypes && symbols.length > 0) {
    annotation = '[types]';
  }

  return { annotation, exports: exportNames.slice(0, 5) };
}

function printTree(
  nodes: TreeNode[],
  prefix: string,
  verbose: boolean
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    let line = prefix + connector + node.name;

    if (node.isDirectory) {
      line += '/';
    }

    if (node.annotation) {
      // Pad to align annotations
      const padding = Math.max(1, 40 - line.length);
      line += ' '.repeat(padding) + node.annotation;
    }

    if (node.exports && node.exports.length > 0 && verbose) {
      line += ` exports: ${node.exports.join(', ')}`;
    } else if (node.exports && node.exports.length > 0) {
      // Show abbreviated exports
      const abbrev =
        node.exports.length > 3
          ? node.exports.slice(0, 3).join(', ') + '...'
          : node.exports.join(', ');
      line += ` exports: ${abbrev}`;
    }

    console.log(line);

    if (node.children) {
      printTree(node.children, prefix + childPrefix, verbose);
    }
  }
}
