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

// Small delay for visual feedback
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

      const brightMagenta = '\x1b[95m';
      const bgMagenta = '\x1b[45m';
      const white = '\x1b[97m';

      // Calculate total steps
      const totalSteps = options.skillOnly ? 1 : (options.global ? 2 : 4);
      let currentStep = 0;

      const startStep = (label: string) => {
        currentStep++;
        process.stdout.write(`\n${cyan}[${currentStep}/${totalSteps}]${reset} ${label}...`);
      };

      const endStep = (detail?: string) => {
        process.stdout.write(` ${check}${detail ? ` ${dim}${detail}${reset}` : ''}\n`);
      };

      console.log(`
${cyan}┌──────────────────────────────────────────────────────────────┐${reset}
${cyan}│${reset}  ${brightMagenta}${bold}codemap${reset} ${dim}— Setting up Claude Code integration${reset}              ${cyan}│${reset}
${cyan}└──────────────────────────────────────────────────────────────┘${reset}`);

      const targetDir = options.global
        ? join(homedir(), '.claude')
        : join(projectRoot, '.claude');

      const skillDir = join(targetDir, 'skills', 'codemap');
      const skillTarget = join(skillDir, 'SKILL.md');

      // Step 1: Install skill
      startStep('Installing skill');
      await delay(150);
      mkdirSync(skillDir, { recursive: true });
      copyFileSync(skillSource, skillTarget);
      endStep(options.global ? '~/.claude/skills/codemap/' : '.claude/skills/codemap/');

      // Step 2: Global detection rule
      if (!options.skillOnly) {
        startStep('Configuring global rules');
        await delay(150);

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
              content = content.replace(
                /\n?<!-- CODEMAP-GLOBAL:START -->[\s\S]*?<!-- CODEMAP-GLOBAL:END -->\n?/,
                '\n' + globalSnippet
              );
              writeFileSync(globalClaudeMd, content);
            } else {
              writeFileSync(globalClaudeMd, content + '\n' + globalSnippet);
            }
          } else {
            writeFileSync(globalClaudeMd, `# Global Claude Instructions\n${globalSnippet}`);
          }
          endStep('~/.claude/CLAUDE.md');
        } catch {
          endStep('skipped');
        }
      }

      // Step 3: Project CLAUDE.md
      if (!options.skillOnly && !options.global) {
        startStep('Configuring project');
        await delay(150);

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
            content = content.replace(
              /\n?<!-- CODEMAP:START -->[\s\S]*?<!-- CODEMAP:END -->\n?/,
              '\n' + codemapSnippet
            );
            writeFileSync(claudeMdPath, content);
          } else {
            writeFileSync(claudeMdPath, content + '\n' + codemapSnippet);
          }
        } else {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(claudeMdPath, `# Project Instructions\n${codemapSnippet}`);
        }
        endStep('.claude/CLAUDE.md');

        // Update .gitignore (silently)
        const gitignorePath = join(projectRoot, '.gitignore');
        try {
          let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
          if (!content.includes('.codemap/')) {
            const addition = content.endsWith('\n') || content === '' ? '.codemap/\n' : '\n.codemap/\n';
            writeFileSync(gitignorePath, content + addition);
          }
        } catch {
          // Ignore
        }
      }

      // Step 4: Build index
      if (options.index !== false && !options.skillOnly && !options.global) {
        startStep('Building index');

        try {
          const result = await buildIndex(projectRoot, {
            force: options.force,
            onProgress: (progress) => {
              if (progress.phase === 'parsing' && progress.currentFile) {
                process.stdout.write(
                  `\r${cyan}[${currentStep}/${totalSteps}]${reset} Building index... ${gray}${progress.current}/${progress.total}${reset}`
                );
              }
            },
          });

          process.stdout.write(`\r${cyan}[${currentStep}/${totalSteps}]${reset} Building index... ${check} ${brightGreen}${result.filesIndexed}${reset} files, ${brightGreen}${result.symbolsExtracted}${reset} symbols ${dim}(${formatDuration(result.duration)})${reset}\n`);

          if (result.errors.length > 0) {
            console.log(`    ${brightYellow}⚠${reset}  ${result.errors.length} files had warnings`);
          }
        } catch (e) {
          const error = e as Error;
          process.stdout.write(` ${cross}\n`);
          console.error(`    Error: ${error.message}`);
        }
      }

      // Final summary
      console.log(`
${cyan}───────────────────────────────────────────────────────────────${reset}
${brightGreen}${bold}✓ Setup complete!${reset} ${options.global ? '' : `${dim}Commit .claude/ to share with your team.${reset}`}

${bgMagenta}${white}${bold} RECOMMENDED ${reset} ${brightMagenta}${bold}Keep the index updated with watch mode:${reset}

  ${brightMagenta}npx @claudetools/codemap index --watch${reset}

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
