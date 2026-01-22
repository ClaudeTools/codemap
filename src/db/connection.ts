/**
 * Database connection management
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { getIndexDbPath, getCodemapDir } from '../utils/paths.js';
import { IndexNotFoundError, DatabaseError } from '../utils/errors.js';
import { initializeSchema, needsMigration, clearDatabase } from './schema.js';

let cachedDb: Database.Database | null = null;
let cachedProjectRoot: string | null = null;

/**
 * Get or create a database connection
 */
export function getDatabase(
  projectRoot: string,
  createIfMissing: boolean = false
): Database.Database {
  const dbPath = getIndexDbPath(projectRoot);

  // Return cached connection if same project
  if (cachedDb && cachedProjectRoot === projectRoot) {
    return cachedDb;
  }

  // Close existing connection if switching projects
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
    cachedProjectRoot = null;
  }

  // Check if database exists
  if (!existsSync(dbPath)) {
    if (!createIfMissing) {
      throw new IndexNotFoundError();
    }

    // Create .codemap directory
    const codemapDir = getCodemapDir(projectRoot);
    if (!existsSync(codemapDir)) {
      mkdirSync(codemapDir, { recursive: true });
    }
  }

  try {
    const db = new Database(dbPath);

    // Initialize schema if needed
    if (needsMigration(db)) {
      initializeSchema(db);
    }

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Cache the connection
    cachedDb = db;
    cachedProjectRoot = projectRoot;

    return db;
  } catch (e) {
    const error = e as Error;
    throw new DatabaseError(`Failed to open database: ${error.message}`);
  }
}

/**
 * Create a new database (or recreate existing)
 */
export function createDatabase(projectRoot: string): Database.Database {
  const codemapDir = getCodemapDir(projectRoot);
  const dbPath = getIndexDbPath(projectRoot);

  // Create .codemap directory
  if (!existsSync(codemapDir)) {
    mkdirSync(codemapDir, { recursive: true });
  }

  // Close cached connection if exists
  if (cachedDb && cachedProjectRoot === projectRoot) {
    cachedDb.close();
    cachedDb = null;
    cachedProjectRoot = null;
  }

  try {
    const db = new Database(dbPath);
    initializeSchema(db);
    db.pragma('journal_mode = WAL');

    cachedDb = db;
    cachedProjectRoot = projectRoot;

    return db;
  } catch (e) {
    const error = e as Error;
    throw new DatabaseError(`Failed to create database: ${error.message}`);
  }
}

/**
 * Rebuild the database (clear all data but keep schema)
 */
export function rebuildDatabase(projectRoot: string): Database.Database {
  const db = getDatabase(projectRoot, true);
  clearDatabase(db);
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
    cachedProjectRoot = null;
  }
}

/**
 * Get database file stats
 */
export function getDatabaseStats(projectRoot: string): {
  exists: boolean;
  path: string;
  size: number;
  lastModified: Date | null;
} {
  const dbPath = getIndexDbPath(projectRoot);
  const exists = existsSync(dbPath);

  if (!exists) {
    return {
      exists: false,
      path: dbPath,
      size: 0,
      lastModified: null,
    };
  }

  try {
    const { statSync } = require('fs');
    const stats = statSync(dbPath);
    return {
      exists: true,
      path: dbPath,
      size: stats.size,
      lastModified: stats.mtime,
    };
  } catch {
    return {
      exists: true,
      path: dbPath,
      size: 0,
      lastModified: null,
    };
  }
}
