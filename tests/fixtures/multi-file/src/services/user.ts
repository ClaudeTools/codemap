/**
 * User service
 */

import type { User, CreateUserInput, UserId } from '../types.js';
import { logger } from '../utils/logger.js';

export class UserService {
  private users: Map<UserId, User> = new Map();

  async getUser(id: UserId): Promise<User | null> {
    logger.debug(`Getting user ${id}`);
    return this.users.get(id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    logger.info(`Created user ${user.id}`);
    return user;
  }

  async deleteUser(id: UserId): Promise<boolean> {
    const deleted = this.users.delete(id);
    if (deleted) {
      logger.info(`Deleted user ${id}`);
    }
    return deleted;
  }
}
