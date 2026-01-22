/**
 * Output formatting utilities for consistent CLI output
 */

export interface OutputOptions {
  json: boolean;
  verbose: boolean;
}

/**
 * Format output based on options (JSON or human-readable)
 */
export function formatOutput(
  data: unknown,
  options: OutputOptions
): string {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }
  // Human-readable format handled by individual commands
  return String(data);
}

/**
 * Print a success message
 */
export function success(message: string): void {
  console.log(message);
}

/**
 * Print an error message
 */
export function error(message: string): void {
  console.error(`Error: ${message}`);
}

/**
 * Print a warning message
 */
export function warn(message: string): void {
  console.warn(`Warning: ${message}`);
}

/**
 * Print an info message (only in verbose mode)
 */
export function info(message: string, verbose: boolean = false): void {
  if (verbose) {
    console.log(message);
  }
}

/**
 * Format a file location string
 */
export function formatLocation(
  path: string,
  lineStart: number,
  lineEnd?: number
): string {
  if (lineEnd && lineEnd !== lineStart) {
    return `${path}:${lineStart}-${lineEnd}`;
  }
  return `${path}:${lineStart}`;
}

/**
 * Format a symbol kind with brackets
 */
export function formatKind(kind: string): string {
  return `[${kind}]`;
}

/**
 * Format export status
 */
export function formatExported(exported: boolean, isDefault: boolean): string {
  if (isDefault) {
    return '(default export)';
  }
  if (exported) {
    return '(exported)';
  }
  return '(private)';
}

/**
 * Truncate a string if it exceeds max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Indent a string by a number of spaces
 */
export function indent(str: string, spaces: number = 2): string {
  const padding = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => padding + line)
    .join('\n');
}

/**
 * Format a count with proper pluralization
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? singular + 's');
  return `${count} ${word}`;
}

/**
 * Format a duration in milliseconds to human-readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format file size in bytes to human-readable
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format a relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  return 'just now';
}
