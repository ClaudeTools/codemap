/**
 * Postinstall script to install Claude Code skill
 */

import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const skillDir = join(homedir(), '.claude', 'skills', 'codemap');
const skillSource = join(__dirname, '..', 'skills', 'SKILL.md');

try {
  // Check if source skill file exists
  if (!existsSync(skillSource)) {
    console.log('Skill file not found, skipping Claude Code integration.');
    process.exit(0);
  }

  // Create skill directory
  mkdirSync(skillDir, { recursive: true });

  // Copy skill file
  copyFileSync(skillSource, join(skillDir, 'SKILL.md'));
  console.log('Claude Code skill installed to ~/.claude/skills/codemap/');
} catch (e) {
  const error = e as Error;
  console.log(`
To enable Claude Code integration, manually copy the skill:

  mkdir -p ~/.claude/skills/codemap
  cp ${skillSource} ~/.claude/skills/codemap/SKILL.md

Error: ${error.message}
  `);
}
