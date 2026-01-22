/**
 * Terminal colors with forced output (ignores TTY detection)
 */

// Force colors regardless of terminal
const FORCE_COLOR = true;

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright colors
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
};

function wrap(code: string, text: string): string {
  if (!FORCE_COLOR) return text;
  return `${code}${text}${codes.reset}`;
}

export const c = {
  // Styles
  bold: (text: string) => wrap(codes.bold, text),
  dim: (text: string) => wrap(codes.dim, text),

  // Colors
  green: (text: string) => wrap(codes.green, text),
  yellow: (text: string) => wrap(codes.yellow, text),
  blue: (text: string) => wrap(codes.blue, text),
  magenta: (text: string) => wrap(codes.magenta, text),
  cyan: (text: string) => wrap(codes.cyan, text),
  white: (text: string) => wrap(codes.white, text),
  gray: (text: string) => wrap(codes.gray, text),

  // Semantic
  success: (text: string) => wrap(codes.brightGreen, text),
  warn: (text: string) => wrap(codes.brightYellow, text),
  info: (text: string) => wrap(codes.brightCyan, text),
  error: (text: string) => wrap('\x1b[91m', text),

  // Symbols
  check: wrap(codes.brightGreen, '✓'),
  cross: wrap('\x1b[91m', '✗'),
  arrow: wrap(codes.cyan, '→'),
  bullet: wrap(codes.gray, '•'),
};
