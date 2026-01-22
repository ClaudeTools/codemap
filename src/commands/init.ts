/**
 * 'init' command - Set up Claude Code integration
 */

import { Command } from 'commander';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { findProjectRoot } from '../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createInitCommand(): Command {
  const cmd = new Command('init')
    .description('Set up Claude Code integration for this project')
    .option('--global', 'Install skill globally to ~/.claude/ instead of project')
    .option('--skill-only', 'Only install the skill file, skip CLAUDE.md')
    .option('--force', 'Overwrite existing files')
    .action(async (options) => {
      const skillSource = join(__dirname, '..', '..', 'skills', 'SKILL.md');

      if (!existsSync(skillSource)) {
        console.error('Error: Skill file not found. Try reinstalling codemap.');
        process.exit(1);
      }

      const targetDir = options.global
        ? join(homedir(), '.claude')
        : join(findProjectRoot(), '.claude');

      const skillDir = join(targetDir, 'skills', 'codemap');
      const skillTarget = join(skillDir, 'SKILL.md');

      // Install skill
      if (existsSync(skillTarget) && !options.force) {
        console.log('Skill already installed. Use --force to overwrite.');
      } else {
        mkdirSync(skillDir, { recursive: true });
        copyFileSync(skillSource, skillTarget);
        console.log(`Installed: ${options.global ? '~/.claude' : '.claude'}/skills/codemap/SKILL.md`);
      }

      // Update CLAUDE.md (unless --skill-only or --global)
      if (!options.skillOnly && !options.global) {
        const claudeMdPath = join(targetDir, 'CLAUDE.md');
        const codemapSnippet = `
<!-- CODEMAP:START -->
## Codemap

This project uses codemap for codebase intelligence. Use these commands BEFORE grep/find:

\`\`\`bash
codemap where <symbol>   # Find definitions
codemap refs <symbol>    # Find usages
codemap deps <file>      # Show imports
codemap exports <file>   # Show exports
codemap tree             # Project structure
codemap summary          # Project overview
\`\`\`

Run \`codemap index\` to build/rebuild the index.
<!-- CODEMAP:END -->
`;

        if (existsSync(claudeMdPath)) {
          const content = readFileSync(claudeMdPath, 'utf-8');
          if (content.includes('<!-- CODEMAP:START -->')) {
            if (options.force) {
              // Replace existing codemap section
              const updated = content.replace(
                /<!-- CODEMAP:START -->[\s\S]*?<!-- CODEMAP:END -->/,
                codemapSnippet.trim()
              );
              writeFileSync(claudeMdPath, updated);
              console.log('Updated: .claude/CLAUDE.md (replaced codemap section)');
            } else {
              console.log('CLAUDE.md already has codemap section. Use --force to replace.');
            }
          } else {
            writeFileSync(claudeMdPath, content + '\n' + codemapSnippet);
            console.log('Updated: .claude/CLAUDE.md (added codemap section)');
          }
        } else {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(claudeMdPath, `# Project Instructions\n${codemapSnippet}`);
          console.log('Created: .claude/CLAUDE.md');
        }

        // Update .gitignore
        const projectRoot = findProjectRoot();
        const gitignorePath = join(projectRoot, '.gitignore');
        try {
          let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
          if (!content.includes('.codemap/')) {
            const addition = content.endsWith('\n') || content === '' ? '.codemap/\n' : '\n.codemap/\n';
            writeFileSync(gitignorePath, content + addition);
            console.log('Updated: .gitignore (added .codemap/)');
          }
        } catch {
          // Ignore
        }
      }

      console.log(`
Next steps:
  1. codemap index          # Build the index
  2. codemap where <symbol> # Find definitions
  ${options.global ? '' : '3. git add .claude/       # Commit for your team\n'}
For help: codemap --help
`);
    });

  return cmd;
}
