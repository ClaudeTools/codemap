/**
 * Multi-file test fixture - entry point
 */

import { UserService } from './services/user.js';
import { logger } from './utils/logger.js';
import type { User } from './types.js';

export const app = {
  userService: new UserService(),
  logger,
};

export function main(): void {
  logger.info('Application started');
}

export type { User };
