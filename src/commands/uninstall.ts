/**
 * 'uninstall' command - Remove codemap from this project
 */

import { Command } from 'commander';
import { rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { findProjectRoot } from '../utils/paths.js';

// Force colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const brightGreen = '\x1b[92m';
const brightYellow = '\x1b[93m';
const gray = '\x1b[90m';

const check = `${brightGreen}✓${reset}`;
const skip = `${gray}○${reset}`;

export function createUninstallCommand(): Command {
  const cmd = new Command('uninstall')
    .description('Remove codemap from this project (index, skill, CLAUDE.md entries)')
    .option('--global', 'Also remove global detection rule from ~/.claude/CLAUDE.md')
    .option('--keep-index', 'Keep the .codemap/ index directory')
    .action(async (options) => {
      const projectRoot = findProjectRoot();

      console.log(`
${cyan}┌──────────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightYellow}${bold}codemap${reset} ${dim}— Removing Claude Code integration${reset}                ${cyan}│${reset}
${cyan}└──────────────────────────────────────────────────────────────┘${reset}
`);

      // 1. Remove .codemap/ directory
      const codemapDir = join(projectRoot, '.codemap');
      if (!options.keepIndex && existsSync(codemapDir)) {
        rmSync(codemapDir, { recursive: true, force: true });
        console.log(`${check} Removed ${dim}.codemap/${reset}`);
      } else if (options.keepIndex && existsSync(codemapDir)) {
        console.log(`${skip} Kept ${dim}.codemap/${reset} (--keep-index)`);
      } else {
        console.log(`${skip} No ${dim}.codemap/${reset} directory found`);
      }

      // 2. Remove .claude/skills/codemap/
      const skillDir = join(projectRoot, '.claude', 'skills', 'codemap');
      if (existsSync(skillDir)) {
        rmSync(skillDir, { recursive: true, force: true });
        console.log(`${check} Removed ${dim}.claude/skills/codemap/${reset}`);

        // Clean up empty parent directories
        const skillsDir = join(projectRoot, '.claude', 'skills');
        try {
          const remaining = require('fs').readdirSync(skillsDir);
          if (remaining.length === 0) {
            rmSync(skillsDir, { recursive: true, force: true });
          }
        } catch {
          // Ignore
        }
      } else {
        console.log(`${skip} No skill directory found`);
      }

      // 3. Remove codemap section from project .claude/CLAUDE.md
      const projectClaudeMd = join(projectRoot, '.claude', 'CLAUDE.md');
      if (existsSync(projectClaudeMd)) {
        let content = readFileSync(projectClaudeMd, 'utf-8');
        if (content.includes('<!-- CODEMAP:START -->')) {
          content = content.replace(
            /\n?<!-- CODEMAP:START -->[\s\S]*?<!-- CODEMAP:END -->\n?/,
            ''
          );
          // Clean up if file is now empty or just has a header
          const trimmed = content.trim();
          if (trimmed === '' || trimmed === '# Project Instructions') {
            rmSync(projectClaudeMd, { force: true });
            console.log(`${check} Removed ${dim}.claude/CLAUDE.md${reset} (was empty)`);

            // Clean up empty .claude directory
            const claudeDir = join(projectRoot, '.claude');
            try {
              const remaining = require('fs').readdirSync(claudeDir);
              if (remaining.length === 0) {
                rmSync(claudeDir, { recursive: true, force: true });
                console.log(`${check} Removed empty ${dim}.claude/${reset} directory`);
              }
            } catch {
              // Ignore
            }
          } else {
            writeFileSync(projectClaudeMd, content);
            console.log(`${check} Removed codemap section from ${dim}.claude/CLAUDE.md${reset}`);
          }
        } else {
          console.log(`${skip} No codemap section in ${dim}.claude/CLAUDE.md${reset}`);
        }
      } else {
        console.log(`${skip} No ${dim}.claude/CLAUDE.md${reset} found`);
      }

      // 4. Remove from .gitignore
      const gitignorePath = join(projectRoot, '.gitignore');
      if (existsSync(gitignorePath)) {
        let content = readFileSync(gitignorePath, 'utf-8');
        if (content.includes('.codemap/')) {
          content = content.replace(/\.codemap\/\n?/, '');
          writeFileSync(gitignorePath, content);
          console.log(`${check} Removed ${dim}.codemap/${reset} from ${dim}.gitignore${reset}`);
        }
      }

      // 5. Remove global detection rule if --global flag
      if (options.global) {
        const globalClaudeMd = join(homedir(), '.claude', 'CLAUDE.md');
        if (existsSync(globalClaudeMd)) {
          let content = readFileSync(globalClaudeMd, 'utf-8');
          if (content.includes('<!-- CODEMAP-GLOBAL:START -->')) {
            content = content.replace(
              /\n?<!-- CODEMAP-GLOBAL:START -->[\s\S]*?<!-- CODEMAP-GLOBAL:END -->\n?/,
              ''
            );
            const trimmed = content.trim();
            if (trimmed === '' || trimmed === '# Global Claude Instructions') {
              // Don't delete global CLAUDE.md, just remove our section
              writeFileSync(globalClaudeMd, content);
            } else {
              writeFileSync(globalClaudeMd, content);
            }
            console.log(`${check} Removed global detection rule from ${dim}~/.claude/CLAUDE.md${reset}`);
          } else {
            console.log(`${skip} No global detection rule found`);
          }
        }
      } else {
        console.log(`${skip} Kept global rule in ${dim}~/.claude/CLAUDE.md${reset} (use --global to remove)`);
      }

      console.log(`
${cyan}───────────────────────────────────────────────────────────────${reset}
${brightGreen}${bold}Uninstall complete!${reset}

${dim}To reinstall later:${reset}
  ${cyan}npx @claudetools/codemap init${reset}
`);
    });

  return cmd;
}
