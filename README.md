# codemap

Codebase intelligence CLI for AI assistants. Creates a searchable index of your codebase's structure, symbols, and relationships.

## Why codemap?

AI coding assistants waste thousands of context tokens reading multiple files just to locate code. codemap provides instant answers from a pre-built index:

**Without codemap:**
```
Read package.json (500 tokens)
Read src/ listing (200 tokens)
Read src/index.ts (800 tokens) - not here
Read src/routes/ listing (150 tokens)
Read src/routes/auth.ts (600 tokens) - found it!
Total: ~2,250 tokens just to locate code
```

**With codemap:**
```bash
codemap where authenticate
# Output: src/lib/auth.ts:15-42 [function] (exported)
# Total: ~50 tokens
```

## Installation

```bash
# Add to your project
pnpm add -D @claudetools/codemap

# Set up Claude Code integration + build index
npx codemap init
```

Or run without installing:
```bash
npx @claudetools/codemap init
```

## Quick Start

```bash
# Find where a symbol is defined
npx codemap where UserService

# Find all references to a symbol
npx codemap refs authenticate

# Show what a file imports
npx codemap deps src/routes/auth.ts

# Show what a file exports
npx codemap exports src/lib/auth.ts

# Show project structure
npx codemap tree

# Get project overview
npx codemap summary

# Check index status
npx codemap status

# Rebuild index after major changes
npx codemap index
```

## Commands

### `codemap index`

Build or update the codebase index.

```bash
codemap index          # Incremental update
codemap index --force  # Full rebuild
codemap index --watch  # Watch for changes and auto-update
```

Output:
```
Indexing project...
  Scanned: 142 files
  Symbols: 847
  Imports: 523
  Time: 1.2s

Index saved to .codemap/index.db
```

Watch mode monitors your project for file changes and automatically updates the index when source files are modified. It uses debouncing to batch rapid changes and ignores non-source directories like `node_modules`, `.git`, `dist`, etc.

### `codemap where <symbol>`

Find where a symbol is defined.

```bash
codemap where authenticate
```

Output:
```
Found 2 definitions of "authenticate":

1. src/lib/auth.ts:15-42 [function] (exported)
   async function authenticate(req: Request): Promise<User>

2. src/middleware/auth.ts:8-12 [function] (exported)
   function authenticate(options: AuthOptions): Middleware
```

Supports fuzzy matching - if you misspell a symbol, it suggests alternatives.

### `codemap refs <symbol>`

Find all references to a symbol.

```bash
codemap refs UserService
codemap refs UserService --verbose  # Show all matches
codemap refs UserService --max 100  # Increase result limit
```

Output:
```
References to "UserService" (12 found):

src/routes/user.ts
  :5   import { UserService } from '../services/user'
  :12  const service = new UserService()

src/routes/admin.ts
  :8   import { UserService } from '../services/user'
```

### `codemap deps <file>`

Show what a file depends on.

```bash
codemap deps src/routes/auth.ts
```

Output:
```
Dependencies of src/routes/auth.ts:

Internal (3):
  ../lib/auth.ts
    → authenticate, validateToken
  ../lib/db.ts
    → getUser
  ./types.ts
    → AuthRequest

External (2):
  express
    → Request, Response
  jsonwebtoken
    → verify
```

### `codemap exports <file>`

Show what a file exports.

```bash
codemap exports src/lib/auth.ts
```

Output:
```
Exports from src/lib/auth.ts:

Functions (3):
  authenticate     :15  async function authenticate(req: Request): Promise<User>
  validateToken    :44  function validateToken(token: string): TokenPayload
  refreshToken     :62  async function refreshToken(token: string): Promise<string>

Types (2):
  AuthOptions      :5   interface AuthOptions { ... }
  TokenPayload     :10  type TokenPayload = { ... }

Default: none
```

### `codemap tree [path]`

Show annotated file tree.

```bash
codemap tree           # Full project
codemap tree src/lib   # Specific directory
codemap tree --depth 3 # Limit depth
```

Output:
```
src/
├── index.ts                 [entry] exports: app
├── config/
│   ├── index.ts             [barrel] re-exports: database, auth
│   └── database.ts          [config] exports: dbConfig
├── lib/
│   ├── auth.ts              [module] exports: authenticate, validateToken
│   └── db.ts                [module] exports: query, getUser
└── routes/
    ├── index.ts             [barrel] re-exports: authRouter, userRouter
    └── auth.ts              [router] exports: authRouter
```

### `codemap summary`

Show project overview.

```bash
codemap summary
```

Output:
```
Project: my-api
Root: /Users/dev/projects/my-api

Stats:
  Files: 142 (118 TypeScript, 24 JavaScript)
  Symbols: 847 (312 functions, 89 classes, 446 types)
  Lines: 12,847

Entry Points:
  src/index.ts

Key Directories:
  src/ - 142 files
  lib/ - 12 files

External Dependencies: 23 packages
  express, typescript, zod, jsonwebtoken, prisma...

Last indexed: 2 minutes ago (1.2 MB)
```

### `codemap status`

Show index status.

```bash
codemap status
```

Output:
```
Index Status:
  Location: .codemap/index.db
  Size: 1.2 MB
  Last updated: 2 minutes ago

Coverage:
  Indexed: 142 files
  Stale: 3 files (modified since last index)
  New: 1 file (not yet indexed)

Stale files:
  src/routes/user.ts (indexed 5 mins ago)
  src/lib/auth.ts (indexed 12 mins ago)

Run "codemap index" to update.
```

## Options

All commands support:
- `--json` - Output as JSON for programmatic use
- `--verbose` or `-v` - Show additional details

## Configuration

Create `codemap.config.json` in your project root:

```json
{
  "include": [
    "src/**/*.ts",
    "lib/**/*.js"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "__mocks__/**"
  ]
}
```

Default patterns:
- **Include:** `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`, `**/*.mjs`, `**/*.cjs`
- **Exclude:** `node_modules`, `dist`, `build`, `.git`, `**/*.d.ts`, `**/*.test.*`, `**/*.spec.*`, `__tests__`, `coverage`

The `.gitignore` file is always respected.

## How It Works

codemap uses:
- **Tree-sitter** for fast, accurate AST parsing
- **SQLite** for efficient index storage
- **ripgrep** for fast text search (falls back to Node.js if not installed)

The index is stored in `.codemap/index.db`. Add `.codemap/` to your `.gitignore`.

## Claude Code Integration

codemap installs a Claude Code skill automatically. After installation, Claude Code will use codemap for code navigation queries.

Manual installation:
```bash
mkdir -p ~/.claude/skills/codemap
cp node_modules/@claudetools/codemap/skills/SKILL.md ~/.claude/skills/codemap/
```

## Requirements

- Node.js 18+
- Optional: ripgrep (`rg`) for faster reference search

## License

MIT
