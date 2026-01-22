# Project Instructions

<!-- CODEMAP:START -->
## Codemap

This project uses codemap for codebase intelligence. Use these commands BEFORE grep/find:

```bash
codemap where <symbol>   # Find definitions
codemap refs <symbol>    # Find usages
codemap deps <file>      # Show imports
codemap exports <file>   # Show exports
codemap tree             # Project structure
codemap summary          # Project overview
```

Run `codemap index` to rebuild after major changes.
<!-- CODEMAP:END -->
