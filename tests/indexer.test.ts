/**
 * Tests for indexing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';
import { buildIndex, getStats } from '../src/indexer/indexer.js';
import { getDatabase, closeDatabase } from '../src/db/connection.js';
import { findSymbolByName, getImportsByFile, getExportsByFile, getIndexStats } from '../src/db/queries.js';

const FIXTURES_DIR = join(__dirname, 'fixtures');

describe('buildIndex', () => {
  afterEach(() => {
    closeDatabase();
  });

  describe('simple fixture', () => {
    const fixtureDir = join(FIXTURES_DIR, 'simple');
    const codemapDir = join(fixtureDir, '.codemap');

    beforeEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    it('indexes a simple project', async () => {
      const result = await buildIndex(fixtureDir, { force: true });

      expect(result.filesIndexed).toBe(1);
      expect(result.symbolsExtracted).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('finds symbols after indexing', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      const greetSymbols = findSymbolByName(db, 'greet');
      expect(greetSymbols).toHaveLength(1);
      expect(greetSymbols[0].kind).toBe('function');
      expect(greetSymbols[0].exported).toBe(1);

      const userSymbols = findSymbolByName(db, 'User');
      expect(userSymbols).toHaveLength(1);
      expect(userSymbols[0].kind).toBe('interface');
    });
  });

  describe('multi-file fixture', () => {
    const fixtureDir = join(FIXTURES_DIR, 'multi-file');
    const codemapDir = join(fixtureDir, '.codemap');

    beforeEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    it('indexes multiple files', async () => {
      const result = await buildIndex(fixtureDir, { force: true });

      expect(result.filesIndexed).toBeGreaterThan(1);
      expect(result.importsExtracted).toBeGreaterThan(0);
    });

    it('tracks imports correctly', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      const imports = getImportsByFile(db, 'src/index.ts');
      expect(imports.length).toBeGreaterThan(0);

      // Should have internal imports
      const internalImports = imports.filter((i) => !i.is_external);
      expect(internalImports.length).toBeGreaterThan(0);
    });

    it('finds class symbols', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      const userServiceSymbols = findSymbolByName(db, 'UserService');
      expect(userServiceSymbols).toHaveLength(1);
      expect(userServiceSymbols[0].kind).toBe('class');
    });
  });

  describe('with-classes fixture', () => {
    const fixtureDir = join(FIXTURES_DIR, 'with-classes');
    const codemapDir = join(fixtureDir, '.codemap');

    beforeEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    it('indexes class hierarchies', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      // Check that classes are indexed
      const stats = getIndexStats(db);
      expect(stats.symbols).toBeGreaterThan(0);

      // Dog and Cat should be indexed
      const dogSymbols = findSymbolByName(db, 'Dog');
      const catSymbols = findSymbolByName(db, 'Cat');
      expect(dogSymbols.length + catSymbols.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts class methods', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      const speakSymbols = findSymbolByName(db, 'speak');
      // Should find speak method in both Dog and Cat
      expect(speakSymbols.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('barrel-exports fixture', () => {
    const fixtureDir = join(FIXTURES_DIR, 'barrel-exports');
    const codemapDir = join(fixtureDir, '.codemap');

    beforeEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true });
      }
    });

    it('handles barrel exports', async () => {
      await buildIndex(fixtureDir, { force: true });
      const db = getDatabase(fixtureDir);

      const exports = getExportsByFile(db, 'index.ts');
      expect(exports.length).toBeGreaterThan(0);

      // Should have re-exports
      const reexports = exports.filter((e) => e.is_reexport);
      expect(reexports.length).toBeGreaterThan(0);
    });
  });
});

describe('getStats', () => {
  const fixtureDir = join(FIXTURES_DIR, 'simple');
  const codemapDir = join(fixtureDir, '.codemap');

  beforeEach(async () => {
    if (existsSync(codemapDir)) {
      rmSync(codemapDir, { recursive: true });
    }
    await buildIndex(fixtureDir, { force: true });
  });

  afterEach(() => {
    closeDatabase();
    if (existsSync(codemapDir)) {
      rmSync(codemapDir, { recursive: true });
    }
  });

  it('returns correct statistics', () => {
    const stats = getStats(fixtureDir);

    expect(stats.files).toBe(1);
    expect(stats.symbols).toBeGreaterThan(0);
    expect(stats.filesByLanguage).toContainEqual(
      expect.objectContaining({ language: 'typescript' })
    );
  });
});
