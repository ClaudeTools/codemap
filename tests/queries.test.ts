/**
 * Tests for database queries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { initializeSchema } from '../src/db/schema.js';
import {
  insertFile,
  insertSymbol,
  insertImport,
  insertExport,
  findSymbolByName,
  findSymbolByNameCaseInsensitive,
  findSymbolByPrefix,
  getSimilarSymbolNames,
  getImportsByFile,
  getExportsByFile,
  getIndexStats,
} from '../src/db/queries.js';

describe('database queries', () => {
  let db: Database.Database;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codemap-test-'));
    db = new Database(join(tempDir, 'test.db'));
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true });
  });

  describe('insertFile and file queries', () => {
    it('inserts and retrieves files', () => {
      insertFile(db, {
        path: 'src/index.ts',
        language: 'typescript',
        modified_at: Date.now(),
        loc: 100,
      });

      const stats = getIndexStats(db);
      expect(stats.files).toBe(1);
    });
  });

  describe('symbol queries', () => {
    beforeEach(() => {
      insertFile(db, {
        path: 'src/auth.ts',
        language: 'typescript',
        modified_at: Date.now(),
      });

      insertSymbol(db, {
        name: 'authenticate',
        file_path: 'src/auth.ts',
        line_start: 10,
        line_end: 20,
        kind: 'function',
        signature: 'function authenticate(): boolean',
        exported: true,
      });

      insertSymbol(db, {
        name: 'Authenticator',
        file_path: 'src/auth.ts',
        line_start: 25,
        line_end: 50,
        kind: 'class',
        exported: true,
      });

      insertSymbol(db, {
        name: 'privateHelper',
        file_path: 'src/auth.ts',
        line_start: 5,
        line_end: 8,
        kind: 'function',
        exported: false,
      });
    });

    it('finds symbols by exact name', () => {
      const results = findSymbolByName(db, 'authenticate');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('authenticate');
    });

    it('finds symbols case-insensitively', () => {
      const results = findSymbolByNameCaseInsensitive(db, 'AUTHENTICATE');
      expect(results).toHaveLength(1);
    });

    it('finds symbols by prefix', () => {
      const results = findSymbolByPrefix(db, 'auth');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.name === 'authenticate')).toBe(true);
    });

    it('suggests similar symbol names', () => {
      const suggestions = getSimilarSymbolNames(db, 'authen', 5);
      expect(suggestions).toContain('authenticate');
    });
  });

  describe('import queries', () => {
    beforeEach(() => {
      insertFile(db, {
        path: 'src/index.ts',
        language: 'typescript',
        modified_at: Date.now(),
      });

      insertImport(db, {
        importer_path: 'src/index.ts',
        imported_path: 'src/auth.ts',
        imported_name: 'authenticate',
        line_number: 1,
        is_external: false,
      });

      insertImport(db, {
        importer_path: 'src/index.ts',
        imported_name: 'express',
        line_number: 2,
        is_external: true,
        package_name: 'express',
      });
    });

    it('retrieves imports by file', () => {
      const imports = getImportsByFile(db, 'src/index.ts');
      expect(imports).toHaveLength(2);
    });

    it('separates internal and external imports', () => {
      const imports = getImportsByFile(db, 'src/index.ts');
      const internal = imports.filter((i) => !i.is_external);
      const external = imports.filter((i) => i.is_external);

      expect(internal).toHaveLength(1);
      expect(external).toHaveLength(1);
    });
  });

  describe('export queries', () => {
    beforeEach(() => {
      insertFile(db, {
        path: 'src/auth.ts',
        language: 'typescript',
        modified_at: Date.now(),
      });

      insertExport(db, {
        file_path: 'src/auth.ts',
        exported_name: 'authenticate',
        line_number: 10,
      });

      insertExport(db, {
        file_path: 'src/auth.ts',
        exported_name: '*',
        is_reexport: true,
        source_path: './utils',
        line_number: 1,
      });
    });

    it('retrieves exports by file', () => {
      const exports = getExportsByFile(db, 'src/auth.ts');
      expect(exports).toHaveLength(2);
    });

    it('identifies re-exports', () => {
      const exports = getExportsByFile(db, 'src/auth.ts');
      const reexports = exports.filter((e) => e.is_reexport);
      expect(reexports).toHaveLength(1);
    });
  });

  describe('getIndexStats', () => {
    beforeEach(() => {
      insertFile(db, {
        path: 'src/index.ts',
        language: 'typescript',
        modified_at: Date.now(),
        loc: 100,
      });

      insertSymbol(db, {
        name: 'main',
        file_path: 'src/index.ts',
        line_start: 1,
        line_end: 10,
        kind: 'function',
      });
    });

    it('returns correct statistics', () => {
      const stats = getIndexStats(db);

      expect(stats.files).toBe(1);
      expect(stats.symbols).toBe(1);
      expect(stats.loc).toBe(100);
    });
  });
});
