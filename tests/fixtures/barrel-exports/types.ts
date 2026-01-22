/**
 * Type definitions
 */

export interface Config {
  apiUrl: string;
  timeout: number;
}

export type Environment = 'development' | 'production' | 'test';
