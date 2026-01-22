/**
 * Database types matching the SQLite schema
 */

export interface FileRecord {
  path: string;
  language: string;
  modified_at: number;
  loc: number | null;
  has_default_export: number;
}

export interface SymbolRecord {
  id: number;
  name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  kind: SymbolKind;
  signature: string | null;
  exported: number;
  is_default: number;
  parent_symbol_id: number | null;
}

export interface ImportRecord {
  id: number;
  importer_path: string;
  imported_path: string | null;
  imported_name: string;
  alias: string | null;
  is_external: number;
  package_name: string | null;
  line_number: number;
}

export interface ExportRecord {
  id: number;
  file_path: string;
  exported_name: string;
  local_name: string | null;
  symbol_id: number | null;
  is_reexport: number;
  source_path: string | null;
  line_number: number;
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'variable'
  | 'type'
  | 'interface'
  | 'enum'
  | 'method'
  | 'property';

/**
 * Insertion types (without auto-generated fields)
 */

export interface FileInsert {
  path: string;
  language: string;
  modified_at: number;
  loc?: number;
  has_default_export?: boolean;
}

export interface SymbolInsert {
  name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  kind: SymbolKind;
  signature?: string;
  exported?: boolean;
  is_default?: boolean;
  parent_symbol_id?: number;
}

export interface ImportInsert {
  importer_path: string;
  imported_path?: string;
  imported_name: string;
  alias?: string;
  is_external?: boolean;
  package_name?: string;
  line_number: number;
}

export interface ExportInsert {
  file_path: string;
  exported_name: string;
  local_name?: string;
  symbol_id?: number;
  is_reexport?: boolean;
  source_path?: string;
  line_number: number;
}

/**
 * Query result types with joins
 */

export interface SymbolWithFile extends SymbolRecord {
  file_language?: string;
}

export interface ExportWithSymbol extends ExportRecord {
  symbol_name?: string;
  symbol_kind?: SymbolKind;
  symbol_signature?: string;
  symbol_line_start?: number;
  symbol_line_end?: number;
}

export interface ImportWithFile extends ImportRecord {
  resolved_path?: string;
}
