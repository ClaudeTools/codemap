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
import { formatDuration, pluralize } from '../utils/output.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        console.error('Error: Skill file not found. Try reinstalling codemap.');
        process.exit(1);
      }

      console.log('\nSetting up codemap...\n');

      const targetDir = options.global
        ? join(homedir(), '.claude')
        : join(projectRoot, '.claude');

      const skillDir = join(targetDir, 'skills', 'codemap');
      const skillTarget = join(skillDir, 'SKILL.md');

      // Install skill
      if (existsSync(skillTarget) && !options.force) {
        console.log('✓ Skill already installed');
      } else {
        mkdirSync(skillDir, { recursive: true });
        copyFileSync(skillSource, skillTarget);
        console.log(`✓ Installed: ${options.global ? '~/.claude' : '.claude'}/skills/codemap/SKILL.md`);
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

Run \`codemap index\` to rebuild after major changes.
<!-- CODEMAP:END -->
`;

        if (existsSync(claudeMdPath)) {
          const content = readFileSync(claudeMdPath, 'utf-8');
          if (content.includes('<!-- CODEMAP:START -->')) {
            if (options.force) {
              const updated = content.replace(
                /<!-- CODEMAP:START -->[\s\S]*?<!-- CODEMAP:END -->/,
                codemapSnippet.trim()
              );
              writeFileSync(claudeMdPath, updated);
              console.log('✓ Updated: .claude/CLAUDE.md');
            } else {
              console.log('✓ CLAUDE.md already configured');
            }
          } else {
            writeFileSync(claudeMdPath, content + '\n' + codemapSnippet);
            console.log('✓ Updated: .claude/CLAUDE.md');
          }
        } else {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(claudeMdPath, `# Project Instructions\n${codemapSnippet}`);
          console.log('✓ Created: .claude/CLAUDE.md');
        }

        // Update .gitignore
        const gitignorePath = join(projectRoot, '.gitignore');
        try {
          let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
          if (!content.includes('.codemap/')) {
            const addition = content.endsWith('\n') || content === '' ? '.codemap/\n' : '\n.codemap/\n';
            writeFileSync(gitignorePath, content + addition);
            console.log('✓ Updated: .gitignore');
          }
        } catch {
          // Ignore
        }
      }

      // Build index (unless --no-index or --skill-only or --global)
      if (options.index !== false && !options.skillOnly && !options.global) {
        console.log('\nBuilding index...');

        try {
          const result = await buildIndex(projectRoot, {
            force: options.force,
            onProgress: (progress) => {
              if (progress.phase === 'parsing' && progress.currentFile) {
                process.stdout.write(
                  `\r  Processing: ${progress.current}/${progress.total} files`
                );
              }
            },
          });

          process.stdout.write('\r' + ' '.repeat(50) + '\r');
          console.log(`✓ Indexed: ${pluralize(result.filesIndexed, 'file')}, ${result.symbolsExtracted} symbols (${formatDuration(result.duration)})`);

          if (result.errors.length > 0) {
            console.log(`  Warnings: ${result.errors.length} files had issues`);
          }
        } catch (e) {
          const error = e as Error;
          console.error(`✗ Index failed: ${error.message}`);
        }
      }

      console.log(`
Setup complete! ${options.global ? '' : 'Commit .claude/ to share with your team.'}

Usage:
  npx codemap where <symbol>   # Find where something is defined
  npx codemap refs <symbol>    # Find all usages
  npx codemap deps <file>      # Show file dependencies
  npx codemap --help           # See all commands
`);
    });

  return cmd;
}
