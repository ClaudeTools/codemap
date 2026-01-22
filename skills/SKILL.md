---
name: codemap
description: >
  Fast codebase navigation and code intelligence. Use BEFORE grep, find, or
  reading files when you need to: find where functions/classes/types are defined,
  understand what a file exports or imports, trace dependencies, get project
  overview, or answer "where is X" questions. Provides instant answers from
  pre-built index instead of reading multiple files.
trigger: auto
allowed-tools: Bash(codemap:*)
---

# codemap - Codebase Intelligence

## When to Use

Use codemap **FIRST** when the user asks:
- "Where is [X] defined?"
- "What uses [X]?"
- "What does [file] export/import?"
- "Show me the project structure"
- "How is the codebase organised?"
- "Find the [authentication/database/routing] code"
- "What calls this function?"
- "What are the dependencies of this file?"

## Why Use codemap

**Without codemap** (wasteful):
```
Read package.json (500 tokens)
Read src/ listing (200 tokens)
Read src/index.ts (800 tokens) - not here
Read src/routes/ listing (150 tokens)
Read src/routes/auth.ts (600 tokens) - found it!
Total: ~2,250 tokens
```

**With codemap** (efficient):
```bash
codemap where authenticate
# Output: src/lib/auth.ts:15-42 [function] (exported)
# Total: ~50 tokens
```

## Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `codemap where <symbol>` | Find where something is defined | `codemap where UserService` |
| `codemap refs <symbol>` | Find all usages | `codemap refs authenticate` |
| `codemap deps <file>` | Show what a file imports | `codemap deps src/routes/auth.ts` |
| `codemap exports <file>` | Show what a file exports | `codemap exports src/lib/auth.ts` |
| `codemap tree [path]` | Annotated file tree | `codemap tree src/` |
| `codemap summary` | Project overview | `codemap summary` |
| `codemap status` | Check index freshness | `codemap status` |
| `codemap index` | Rebuild index | `codemap index --force` |

## Workflow

1. **Check if index exists** (if starting fresh):
   ```bash
   codemap status
   ```
   If missing or stale, run `codemap index`.

2. **Find definitions with `where`** (not grep):
   ```bash
   codemap where UserService
   # Returns: src/services/user.ts:12-45 [class] (exported)
   ```

3. **Find usages with `refs`**:
   ```bash
   codemap refs UserService
   # Returns all files that import/use UserService
   ```

4. **Understand a file before reading it**:
   ```bash
   codemap deps src/routes/user.ts
   codemap exports src/routes/user.ts
   ```

5. **Only read files AFTER** codemap identifies which are relevant.

## Example Sessions

### Finding Authentication Logic

User: "Where is the authentication logic?"

```bash
# Find the symbol
codemap where authenticate
# Output: src/lib/auth.ts:15-42 [function] (exported)

# See what it exports
codemap exports src/lib/auth.ts
# Output: authenticate, validateToken, refreshToken

# See what uses it
codemap refs authenticate
# Output: src/routes/user.ts:5, src/middleware/auth.ts:8

# Now read only the relevant file
cat src/lib/auth.ts
```

### Understanding Project Structure

User: "How is this codebase organised?"

```bash
# Get overview
codemap summary
# Shows: file counts, entry points, key directories

# See structure
codemap tree src/
# Shows annotated tree with exports per file
```

### Tracing Dependencies

User: "What does the user router depend on?"

```bash
codemap deps src/routes/user.ts
# Internal: ../services/user.ts → UserService, createUser
# External: express → Router, Request
```

## Flags

- `--json` - Machine-readable output for parsing
- `--verbose` or `-v` - Show additional details
- `--max <n>` - Limit results (for `refs` command)

## Keeping Index Updated

```bash
# Incremental update (fast)
codemap index

# Full rebuild
codemap index --force

# Watch mode (auto-update on file changes)
codemap index --watch
```

## Notes

- Index stored in `.codemap/index.db` (add to .gitignore)
- Supports TypeScript, JavaScript, TSX, JSX
- Uses tree-sitter for accurate parsing
- Uses ripgrep for fast reference search (falls back to Node.js)
- Fuzzy matching suggests alternatives for typos
