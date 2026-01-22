#!/usr/bin/env node
/**
 * codemap CLI - Codebase Intelligence for AI Assistants
 *
 * A command-line tool that creates a searchable index of a codebase's
 * structure, symbols, and relationships.
 */

import { Command } from 'commander';
import {
  createIndexCommand,
  createWhereCommand,
  createRefsCommand,
  createDepsCommand,
  createExportsCommand,
  createTreeCommand,
  createSummaryCommand,
  createStatusCommand,
  createInitCommand,
  createUninstallCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('codemap')
  .description(
    'Codebase intelligence CLI - fast symbol lookup, dependency tracing, and code navigation'
  )
  .version('1.7.0');

// Register commands
program.addCommand(createIndexCommand());
program.addCommand(createWhereCommand());
program.addCommand(createRefsCommand());
program.addCommand(createDepsCommand());
program.addCommand(createExportsCommand());
program.addCommand(createTreeCommand());
program.addCommand(createSummaryCommand());
program.addCommand(createStatusCommand());
program.addCommand(createInitCommand());
program.addCommand(createUninstallCommand());

// Parse arguments
program.parse();
