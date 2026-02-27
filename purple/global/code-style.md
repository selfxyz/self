# Code Style

## Formatting (Prettier)

- Single quotes (double quotes in YAML)
- 2-space indentation, no tabs
- Trailing commas everywhere
- Semicolons always
- Arrow parens: avoid (omit when single param)
- Bracket spacing: yes
- Bracket same line: no (JSX closing bracket on new line)
- End of line: auto

## TypeScript

- Strict mode enabled
- Path aliases: `@/` maps to `./src/`, `@selfxyz/*` for workspace packages
- Use `type` keyword for type-only imports (enforced: `consistent-type-imports`)
- Use `type` keyword for type-only exports (enforced: `consistent-type-exports`)
- `no-explicit-any`: warn (avoid but don't block builds)
- `no-require-imports`: error (use ES imports)

## Import Order (Enforced via `simple-import-sort`)

```
1. Node.js built-ins        import fs from 'node:fs';
2. External packages         import { View } from 'react-native';
3. Workspace packages        import { utils } from '@selfxyz/common';
4. Internal alias imports    import { Button } from '@/components/Button';
5. Relative imports          import { helper } from './utils';
```

Blank line between each group. No duplicate imports.

## Export Rules

- Exports sorted alphabetically, types first (`sort-exports/sort-exports`)
- `export *` is **banned** — use selective named exports for tree shaking

## License Headers

Every source file requires the BUSL-1.1 license header:

```
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.
```

Enforced via `scripts/check-license-headers.mjs`, not ESLint. Run `yarn lint:headers:fix` to auto-add.

## Dead Code

- Knip configured at workspace root for dead code detection
- Remove unused exports, files, and dependencies proactively

## DOs

- DO use `type` imports/exports for types: `import type { Foo } from './types'`
- DO use selective named exports: `export { foo, bar } from './module'`
- DO follow the 5-group import order
- DO run `yarn lint` before committing
- DO add license headers to new files
- DO use `@/` alias for imports within the app package

## DON'Ts

- DON'T use `export *` — it kills tree shaking
- DON'T use `require()` in TypeScript source (only allowed in tests and CJS configs)
- DON'T use `require('react')` or `require('react-native')` in tests (causes OOM in CI)
- DON'T use tabs or inconsistent formatting — Prettier handles this
- DON'T disable ESLint rules without justification in a comment
- DON'T use relative paths to import from other workspace packages — use `@selfxyz/*`
