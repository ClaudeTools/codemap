/**
 * Tree-sitter parsing
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// Create parsers for each language
const tsParser = new Parser();
tsParser.setLanguage(TypeScript.typescript);

const tsxParser = new Parser();
tsxParser.setLanguage(TypeScript.tsx);

// JavaScript uses the same parser as TypeScript for compatibility
const jsParser = new Parser();
jsParser.setLanguage(TypeScript.typescript);

/**
 * Get the appropriate parser for a file extension
 */
function getParser(language: 'typescript' | 'javascript', filePath: string): Parser {
  const ext = filePath.split('.').pop()?.toLowerCase();

  if (ext === 'tsx' || ext === 'jsx') {
    return tsxParser;
  }

  return language === 'typescript' ? tsParser : jsParser;
}

/**
 * Parse a file and return its syntax tree
 */
export function parseFile(
  content: string,
  language: 'typescript' | 'javascript',
  filePath: string
): Parser.Tree {
  const parser = getParser(language, filePath);
  return parser.parse(content);
}

/**
 * Get a node's text content
 */
export function getNodeText(node: Parser.SyntaxNode, content: string): string {
  return content.slice(node.startIndex, node.endIndex);
}

/**
 * Find a child node by type
 */
export function findChild(
  node: Parser.SyntaxNode,
  type: string
): Parser.SyntaxNode | null {
  for (const child of node.children) {
    if (child.type === type) {
      return child;
    }
  }
  return null;
}

/**
 * Find all children by type
 */
export function findChildren(
  node: Parser.SyntaxNode,
  type: string
): Parser.SyntaxNode[] {
  return node.children.filter((child) => child.type === type);
}

/**
 * Find a named child by field name
 */
export function findNamedChild(
  node: Parser.SyntaxNode,
  fieldName: string
): Parser.SyntaxNode | null {
  return node.childForFieldName(fieldName);
}

/**
 * Recursively find all nodes of a given type
 */
export function findAllOfType(
  node: Parser.SyntaxNode,
  type: string
): Parser.SyntaxNode[] {
  const results: Parser.SyntaxNode[] = [];

  function traverse(n: Parser.SyntaxNode): void {
    if (n.type === type) {
      results.push(n);
    }
    for (const child of n.children) {
      traverse(child);
    }
  }

  traverse(node);
  return results;
}

/**
 * Get line number from byte position (1-indexed)
 */
export function getLineNumber(content: string, byteIndex: number): number {
  let line = 1;
  for (let i = 0; i < byteIndex && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Check if a node is exported
 */
export function isExported(node: Parser.SyntaxNode): boolean {
  // Check if parent is an export statement
  const parent = node.parent;
  if (!parent) return false;

  if (parent.type === 'export_statement') {
    return true;
  }

  // Check for export keyword as sibling
  for (const sibling of parent.children) {
    if (sibling.type === 'export') {
      return true;
    }
  }

  return false;
}

/**
 * Check if export is default
 */
export function isDefaultExport(node: Parser.SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent || parent.type !== 'export_statement') {
    return false;
  }

  for (const child of parent.children) {
    if (child.type === 'default') {
      return true;
    }
  }

  return false;
}
