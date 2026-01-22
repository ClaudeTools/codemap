/**
 * Symbol, import, and export extraction from AST
 */

import type Parser from 'tree-sitter';
import type { SymbolInsert, ImportInsert, ExportInsert } from '../db/types.js';
import {
  parseFile,
  getNodeText,
  findChild,
  findChildren,
  findAllOfType,
} from './parser.js';

export interface ExtractionResult {
  symbols: SymbolInsert[];
  imports: ImportInsert[];
  exports: ExportInsert[];
  hasDefaultExport: boolean;
}

/**
 * Extract all symbols, imports, and exports from a file
 */
export function extractFromFile(
  content: string,
  filePath: string,
  language: 'typescript' | 'javascript'
): ExtractionResult {
  const tree = parseFile(content, language, filePath);
  const root = tree.rootNode;

  const symbols = extractSymbols(root, content, filePath);
  const imports = extractImports(root, content, filePath);
  const exports = extractExports(root, content, filePath, symbols);

  const hasDefaultExport = exports.some((e) => e.exported_name === 'default');

  return {
    symbols,
    imports,
    exports,
    hasDefaultExport,
  };
}

/**
 * Extract symbols (functions, classes, variables, types) from AST
 */
function extractSymbols(
  root: Parser.SyntaxNode,
  content: string,
  filePath: string
): SymbolInsert[] {
  const symbols: SymbolInsert[] = [];

  // Helper to check if node is exported
  function isExported(node: Parser.SyntaxNode): boolean {
    const parent = node.parent;
    if (!parent) return false;
    return parent.type === 'export_statement';
  }

  // Helper to check if it's a default export
  function isDefault(node: Parser.SyntaxNode): boolean {
    const parent = node.parent;
    if (!parent || parent.type !== 'export_statement') return false;
    return parent.children.some((c) => c.type === 'default');
  }

  // Extract function declarations
  const functions = findAllOfType(root, 'function_declaration');
  for (const fn of functions) {
    const nameNode = fn.childForFieldName('name');
    if (!nameNode) continue;

    symbols.push({
      name: getNodeText(nameNode, content),
      file_path: filePath,
      line_start: fn.startPosition.row + 1,
      line_end: fn.endPosition.row + 1,
      kind: 'function',
      signature: getSignature(fn, content),
      exported: isExported(fn),
      is_default: isDefault(fn),
    });
  }

  // Extract arrow functions assigned to variables (const foo = () => {})
  // Tree-sitter uses 'lexical_declaration' for const/let and 'variable_declaration' for var
  const lexicalDeclarations = findAllOfType(root, 'lexical_declaration');
  const varDeclarations = findAllOfType(root, 'variable_declaration');
  const allVarDecls = [...lexicalDeclarations, ...varDeclarations];

  for (const varDecl of allVarDecls) {
    const declarators = findChildren(varDecl, 'variable_declarator');
    for (const declarator of declarators) {
      const nameNode = declarator.childForFieldName('name');
      const valueNode = declarator.childForFieldName('value');

      if (!nameNode || !valueNode) continue;

      if (valueNode.type === 'arrow_function' || valueNode.type === 'function') {
        const parent = varDecl.parent;
        const exported = parent?.type === 'export_statement';
        const isDefaultExport =
          exported && parent?.children.some((c) => c.type === 'default');

        symbols.push({
          name: getNodeText(nameNode, content),
          file_path: filePath,
          line_start: varDecl.startPosition.row + 1,
          line_end: varDecl.endPosition.row + 1,
          kind: 'function',
          signature: getVariableSignature(varDecl, content),
          exported,
          is_default: isDefaultExport,
        });
      } else {
        // Regular variable
        const parent = varDecl.parent;
        const exported = parent?.type === 'export_statement';

        symbols.push({
          name: getNodeText(nameNode, content),
          file_path: filePath,
          line_start: varDecl.startPosition.row + 1,
          line_end: varDecl.endPosition.row + 1,
          kind: 'variable',
          signature: getVariableSignature(varDecl, content),
          exported,
          is_default: false,
        });
      }
    }
  }

  // Extract class declarations
  const classes = findAllOfType(root, 'class_declaration');
  for (const cls of classes) {
    const nameNode = cls.childForFieldName('name');
    if (!nameNode) continue;

    const classId = symbols.length;
    symbols.push({
      name: getNodeText(nameNode, content),
      file_path: filePath,
      line_start: cls.startPosition.row + 1,
      line_end: cls.endPosition.row + 1,
      kind: 'class',
      signature: getClassSignature(cls, content),
      exported: isExported(cls),
      is_default: isDefault(cls),
    });

    // Extract methods from class body
    const body = cls.childForFieldName('body');
    if (body) {
      const methods = findChildren(body, 'method_definition');
      for (const method of methods) {
        const methodNameNode = method.childForFieldName('name');
        if (!methodNameNode) continue;

        symbols.push({
          name: getNodeText(methodNameNode, content),
          file_path: filePath,
          line_start: method.startPosition.row + 1,
          line_end: method.endPosition.row + 1,
          kind: 'method',
          signature: getMethodSignature(method, content),
          exported: false, // Methods aren't directly exported
          is_default: false,
          parent_symbol_id: classId, // Will be resolved after insert
        });
      }

      // Extract public fields
      const fields = findChildren(body, 'public_field_definition');
      for (const field of fields) {
        const fieldNameNode = field.childForFieldName('name');
        if (!fieldNameNode) continue;

        symbols.push({
          name: getNodeText(fieldNameNode, content),
          file_path: filePath,
          line_start: field.startPosition.row + 1,
          line_end: field.endPosition.row + 1,
          kind: 'property',
          signature: getNodeText(field, content).split('\n')[0],
          exported: false,
          is_default: false,
          parent_symbol_id: classId,
        });
      }
    }
  }

  // Extract interface declarations
  const interfaces = findAllOfType(root, 'interface_declaration');
  for (const iface of interfaces) {
    const nameNode = iface.childForFieldName('name');
    if (!nameNode) continue;

    symbols.push({
      name: getNodeText(nameNode, content),
      file_path: filePath,
      line_start: iface.startPosition.row + 1,
      line_end: iface.endPosition.row + 1,
      kind: 'interface',
      signature: getInterfaceSignature(iface, content),
      exported: isExported(iface),
      is_default: false, // Interfaces can't be default exports
    });
  }

  // Extract type alias declarations
  const typeAliases = findAllOfType(root, 'type_alias_declaration');
  for (const typeAlias of typeAliases) {
    const nameNode = typeAlias.childForFieldName('name');
    if (!nameNode) continue;

    symbols.push({
      name: getNodeText(nameNode, content),
      file_path: filePath,
      line_start: typeAlias.startPosition.row + 1,
      line_end: typeAlias.endPosition.row + 1,
      kind: 'type',
      signature: getTypeAliasSignature(typeAlias, content),
      exported: isExported(typeAlias),
      is_default: false,
    });
  }

  // Extract enum declarations
  const enums = findAllOfType(root, 'enum_declaration');
  for (const enumDecl of enums) {
    const nameNode = enumDecl.childForFieldName('name');
    if (!nameNode) continue;

    symbols.push({
      name: getNodeText(nameNode, content),
      file_path: filePath,
      line_start: enumDecl.startPosition.row + 1,
      line_end: enumDecl.endPosition.row + 1,
      kind: 'enum',
      signature: getEnumSignature(enumDecl, content),
      exported: isExported(enumDecl),
      is_default: false,
    });
  }

  return symbols;
}

/**
 * Extract imports from AST
 */
function extractImports(
  root: Parser.SyntaxNode,
  content: string,
  filePath: string
): ImportInsert[] {
  const imports: ImportInsert[] = [];
  const importStatements = findAllOfType(root, 'import_statement');

  for (const stmt of importStatements) {
    const sourceNode = stmt.childForFieldName('source');
    if (!sourceNode) continue;

    const sourcePath = getNodeText(sourceNode, content).replace(/['"]/g, '');
    const isExternal = !sourcePath.startsWith('.') && !sourcePath.startsWith('/');
    const packageName = isExternal ? getPackageName(sourcePath) : undefined;

    // Check for default import
    const importClause = findChild(stmt, 'import_clause');
    if (importClause) {
      // Default import: import foo from './bar'
      const defaultImport = findChild(importClause, 'identifier');
      if (defaultImport) {
        imports.push({
          importer_path: filePath,
          imported_path: isExternal ? undefined : sourcePath,
          imported_name: 'default',
          alias: getNodeText(defaultImport, content),
          is_external: isExternal,
          package_name: packageName,
          line_number: stmt.startPosition.row + 1,
        });
      }

      // Named imports: import { foo, bar as baz } from './bar'
      const namedImports = findChild(importClause, 'named_imports');
      if (namedImports) {
        const specifiers = findChildren(namedImports, 'import_specifier');
        for (const spec of specifiers) {
          const nameNode = spec.childForFieldName('name');
          const aliasNode = spec.childForFieldName('alias');

          if (nameNode) {
            const importedName = getNodeText(nameNode, content);
            imports.push({
              importer_path: filePath,
              imported_path: isExternal ? undefined : sourcePath,
              imported_name: importedName,
              alias: aliasNode ? getNodeText(aliasNode, content) : undefined,
              is_external: isExternal,
              package_name: packageName,
              line_number: stmt.startPosition.row + 1,
            });
          }
        }
      }

      // Namespace import: import * as foo from './bar'
      const namespaceImport = findChild(importClause, 'namespace_import');
      if (namespaceImport) {
        const aliasNode = namespaceImport.children.find(
          (c) => c.type === 'identifier'
        );
        if (aliasNode) {
          imports.push({
            importer_path: filePath,
            imported_path: isExternal ? undefined : sourcePath,
            imported_name: '*',
            alias: getNodeText(aliasNode, content),
            is_external: isExternal,
            package_name: packageName,
            line_number: stmt.startPosition.row + 1,
          });
        }
      }
    }

    // Side-effect import: import './styles.css'
    if (!importClause) {
      imports.push({
        importer_path: filePath,
        imported_path: isExternal ? undefined : sourcePath,
        imported_name: '*',
        is_external: isExternal,
        package_name: packageName,
        line_number: stmt.startPosition.row + 1,
      });
    }
  }

  return imports;
}

/**
 * Extract exports from AST
 */
function extractExports(
  root: Parser.SyntaxNode,
  content: string,
  filePath: string,
  symbols: SymbolInsert[]
): ExportInsert[] {
  const exports: ExportInsert[] = [];
  const exportStatements = findAllOfType(root, 'export_statement');

  for (const stmt of exportStatements) {
    const lineNumber = stmt.startPosition.row + 1;

    // Check for re-export: export { foo } from './bar'
    const sourceNode = stmt.childForFieldName('source');
    const isReexport = sourceNode !== null;
    const sourcePath = sourceNode
      ? getNodeText(sourceNode, content).replace(/['"]/g, '')
      : undefined;

    // Check for default export
    const hasDefault = stmt.children.some((c) => c.type === 'default');

    if (hasDefault) {
      // export default foo
      // export default function foo() {}
      // export default class Foo {}
      exports.push({
        file_path: filePath,
        exported_name: 'default',
        is_reexport: isReexport,
        source_path: sourcePath,
        line_number: lineNumber,
      });
      continue;
    }

    // Named exports: export { foo, bar as baz }
    const exportClause = findChild(stmt, 'export_clause');
    if (exportClause) {
      const specifiers = findChildren(exportClause, 'export_specifier');
      for (const spec of specifiers) {
        const nameNode = spec.childForFieldName('name');
        const aliasNode = spec.childForFieldName('alias');

        if (nameNode) {
          const localName = getNodeText(nameNode, content);
          const exportedName = aliasNode
            ? getNodeText(aliasNode, content)
            : localName;

          // Find matching symbol
          const symbol = symbols.find(
            (s) => s.name === localName && s.file_path === filePath
          );

          exports.push({
            file_path: filePath,
            exported_name: exportedName,
            local_name: localName !== exportedName ? localName : undefined,
            symbol_id: symbol ? symbols.indexOf(symbol) : undefined, // Placeholder, will be updated
            is_reexport: isReexport,
            source_path: sourcePath,
            line_number: lineNumber,
          });
        }
      }
      continue;
    }

    // Namespace re-export: export * from './bar'
    const namespaceExport = findChild(stmt, 'namespace_export');
    if (namespaceExport || stmt.children.some((c) => c.type === '*')) {
      exports.push({
        file_path: filePath,
        exported_name: '*',
        is_reexport: true,
        source_path: sourcePath,
        line_number: lineNumber,
      });
      continue;
    }

    // Direct exports: export function foo() {} or export const bar = ...
    const declaration = stmt.childForFieldName('declaration');
    if (declaration) {
      // Find the symbol that matches this declaration
      const symbol = symbols.find(
        (s) =>
          s.file_path === filePath &&
          s.line_start === declaration.startPosition.row + 1
      );

      if (symbol) {
        exports.push({
          file_path: filePath,
          exported_name: symbol.name,
          symbol_id: symbols.indexOf(symbol),
          is_reexport: false,
          line_number: lineNumber,
        });
      }
    }
  }

  return exports;
}

// ============================================================================
// Signature extraction helpers
// ============================================================================

function getSignature(fn: Parser.SyntaxNode, content: string): string {
  const parts: string[] = [];

  // Check for async
  if (fn.children.some((c) => c.type === 'async')) {
    parts.push('async');
  }

  parts.push('function');

  const name = fn.childForFieldName('name');
  if (name) {
    parts.push(getNodeText(name, content));
  }

  const params = fn.childForFieldName('parameters');
  if (params) {
    parts.push(getNodeText(params, content));
  }

  const returnType = fn.childForFieldName('return_type');
  if (returnType) {
    parts.push(': ' + getNodeText(returnType, content).replace(/^:\s*/, ''));
  }

  return parts.join(' ');
}

function getVariableSignature(varDecl: Parser.SyntaxNode, content: string): string {
  const firstLine = getNodeText(varDecl, content).split('\n')[0];
  // Limit length
  if (firstLine.length > 100) {
    return firstLine.slice(0, 97) + '...';
  }
  return firstLine;
}

function getClassSignature(cls: Parser.SyntaxNode, content: string): string {
  const parts: string[] = ['class'];

  const name = cls.childForFieldName('name');
  if (name) {
    parts.push(getNodeText(name, content));
  }

  const heritage = cls.childForFieldName('type_parameters');
  if (heritage) {
    parts.push(getNodeText(heritage, content));
  }

  // Check for extends
  const extendsClause = findChild(cls, 'extends_clause');
  if (extendsClause) {
    parts.push(getNodeText(extendsClause, content));
  }

  // Check for implements
  const implementsClause = findChild(cls, 'implements_clause');
  if (implementsClause) {
    parts.push(getNodeText(implementsClause, content));
  }

  return parts.join(' ');
}

function getMethodSignature(method: Parser.SyntaxNode, content: string): string {
  const parts: string[] = [];

  // Check for static
  if (method.children.some((c) => c.type === 'static')) {
    parts.push('static');
  }

  // Check for async
  if (method.children.some((c) => c.type === 'async')) {
    parts.push('async');
  }

  const name = method.childForFieldName('name');
  if (name) {
    parts.push(getNodeText(name, content));
  }

  const params = method.childForFieldName('parameters');
  if (params) {
    parts.push(getNodeText(params, content));
  }

  const returnType = method.childForFieldName('return_type');
  if (returnType) {
    parts.push(': ' + getNodeText(returnType, content).replace(/^:\s*/, ''));
  }

  return parts.join(' ');
}

function getInterfaceSignature(iface: Parser.SyntaxNode, content: string): string {
  const parts: string[] = ['interface'];

  const name = iface.childForFieldName('name');
  if (name) {
    parts.push(getNodeText(name, content));
  }

  const typeParams = iface.childForFieldName('type_parameters');
  if (typeParams) {
    parts.push(getNodeText(typeParams, content));
  }

  // Check for extends
  const extendsClause = findChild(iface, 'extends_type_clause');
  if (extendsClause) {
    parts.push(getNodeText(extendsClause, content));
  }

  return parts.join(' ');
}

function getTypeAliasSignature(
  typeAlias: Parser.SyntaxNode,
  content: string
): string {
  const firstLine = getNodeText(typeAlias, content).split('\n')[0];
  if (firstLine.length > 100) {
    return firstLine.slice(0, 97) + '...';
  }
  return firstLine;
}

function getEnumSignature(enumDecl: Parser.SyntaxNode, content: string): string {
  const parts: string[] = ['enum'];

  const name = enumDecl.childForFieldName('name');
  if (name) {
    parts.push(getNodeText(name, content));
  }

  return parts.join(' ');
}

function getPackageName(importPath: string): string {
  // Handle scoped packages: @foo/bar -> @foo/bar
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.slice(0, 2).join('/');
  }
  // Regular packages: foo/bar -> foo
  return importPath.split('/')[0];
}
