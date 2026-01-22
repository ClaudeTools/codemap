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

Use codemap FIRST when the user asks:
- "Where is [X] defined?"
- "What uses [X]?"
- "What does [file] export/import?"
- "Show me the project structure"
- "How is the codebase organised?"
- "Find the [authentication/database/routing] code"

## Commands

### Find Definitions
```bash
codemap where <symbol>
```
Returns file path, line numbers, and signature for all definitions of a symbol.

### Find References
```bash
codemap refs <symbol>
```
Returns all files and lines that reference/use a symbol.

### Show Dependencies
```bash
codemap deps <file>
```
Returns what a file imports (both internal modules and external packages).

### Show Exports
```bash
codemap exports <file>
```
Returns what a file exports (functions, classes, types).

### Project Structure
```bash
codemap tree [path]
```
Returns annotated file tree showing what each file/folder contains.

### Project Overview
```bash
codemap summary
```
Returns high-level project statistics and architecture overview.

### Check Index Status
```bash
codemap status
```
Returns whether index is up-to-date; lists stale files.

## Workflow

1. **Always check status first** if unsure whether index exists:
   ```bash
   codemap status
   ```
   If index is missing or stale, run `codemap index`.

2. **Use `where` for definitions**, not grep:
   ```bash
   codemap where authenticate
   ```

3. **Use `refs` for usages**:
   ```bash
   codemap refs UserService
   ```

4. **Use `deps` to understand a file before reading it**:
   ```bash
   codemap deps src/routes/auth.ts
   ```

5. **Only read files AFTER using codemap** to identify which files are relevant.

## Example Session

User: "Where is the authentication logic?"

```bash
# First, find relevant symbols
codemap where authenticate

# Output shows: src/lib/auth.ts:15-42

# Check what it exports
codemap exports src/lib/auth.ts

# Check what uses it
codemap refs authenticate

# Now read only the relevant file
cat src/lib/auth.ts
```

## Notes

- Index must be built first: `codemap index`
- Re-run `codemap index` after significant code changes
- Use `--json` flag for structured output if parsing results
- All commands support `--verbose` for additional details
