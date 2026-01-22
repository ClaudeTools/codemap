---
name: codemap
description: >
  MANDATORY: Use codemap instead of Grep/Search for finding code.
  This project has a pre-built index. Use codemap commands to find symbols,
  trace dependencies, and understand code structure. Only fall back to
  Grep if codemap doesn't find what you need.
trigger: auto
allowed-tools: Bash(npx @claudetools/codemap*)
---

# codemap - USE INSTEAD OF GREP

## IMPORTANT

**This project has a codemap index. You MUST use codemap instead of Grep/Search tools.**

When asked to find code, locate symbols, or understand the codebase:
1. **DO NOT** use Grep, Search, rg, or find
2. **ALWAYS** use codemap commands first
3. Only use Grep/Search if codemap doesn't find what you need

## Commands

| Instead of... | Use this |
|---------------|----------|
| `Grep("UserService")` | `npx @claudetools/codemap where UserService` |
| `Grep("authenticate")` | `npx @claudetools/codemap refs authenticate` |
| `Search(pattern: "*.tsx")` | `npx @claudetools/codemap tree src/` |
| Reading files to find imports | `npx @claudetools/codemap deps <file>` |

## Quick Reference

```bash
# Find where something is defined
npx @claudetools/codemap where <symbol>

# Find all usages/references
npx @claudetools/codemap refs <symbol>

# Show what a file imports
npx @claudetools/codemap deps <file>

# Show what a file exports
npx @claudetools/codemap exports <file>

# Show project structure
npx @claudetools/codemap tree [path]

# Project overview
npx @claudetools/codemap summary

# Check if index needs rebuilding
npx @claudetools/codemap status
```

## Example Session

User: "Where is the authentication logic?"

**WRONG:**
```
Grep("authenticate", path: "src")
Read multiple files...
```

**CORRECT:**
```bash
npx @claudetools/codemap where authenticate
# Returns: src/lib/auth.ts:15-42 [function] (exported)

npx @claudetools/codemap refs authenticate
# Returns all files that use it
```

## When Codemap Doesn't Help

Only use Grep/Search when:
- Searching for literal strings/comments (not symbols)
- Searching for patterns codemap doesn't index
- The index is stale (run `npx @claudetools/codemap status` to check)

## Keeping Index Updated

```bash
# Rebuild after major changes
npx @claudetools/codemap index

# Check if index is current
npx @claudetools/codemap status
```
