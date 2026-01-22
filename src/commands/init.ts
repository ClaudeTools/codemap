/**
 * 'init' command - Set up Claude Code integration and build index
 */

import { Command } from 'commander';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { findProjectRoot } from '../utils/paths.js';
import { buildIndex } from '../indexer/indexer.js';
import { formatDuration } from '../utils/output.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Force colors
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const brightGreen = '\x1b[92m';
const brightCyan = '\x1b[96m';
const brightYellow = '\x1b[93m';
const gray = '\x1b[90m';
const red = '\x1b[91m';

const check = `${brightGreen}✓${reset}`;
const cross = `${red}✗${reset}`;

export function createInitCommand(): Command {
  const cmd = new Command('init')
    .description('Set up codemap for this project (skill, CLAUDE.md, and index)')
    .option('--global', 'Install skill globally to ~/.claude/ instead of project')
    .option('--skill-only', 'Only install the skill file, skip CLAUDE.md and index')
    .option('--no-index', 'Skip building the index')
    .option('--force', 'Overwrite existing files and rebuild index')
    .action(async (options) => {
      const skillSource = join(__dirname, '..', '..', 'skills', 'SKILL.md');
      const projectRoot = findProjectRoot();

      if (!existsSync(skillSource)) {
        console.error(`${cross} Skill file not found. Try reinstalling codemap.`);
        process.exit(1);
      }

      console.log(`
${cyan}┌──────────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightGreen}${bold}codemap${reset} ${dim}— Setting up Claude Code integration${reset}              ${cyan}│${reset}
${cyan}└──────────────────────────────────────────────────────────────┘${reset}
`);

      const targetDir = options.global
        ? join(homedir(), '.claude')
        : join(projectRoot, '.claude');

      const skillDir = join(targetDir, 'skills', 'codemap');
      const skillTarget = join(skillDir, 'SKILL.md');

      // Install/update skill (always overwrite with latest)
      mkdirSync(skillDir, { recursive: true });
      copyFileSync(skillSource, skillTarget);
      console.log(`${check} Installed ${dim}${options.global ? '~/.claude' : '.claude'}/skills/codemap/SKILL.md${reset}`);

      // Always add global detection rule to ~/.claude/CLAUDE.md
      const globalClaudeMd = join(homedir(), '.claude', 'CLAUDE.md');
      const globalSnippet = `
<!-- CODEMAP-GLOBAL:START -->
## Codemap Detection (Global Rule)

**BEFORE using Grep, Search, Glob, or find commands**, check if the project has a \`.codemap/\` directory.
If it does, you MUST use codemap instead:

\`\`\`bash
# Check first: ls .codemap/  (if exists, use codemap below)
npx @claudetools/codemap where <symbol>   # Instead of Grep
npx @claudetools/codemap refs <symbol>    # Find all usages
npx @claudetools/codemap deps <file>      # Show imports
\`\`\`

This applies to ALL agents and subagents. NEVER use Grep/Search in codemap-enabled projects.
<!-- CODEMAP-GLOBAL:END -->
`;

      try {
        mkdirSync(join(homedir(), '.claude'), { recursive: true });
        if (existsSync(globalClaudeMd)) {
          let content = readFileSync(globalClaudeMd, 'utf-8');
          if (content.includes('<!-- CODEMAP-GLOBAL:START -->')) {
            // Replace existing content with latest
            content = content.replace(
              /\n?<!-- CODEMAP-GLOBAL:START -->[\s\S]*?<!-- CODEMAP-GLOBAL:END -->\n?/,
              '\n' + globalSnippet
            );
            writeFileSync(globalClaudeMd, content);
            console.log(`${check} Updated global detection rule in ${dim}~/.claude/CLAUDE.md${reset}`);
          } else {
            writeFileSync(globalClaudeMd, content + '\n' + globalSnippet);
            console.log(`${check} Added global detection rule to ${dim}~/.claude/CLAUDE.md${reset}`);
          }
        } else {
          writeFileSync(globalClaudeMd, `# Global Claude Instructions\n${globalSnippet}`);
          console.log(`${check} Created ${dim}~/.claude/CLAUDE.md${reset} with codemap rule`);
        }
      } catch {
        // Ignore errors with global file
      }

      // Update CLAUDE.md (unless --skill-only or --global)
      if (!options.skillOnly && !options.global) {
        const claudeMdPath = join(targetDir, 'CLAUDE.md');
        const codemapSnippet = `
<!-- CODEMAP:START -->
## Codemap - MANDATORY

**IMPORTANT: This project has a codemap index. You MUST use codemap instead of Grep/Search tools.**

When you need to find code, symbols, or understand the codebase:
- **DO NOT** use Grep, Search, or find commands
- **ALWAYS** use codemap commands first:

\`\`\`bash
npx @claudetools/codemap where <symbol>   # Find where something is defined
npx @claudetools/codemap refs <symbol>    # Find all usages/references
npx @claudetools/codemap deps <file>      # Show what a file imports
npx @claudetools/codemap exports <file>   # Show what a file exports
npx @claudetools/codemap tree             # Show project structure
npx @claudetools/codemap summary          # Project overview
\`\`\`

Only use Grep/Search if codemap doesn't find what you need.

Run \`npx @claudetools/codemap index\` to rebuild after major changes.
<!-- CODEMAP:END -->
`;

        if (existsSync(claudeMdPath)) {
          let content = readFileSync(claudeMdPath, 'utf-8');
          if (content.includes('<!-- CODEMAP:START -->')) {
            // Always replace with latest content
            content = content.replace(
              /\n?<!-- CODEMAP:START -->[\s\S]*?<!-- CODEMAP:END -->\n?/,
              '\n' + codemapSnippet
            );
            writeFileSync(claudeMdPath, content);
            console.log(`${check} Updated ${dim}.claude/CLAUDE.md${reset}`);
          } else {
            writeFileSync(claudeMdPath, content + '\n' + codemapSnippet);
            console.log(`${check} Added codemap to ${dim}.claude/CLAUDE.md${reset}`);
          }
        } else {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(claudeMdPath, `# Project Instructions\n${codemapSnippet}`);
          console.log(`${check} Created ${dim}.claude/CLAUDE.md${reset}`);
        }

        // Update .gitignore
        const gitignorePath = join(projectRoot, '.gitignore');
        try {
          let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
          if (!content.includes('.codemap/')) {
            const addition = content.endsWith('\n') || content === '' ? '.codemap/\n' : '\n.codemap/\n';
            writeFileSync(gitignorePath, content + addition);
            console.log(`${check} Updated ${dim}.gitignore${reset}`);
          }
        } catch {
          // Ignore
        }
      }

      // Build index (unless --no-index or --skill-only or --global)
      if (options.index !== false && !options.skillOnly && !options.global) {
        console.log(`\n${brightCyan}Building index...${reset}`);

        try {
          const result = await buildIndex(projectRoot, {
            force: options.force,
            onProgress: (progress) => {
              if (progress.phase === 'parsing' && progress.currentFile) {
                process.stdout.write(
                  `\r  ${gray}Processing: ${progress.current}/${progress.total} files${reset}`
                );
              }
            },
          });

          process.stdout.write('\r' + ' '.repeat(50) + '\r');
          console.log(`${check} Indexed ${brightGreen}${result.filesIndexed}${reset} files, ${brightGreen}${result.symbolsExtracted}${reset} symbols ${dim}(${formatDuration(result.duration)})${reset}`);

          if (result.errors.length > 0) {
            console.log(`  ${brightYellow}⚠${reset} ${result.errors.length} files had warnings`);
          }
        } catch (e) {
          const error = e as Error;
          console.error(`${cross} Index failed: ${error.message}`);
        }
      }

      const brightMagenta = '\x1b[95m';
      const bgMagenta = '\x1b[45m';
      const white = '\x1b[97m';

      console.log(`
${cyan}───────────────────────────────────────────────────────────────${reset}
${brightGreen}${bold}Setup complete!${reset} ${options.global ? '' : `${dim}Commit .claude/ to share with your team.${reset}`}

${bgMagenta}${white}${bold} RECOMMENDED ${reset} ${brightMagenta}${bold}Keep the index updated with watch mode:${reset}

  ${brightMagenta}npx @claudetools/codemap index --watch${reset}

  ${dim}This runs in the background and auto-updates when files change.${reset}
  ${dim}Run it in a separate terminal while developing.${reset}

${cyan}───────────────────────────────────────────────────────────────${reset}

${bold}Commands:${reset}
  ${brightCyan}npx @claudetools/codemap where${reset} ${dim}<symbol>${reset}   ${gray}# Find definitions${reset}
  ${brightCyan}npx @claudetools/codemap refs${reset} ${dim}<symbol>${reset}    ${gray}# Find all usages${reset}
  ${brightCyan}npx @claudetools/codemap deps${reset} ${dim}<file>${reset}      ${gray}# Show dependencies${reset}
  ${brightCyan}npx @claudetools/codemap --help${reset}            ${gray}# All commands${reset}
`);
    });

  return cmd;
}
