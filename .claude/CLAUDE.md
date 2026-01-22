# Project Instructions

<!-- CODEMAP:START -->
## Codemap - MANDATORY

**IMPORTANT: This project has a codemap index. You MUST use codemap instead of Grep/Search tools.**

When you need to find code, symbols, or understand the codebase:
- **DO NOT** use Grep, Search, or find commands
- **ALWAYS** use codemap commands first:

```bash
npx @claudetools/codemap where <symbol>   # Find where something is defined
npx @claudetools/codemap refs <symbol>    # Find all usages/references
npx @claudetools/codemap deps <file>      # Show what a file imports
npx @claudetools/codemap exports <file>   # Show what a file exports
npx @claudetools/codemap tree             # Show project structure
npx @claudetools/codemap summary          # Project overview
```

Only use Grep/Search if codemap doesn't find what you need.

Run `npx @claudetools/codemap index` to rebuild after major changes.
<!-- CODEMAP:END -->
