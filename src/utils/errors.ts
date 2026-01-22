/**
 * Custom error types for codemap
 */

export class CodemapError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'CodemapError';
  }
}

export class IndexNotFoundError extends CodemapError {
  constructor() {
    super(
      'Index not found. Run "codemap index" to build the index.',
      'INDEX_NOT_FOUND'
    );
  }
}

export class SymbolNotFoundError extends CodemapError {
  suggestions: string[];

  constructor(symbol: string, suggestions: string[] = []) {
    let message = `Symbol not found: "${symbol}"`;
    if (suggestions.length > 0) {
      message += `\n\nDid you mean?\n${suggestions.map((s) => `  ${s}`).join('\n')}`;
    }
    super(message, 'SYMBOL_NOT_FOUND');
    this.suggestions = suggestions;
  }
}

export class FileNotFoundError extends CodemapError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND');
  }
}

export class FileNotIndexedError extends CodemapError {
  constructor(path: string) {
    super(
      `File not indexed: ${path}\nRun "codemap index" to update the index.`,
      'FILE_NOT_INDEXED'
    );
  }
}

export class ParseError extends CodemapError {
  constructor(path: string, details: string) {
    super(`Failed to parse ${path}: ${details}`, 'PARSE_ERROR');
  }
}

export class ConfigError extends CodemapError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

export class DatabaseError extends CodemapError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR');
  }
}

export class ProjectRootNotFoundError extends CodemapError {
  constructor() {
    super(
      'Could not find project root. Ensure you are in a directory with package.json, .git, or codemap.config.json',
      'PROJECT_ROOT_NOT_FOUND'
    );
  }
}
