/**
 * SQLite database schema creation and migrations
 */

import type Database from 'better-sqlite3';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * SQL statements to create the database schema
 */
export const SCHEMA_SQL = `
-- Schema version for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);

-- Files table: metadata about each indexed file
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    modified_at INTEGER NOT NULL,
    loc INTEGER,
    has_default_export INTEGER DEFAULT 0
);

-- Symbols table: functions, classes, variables, types
CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    kind TEXT NOT NULL,
    signature TEXT,
    exported INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    parent_symbol_id INTEGER,
    FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE,
    FOREIGN KEY (parent_symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Imports table: tracks import relationships between files
CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    importer_path TEXT NOT NULL,
    imported_path TEXT,
    imported_name TEXT NOT NULL,
    alias TEXT,
    is_external INTEGER DEFAULT 0,
    package_name TEXT,
    line_number INTEGER NOT NULL,
    FOREIGN KEY (importer_path) REFERENCES files(path) ON DELETE CASCADE
);

-- Exports table: tracks what each file exports
CREATE TABLE IF NOT EXISTS exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    exported_name TEXT NOT NULL,
    local_name TEXT,
    symbol_id INTEGER,
    is_reexport INTEGER DEFAULT 0,
    source_path TEXT,
    line_number INTEGER NOT NULL,
    FOREIGN KEY (file_path) REFERENCES files(path) ON DELETE CASCADE,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE SET NULL
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
CREATE INDEX IF NOT EXISTS idx_symbols_exported ON symbols(exported);
CREATE INDEX IF NOT EXISTS idx_imports_importer ON imports(importer_path);
CREATE INDEX IF NOT EXISTS idx_imports_imported ON imports(imported_path);
CREATE INDEX IF NOT EXISTS idx_exports_file ON exports(file_path);
CREATE INDEX IF NOT EXISTS idx_exports_name ON exports(exported_name);
`;

/**
 * Initialize the database schema
 */
export function initializeSchema(db: Database.Database): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(SCHEMA_SQL);

  // Set schema version if not present
  const existingVersion = db
    .prepare('SELECT version FROM schema_version LIMIT 1')
    .get() as { version: number } | undefined;

  if (!existingVersion) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
      CURRENT_SCHEMA_VERSION
    );
  }
}

/**
 * Check if the database needs migration
 */
export function needsMigration(db: Database.Database): boolean {
  try {
    const result = db
      .prepare('SELECT version FROM schema_version LIMIT 1')
      .get() as { version: number } | undefined;

    if (!result) {
      return true;
    }

    return result.version < CURRENT_SCHEMA_VERSION;
  } catch {
    return true;
  }
}

/**
 * Clear all data from the database (for rebuild)
 */
export function clearDatabase(db: Database.Database): void {
  db.exec(`
    DELETE FROM exports;
    DELETE FROM imports;
    DELETE FROM symbols;
    DELETE FROM files;
  `);
}

/**
 * Get the current schema version
 */
export function getSchemaVersion(db: Database.Database): number {
  try {
    const result = db
      .prepare('SELECT version FROM schema_version LIMIT 1')
      .get() as { version: number } | undefined;

    return result?.version ?? 0;
  } catch {
    return 0;
  }
}
