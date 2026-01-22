/**
 * Tests for symbol extraction
 */

import { describe, it, expect } from 'vitest';
import { extractFromFile } from '../src/indexer/extractor.js';

describe('extractFromFile', () => {
  describe('function extraction', () => {
    it('extracts function declarations', () => {
      const code = `
        export function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('greet');
      expect(result.symbols[0].kind).toBe('function');
      expect(result.symbols[0].exported).toBe(true);
    });

    it('extracts arrow functions', () => {
      const code = `
        export const add = (a: number, b: number): number => a + b;
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      // Arrow functions assigned to const are extracted as variables or functions
      // depending on tree-sitter parsing
      expect(result.symbols.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts async functions', () => {
      const code = `
        export async function fetchData(): Promise<string> {
          return 'data';
        }
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.symbols[0].signature).toContain('async');
    });
  });

  describe('class extraction', () => {
    it('extracts class declarations', () => {
      const code = `
        export class UserService {
          getUser(id: string): User {
            return { id };
          }
        }
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      // Should have class and method
      const classSymbol = result.symbols.find((s) => s.kind === 'class');
      const methodSymbol = result.symbols.find((s) => s.kind === 'method');

      expect(classSymbol).toBeDefined();
      expect(classSymbol!.name).toBe('UserService');
      expect(methodSymbol).toBeDefined();
      expect(methodSymbol!.name).toBe('getUser');
    });

    it('extracts class with extends', () => {
      const code = `
        export class Dog extends Animal {
          speak(): string {
            return 'woof';
          }
        }
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      const classSymbol = result.symbols.find((s) => s.kind === 'class');
      expect(classSymbol).toBeDefined();
      expect(classSymbol!.name).toBe('Dog');
    });
  });

  describe('interface extraction', () => {
    it('extracts interface declarations', () => {
      const code = `
        export interface User {
          id: string;
          name: string;
        }
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('User');
      expect(result.symbols[0].kind).toBe('interface');
    });
  });

  describe('type extraction', () => {
    it('extracts type aliases', () => {
      const code = `
        export type UserId = string;
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('UserId');
      expect(result.symbols[0].kind).toBe('type');
    });
  });

  describe('import extraction', () => {
    it('extracts named imports', () => {
      const code = `
        import { foo, bar } from './module';
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].imported_name).toBe('foo');
      expect(result.imports[1].imported_name).toBe('bar');
    });

    it('extracts default imports', () => {
      const code = `
        import config from './config';
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].imported_name).toBe('default');
      expect(result.imports[0].alias).toBe('config');
    });

    it('extracts external imports', () => {
      const code = `
        import express from 'express';
        import { Router } from 'express';
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].is_external).toBe(true);
      expect(result.imports[0].package_name).toBe('express');
    });

    it('extracts namespace imports', () => {
      const code = `
        import * as utils from './utils';
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].imported_name).toBe('*');
      expect(result.imports[0].alias).toBe('utils');
    });
  });

  describe('export extraction', () => {
    it('extracts named exports', () => {
      const code = `
        export { foo, bar };
        const foo = 1;
        const bar = 2;
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      const exports = result.exports.filter((e) => e.exported_name !== 'default');
      expect(exports.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts re-exports', () => {
      const code = `
        export { foo } from './module';
        export * from './other';
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      const reexports = result.exports.filter((e) => e.is_reexport);
      expect(reexports.length).toBeGreaterThanOrEqual(1);
    });

    it('detects default exports', () => {
      const code = `
        export default function main() {}
      `;

      const result = extractFromFile(code, 'test.ts', 'typescript');

      expect(result.hasDefaultExport).toBe(true);
    });
  });
});
