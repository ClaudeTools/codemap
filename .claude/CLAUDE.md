# Project Instructions

<!-- CODEMAP:START -->
## Codemap

This project uses codemap for codebase intelligence. Use these commands BEFORE grep/find:

```bash
npx @claudetools/codemap where <symbol>   # Find definitions
npx @claudetools/codemap refs <symbol>    # Find usages
npx @claudetools/codemap deps <file>      # Show imports
npx @claudetools/codemap exports <file>   # Show exports
npx @claudetools/codemap tree             # Project structure
npx @claudetools/codemap summary          # Project overview
```

Run `npx @claudetools/codemap index` to rebuild after major changes.
<!-- CODEMAP:END -->
