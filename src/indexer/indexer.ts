/**
 * Main indexer orchestration
 */

import {
  getDatabase,
  createDatabase,
  insertFile,
  insertSymbol,
  insertImport,
  insertExport,
  deleteFileData,
  getStaleFiles,
  getNewFiles,
  getDeletedFiles,
  getIndexStats,
  type IndexStats,
} from '../db/index.js';
import { loadConfig } from '../utils/config.js';
import { scanAndLoadFiles, getFileModTimes, countLines, type ScannedFile } from './scanner.js';
import { extractFromFile } from './extractor.js';
import { resolveImportPath } from '../utils/paths.js';

export interface IndexingProgress {
  phase: 'scanning' | 'parsing' | 'storing' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
}

export interface IndexingResult {
  filesIndexed: number;
  symbolsExtracted: number;
  importsExtracted: number;
  exportsExtracted: number;
  errors: { file: string; error: string }[];
  duration: number;
}

export type ProgressCallback = (progress: IndexingProgress) => void;

/**
 * Build or rebuild the entire index
 */
export async function buildIndex(
  projectRoot: string,
  options: {
    force?: boolean;
    onProgress?: ProgressCallback;
  } = {}
): Promise<IndexingResult> {
  const startTime = Date.now();
  const config = loadConfig(projectRoot);
  const errors: { file: string; error: string }[] = [];

  // Create or get database
  const db = options.force
    ? createDatabase(projectRoot)
    : getDatabase(projectRoot, true);

  // Scan for files
  options.onProgress?.({
    phase: 'scanning',
    current: 0,
    total: 0,
  });

  const files = await scanAndLoadFiles(projectRoot, config);
  const totalFiles = files.length;

  let filesIndexed = 0;
  let symbolsExtracted = 0;
  let importsExtracted = 0;
  let exportsExtracted = 0;

  // Process files in a transaction for better performance
  const processFile = db.transaction((file: ScannedFile) => {
    if (!file.content) return;

    try {
      // Extract symbols, imports, exports
      const result = extractFromFile(file.content, file.path, file.language);

      // Delete existing data for this file
      deleteFileData(db, file.path);

      // Insert file record
      insertFile(db, {
        path: file.path,
        language: file.language,
        modified_at: file.mtime,
        loc: countLines(file.content),
        has_default_export: result.hasDefaultExport,
      });

      // Insert symbols and track IDs
      const symbolIds = new Map<number, number>();
      for (let i = 0; i < result.symbols.length; i++) {
        const symbol = result.symbols[i];
        const parentId =
          symbol.parent_symbol_id !== undefined
            ? symbolIds.get(symbol.parent_symbol_id)
            : undefined;

        const id = insertSymbol(db, {
          ...symbol,
          parent_symbol_id: parentId,
        });
        symbolIds.set(i, id);
      }

      // Insert imports with resolved paths
      for (const imp of result.imports) {
        let resolvedPath = imp.imported_path;
        if (resolvedPath && !imp.is_external) {
          resolvedPath =
            resolveImportPath(resolvedPath, file.path, projectRoot) ??
            resolvedPath;
        }

        insertImport(db, {
          ...imp,
          imported_path: resolvedPath,
        });
      }

      // Insert exports with resolved symbol IDs
      for (const exp of result.exports) {
        const symbolId =
          exp.symbol_id !== undefined ? symbolIds.get(exp.symbol_id) : undefined;

        insertExport(db, {
          ...exp,
          symbol_id: symbolId,
        });
      }

      filesIndexed++;
      symbolsExtracted += result.symbols.length;
      importsExtracted += result.imports.length;
      exportsExtracted += result.exports.length;
    } catch (e) {
      const error = e as Error;
      errors.push({ file: file.path, error: error.message });
    }
  });

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    options.onProgress?.({
      phase: 'parsing',
      current: i + 1,
      total: totalFiles,
      currentFile: file.path,
    });

    processFile(file);
  }

  options.onProgress?.({
    phase: 'complete',
    current: totalFiles,
    total: totalFiles,
  });

  return {
    filesIndexed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted,
    errors,
    duration: Date.now() - startTime,
  };
}

/**
 * Incrementally update the index (only changed files)
 */
export async function updateIndex(
  projectRoot: string,
  options: {
    onProgress?: ProgressCallback;
  } = {}
): Promise<IndexingResult> {
  const startTime = Date.now();
  const config = loadConfig(projectRoot);
  const errors: { file: string; error: string }[] = [];

  const db = getDatabase(projectRoot);
  const currentFiles = await getFileModTimes(projectRoot, config);

  // Find what needs updating
  const staleFiles = getStaleFiles(db, currentFiles);
  const newFiles = getNewFiles(db, currentFiles);
  const deletedFiles = getDeletedFiles(db, currentFiles);

  // Delete removed files
  for (const path of deletedFiles) {
    deleteFileData(db, path);
  }

  // Files to process
  const filesToProcess = [
    ...staleFiles.map((f) => f.path),
    ...newFiles,
  ];

  if (filesToProcess.length === 0) {
    return {
      filesIndexed: 0,
      symbolsExtracted: 0,
      importsExtracted: 0,
      exportsExtracted: 0,
      errors: [],
      duration: Date.now() - startTime,
    };
  }

  // Load and process files
  const files = await scanAndLoadFiles(projectRoot, config, filesToProcess);

  let filesIndexed = 0;
  let symbolsExtracted = 0;
  let importsExtracted = 0;
  let exportsExtracted = 0;

  const processFile = db.transaction((file: ScannedFile) => {
    if (!file.content) return;

    try {
      const result = extractFromFile(file.content, file.path, file.language);

      deleteFileData(db, file.path);

      insertFile(db, {
        path: file.path,
        language: file.language,
        modified_at: file.mtime,
        loc: countLines(file.content),
        has_default_export: result.hasDefaultExport,
      });

      const symbolIds = new Map<number, number>();
      for (let i = 0; i < result.symbols.length; i++) {
        const symbol = result.symbols[i];
        const parentId =
          symbol.parent_symbol_id !== undefined
            ? symbolIds.get(symbol.parent_symbol_id)
            : undefined;

        const id = insertSymbol(db, {
          ...symbol,
          parent_symbol_id: parentId,
        });
        symbolIds.set(i, id);
      }

      for (const imp of result.imports) {
        let resolvedPath = imp.imported_path;
        if (resolvedPath && !imp.is_external) {
          resolvedPath =
            resolveImportPath(resolvedPath, file.path, projectRoot) ??
            resolvedPath;
        }
        insertImport(db, { ...imp, imported_path: resolvedPath });
      }

      for (const exp of result.exports) {
        const symbolId =
          exp.symbol_id !== undefined ? symbolIds.get(exp.symbol_id) : undefined;
        insertExport(db, { ...exp, symbol_id: symbolId });
      }

      filesIndexed++;
      symbolsExtracted += result.symbols.length;
      importsExtracted += result.imports.length;
      exportsExtracted += result.exports.length;
    } catch (e) {
      const error = e as Error;
      errors.push({ file: file.path, error: error.message });
    }
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    options.onProgress?.({
      phase: 'parsing',
      current: i + 1,
      total: files.length,
      currentFile: file.path,
    });

    processFile(file);
  }

  options.onProgress?.({
    phase: 'complete',
    current: files.length,
    total: files.length,
  });

  return {
    filesIndexed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted,
    errors,
    duration: Date.now() - startTime,
  };
}

/**
 * Get index statistics
 */
export function getStats(projectRoot: string): IndexStats {
  const db = getDatabase(projectRoot);
  return getIndexStats(db);
}
