/**
 * Postinstall script - print setup instructions
 */

console.log(`
┌───────────────────────────────────────────────────────────┐
│  codemap installed!                                       │
│                                                           │
│  Run this to set up Claude Code integration:              │
│                                                           │
│    npx codemap init                                       │
│                                                           │
│  This will:                                               │
│    • Install skill to .claude/ (commit to git)            │
│    • Add instructions to .claude/CLAUDE.md                │
│    • Build the codebase index                             │
│                                                           │
│  Options:                                                 │
│    --global      Install to ~/.claude/ instead            │
│    --no-index    Skip building the index                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
`);
