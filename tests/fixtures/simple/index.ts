/**
 * Simple single-file test fixture
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export const VERSION = '1.0.0';

export interface User {
  id: string;
  name: string;
  email: string;
}

export type UserId = string;

function privateHelper(): void {
  // Not exported
}
