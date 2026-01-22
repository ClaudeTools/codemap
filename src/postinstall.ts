/**
 * Postinstall script - print setup instructions
 */

console.log(`
┌─────────────────────────────────────────────────────────────┐
│  codemap installed successfully!                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  To set up Claude Code integration, run:                    │
│                                                             │
│    codemap init                                             │
│                                                             │
│  This will install the skill to .claude/ (commit to git)    │
│                                                             │
│  Options:                                                   │
│    codemap init --global     Install to ~/.claude/ instead  │
│    codemap init --skill-only Skip CLAUDE.md updates         │
│                                                             │
│  Then build your index:                                     │
│                                                             │
│    codemap index                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`);
