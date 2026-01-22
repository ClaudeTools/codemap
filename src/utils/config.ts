/**
 * Configuration loading and defaults
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ConfigError } from './errors.js';

export interface CodemapConfig {
  include: string[];
  exclude: string[];
  languages: {
    typescript: string[];
    javascript: string[];
  };
}

const DEFAULT_CONFIG: CodemapConfig = {
  include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '**/*.d.ts',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.spec.js',
    '**/*.spec.jsx',
    '__tests__/**',
    '__mocks__/**',
    'coverage/**',
    '.codemap/**',
  ],
  languages: {
    typescript: ['.ts', '.tsx', '.mts', '.cts'],
    javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  },
};

/**
 * Load configuration from codemap.config.json or use defaults
 */
export function loadConfig(projectRoot: string): CodemapConfig {
  const configPath = join(projectRoot, 'codemap.config.json');

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<CodemapConfig>;

    return {
      include: userConfig.include ?? DEFAULT_CONFIG.include,
      exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,
      languages: {
        typescript:
          userConfig.languages?.typescript ?? DEFAULT_CONFIG.languages.typescript,
        javascript:
          userConfig.languages?.javascript ?? DEFAULT_CONFIG.languages.javascript,
      },
    };
  } catch (e) {
    const error = e as Error;
    throw new ConfigError(`Failed to load codemap.config.json: ${error.message}`);
  }
}

/**
 * Get all file extensions that should be indexed
 */
export function getAllExtensions(config: CodemapConfig): string[] {
  return [...config.languages.typescript, ...config.languages.javascript];
}

/**
 * Check if a file path should be included based on config
 */
export function shouldIncludeFile(
  filePath: string,
  config: CodemapConfig
): boolean {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  const allExtensions = getAllExtensions(config);
  return allExtensions.includes(ext);
}
