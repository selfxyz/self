# Tech Debt Baseline Snapshot

Generated from `package.json` workspaces. This file is intended as an immutable baseline for cleanup PRs.

## Top 10 largest workspaces by source-file count

- `contracts` (748 source files, 54 deps)
- `app` (401 source files, 152 deps)
- `circuits` (294 source files, 51 deps)
- `packages/mobile-sdk-alpha` (145 source files, 49 deps)
- `common` (119 source files, 47 deps)
- `packages/mobile-sdk-demo` (66 source files, 56 deps)
- `sdk/core` (52 source files, 26 deps)
- `sdk/qrcode-angular` (14 source files, 37 deps)
- `sdk/qrcode` (13 source files, 40 deps)
- `scripts/tests` (2 source files, 0 deps)

## Workspaces with no `test` script

- None

## Workspaces with unusually large dependency sets

- Threshold: >= 85 total dependencies (mean + 1σ, minimum 50).
- `app`: 152 total (90 deps, 62 devDeps, 0 peerDeps)

