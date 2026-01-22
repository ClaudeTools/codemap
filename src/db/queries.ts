/**
 * Database query functions
 */

import type Database from 'better-sqlite3';
import type {
  FileRecord,
  SymbolRecord,
  ImportRecord,
  ExportRecord,
  FileInsert,
  SymbolInsert,
  ImportInsert,
  ExportInsert,
  ExportWithSymbol,
} from './types.js';

// ============================================================================
// File queries
// ============================================================================

export function insertFile(db: Database.Database, file: FileInsert): void {
  db.prepare(
    `INSERT OR REPLACE INTO files (path, language, modified_at, loc, has_default_export)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    file.path,
    file.language,
    file.modified_at,
    file.loc ?? null,
    file.has_default_export ? 1 : 0
  );
}

export function getFile(
  db: Database.Database,
  path: string
): FileRecord | undefined {
  return db.prepare('SELECT * FROM files WHERE path = ?').get(path) as
    | FileRecord
    | undefined;
}

export function getAllFiles(db: Database.Database): FileRecord[] {
  return db.prepare('SELECT * FROM files ORDER BY path').all() as FileRecord[];
}

export function deleteFile(db: Database.Database, path: string): void {
  db.prepare('DELETE FROM files WHERE path = ?').run(path);
}

export function getFileCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM files').get() as {
    count: number;
  };
  return result.count;
}

export function getFilesByLanguage(
  db: Database.Database
): { language: string; count: number }[] {
  return db
    .prepare(
      'SELECT language, COUNT(*) as count FROM files GROUP BY language ORDER BY count DESC'
    )
    .all() as { language: string; count: number }[];
}

export function getTotalLoc(db: Database.Database): number {
  const result = db
    .prepare('SELECT SUM(loc) as total FROM files')
    .get() as { total: number | null };
  return result.total ?? 0;
}

// ============================================================================
// Symbol queries
// ============================================================================

export function insertSymbol(
  db: Database.Database,
  symbol: SymbolInsert
): number {
  const result = db
    .prepare(
      `INSERT INTO symbols (name, file_path, line_start, line_end, kind, signature, exported, is_default, parent_symbol_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      symbol.name,
      symbol.file_path,
      symbol.line_start,
      symbol.line_end,
      symbol.kind,
      symbol.signature ?? null,
      symbol.exported ? 1 : 0,
      symbol.is_default ? 1 : 0,
      symbol.parent_symbol_id ?? null
    );
  return result.lastInsertRowid as number;
}

export function findSymbolByName(
  db: Database.Database,
  name: string
): SymbolRecord[] {
  return db
    .prepare(
      `SELECT * FROM symbols WHERE name = ? ORDER BY exported DESC, file_path ASC`
    )
    .all(name) as SymbolRecord[];
}

export function findSymbolByNameCaseInsensitive(
  db: Database.Database,
  name: string
): SymbolRecord[] {
  return db
    .prepare(
      `SELECT * FROM symbols WHERE LOWER(name) = LOWER(?) ORDER BY exported DESC, file_path ASC`
    )
    .all(name) as SymbolRecord[];
}

export function findSymbolByPrefix(
  db: Database.Database,
  prefix: string
): SymbolRecord[] {
  return db
    .prepare(
      `SELECT * FROM symbols WHERE name LIKE ? ORDER BY exported DESC, LENGTH(name) ASC, file_path ASC LIMIT 20`
    )
    .all(prefix + '%') as SymbolRecord[];
}

export function getSymbolsByFile(
  db: Database.Database,
  filePath: string
): SymbolRecord[] {
  return db
    .prepare(
      `SELECT * FROM symbols WHERE file_path = ? ORDER BY line_start ASC`
    )
    .all(filePath) as SymbolRecord[];
}

export function getExportedSymbolsByFile(
  db: Database.Database,
  filePath: string
): SymbolRecord[] {
  return db
    .prepare(
      `SELECT * FROM symbols WHERE file_path = ? AND exported = 1 ORDER BY line_start ASC`
    )
    .all(filePath) as SymbolRecord[];
}

export function getSymbolCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM symbols').get() as {
    count: number;
  };
  return result.count;
}

export function getSymbolCountByKind(
  db: Database.Database
): { kind: string; count: number }[] {
  return db
    .prepare(
      'SELECT kind, COUNT(*) as count FROM symbols GROUP BY kind ORDER BY count DESC'
    )
    .all() as { kind: string; count: number }[];
}

export function getAllSymbolNames(db: Database.Database): string[] {
  const results = db
    .prepare('SELECT DISTINCT name FROM symbols ORDER BY name')
    .all() as { name: string }[];
  return results.map((r) => r.name);
}

export function getSimilarSymbolNames(
  db: Database.Database,
  name: string,
  limit: number = 5
): string[] {
  // Simple Levenshtein-like similarity using prefix and contains
  const prefix = db
    .prepare(
      `SELECT DISTINCT name FROM symbols WHERE name LIKE ? ORDER BY LENGTH(name) LIMIT ?`
    )
    .all(name.slice(0, 3) + '%', limit) as { name: string }[];

  const contains = db
    .prepare(
      `SELECT DISTINCT name FROM symbols WHERE name LIKE ? AND name NOT LIKE ? ORDER BY LENGTH(name) LIMIT ?`
    )
    .all('%' + name + '%', name.slice(0, 3) + '%', limit) as { name: string }[];

  const results = [...prefix, ...contains];
  const unique = [...new Set(results.map((r) => r.name))];
  return unique.slice(0, limit);
}

// ============================================================================
// Import queries
// ============================================================================

export function insertImport(db: Database.Database, imp: ImportInsert): void {
  db.prepare(
    `INSERT INTO imports (importer_path, imported_path, imported_name, alias, is_external, package_name, line_number)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    imp.importer_path,
    imp.imported_path ?? null,
    imp.imported_name,
    imp.alias ?? null,
    imp.is_external ? 1 : 0,
    imp.package_name ?? null,
    imp.line_number
  );
}

export function getImportsByFile(
  db: Database.Database,
  filePath: string
): ImportRecord[] {
  return db
    .prepare(
      `SELECT * FROM imports WHERE importer_path = ? ORDER BY is_external ASC, imported_path ASC, line_number ASC`
    )
    .all(filePath) as ImportRecord[];
}

export function getImportersOfFile(
  db: Database.Database,
  filePath: string
): ImportRecord[] {
  return db
    .prepare(
      `SELECT * FROM imports WHERE imported_path = ? ORDER BY importer_path ASC`
    )
    .all(filePath) as ImportRecord[];
}

export function getImportCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM imports').get() as {
    count: number;
  };
  return result.count;
}

export function getExternalPackages(
  db: Database.Database
): { package_name: string; count: number }[] {
  return db
    .prepare(
      `SELECT package_name, COUNT(*) as count FROM imports
       WHERE is_external = 1 AND package_name IS NOT NULL
       GROUP BY package_name ORDER BY count DESC`
    )
    .all() as { package_name: string; count: number }[];
}

// ============================================================================
// Export queries
// ============================================================================

export function insertExport(db: Database.Database, exp: ExportInsert): void {
  db.prepare(
    `INSERT INTO exports (file_path, exported_name, local_name, symbol_id, is_reexport, source_path, line_number)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    exp.file_path,
    exp.exported_name,
    exp.local_name ?? null,
    exp.symbol_id ?? null,
    exp.is_reexport ? 1 : 0,
    exp.source_path ?? null,
    exp.line_number
  );
}

export function getExportsByFile(
  db: Database.Database,
  filePath: string
): ExportRecord[] {
  return db
    .prepare(`SELECT * FROM exports WHERE file_path = ? ORDER BY line_number ASC`)
    .all(filePath) as ExportRecord[];
}

export function getExportsWithSymbolsByFile(
  db: Database.Database,
  filePath: string
): ExportWithSymbol[] {
  return db
    .prepare(
      `SELECT e.*, s.name as symbol_name, s.kind as symbol_kind, s.signature as symbol_signature,
              s.line_start as symbol_line_start, s.line_end as symbol_line_end
       FROM exports e
       LEFT JOIN symbols s ON e.symbol_id = s.id
       WHERE e.file_path = ?
       ORDER BY e.line_number ASC`
    )
    .all(filePath) as ExportWithSymbol[];
}

export function getReexportsByFile(
  db: Database.Database,
  filePath: string
): ExportRecord[] {
  return db
    .prepare(
      `SELECT * FROM exports WHERE file_path = ? AND is_reexport = 1 ORDER BY line_number ASC`
    )
    .all(filePath) as ExportRecord[];
}

export function getExportCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM exports').get() as {
    count: number;
  };
  return result.count;
}

export function hasDefaultExport(
  db: Database.Database,
  filePath: string
): boolean {
  const result = db
    .prepare(
      `SELECT COUNT(*) as count FROM exports WHERE file_path = ? AND exported_name = 'default'`
    )
    .get(filePath) as { count: number };
  return result.count > 0;
}

// ============================================================================
// Aggregation queries
// ============================================================================

export interface IndexStats {
  files: number;
  symbols: number;
  imports: number;
  exports: number;
  loc: number;
  filesByLanguage: { language: string; count: number }[];
  symbolsByKind: { kind: string; count: number }[];
}

export function getIndexStats(db: Database.Database): IndexStats {
  return {
    files: getFileCount(db),
    symbols: getSymbolCount(db),
    imports: getImportCount(db),
    exports: getExportCount(db),
    loc: getTotalLoc(db),
    filesByLanguage: getFilesByLanguage(db),
    symbolsByKind: getSymbolCountByKind(db),
  };
}

// ============================================================================
// Batch operations
// ============================================================================

export function deleteFileData(db: Database.Database, filePath: string): void {
  // Foreign keys handle cascade delete, but we'll be explicit
  db.prepare('DELETE FROM exports WHERE file_path = ?').run(filePath);
  db.prepare('DELETE FROM imports WHERE importer_path = ?').run(filePath);
  db.prepare('DELETE FROM symbols WHERE file_path = ?').run(filePath);
  db.prepare('DELETE FROM files WHERE path = ?').run(filePath);
}

export function getStaleFiles(
  db: Database.Database,
  currentFiles: Map<string, number>
): { path: string; modified_at: number }[] {
  const files = getAllFiles(db);
  const stale: { path: string; modified_at: number }[] = [];

  for (const file of files) {
    const currentMtime = currentFiles.get(file.path);
    if (currentMtime && currentMtime > file.modified_at) {
      stale.push({ path: file.path, modified_at: file.modified_at });
    }
  }

  return stale;
}

export function getNewFiles(
  db: Database.Database,
  currentFiles: Map<string, number>
): string[] {
  const indexedPaths = new Set(getAllFiles(db).map((f) => f.path));
  const newFiles: string[] = [];

  for (const path of currentFiles.keys()) {
    if (!indexedPaths.has(path)) {
      newFiles.push(path);
    }
  }

  return newFiles;
}

export function getDeletedFiles(
  db: Database.Database,
  currentFiles: Map<string, number>
): string[] {
  const files = getAllFiles(db);
  const deleted: string[] = [];

  for (const file of files) {
    if (!currentFiles.has(file.path)) {
      deleted.push(file.path);
    }
  }

  return deleted;
}
