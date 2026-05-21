# Tech Debt Baseline Snapshot

Generated from `package.json` workspaces. This file is intended as an immutable baseline for cleanup PRs.

## Top 10 largest workspaces by source-file count

- `app` (455 source files, 142 deps)
- `circuits` (296 source files, 51 deps)
- `contracts` (244 source files, 55 deps)
- `packages/mobile-sdk-alpha` (199 source files, 57 deps)
- `common` (119 source files, 47 deps)
- `new-common` (111 source files, 24 deps)
- `packages/webview-app` (95 source files, 38 deps)
- `packages/kmp-sdk` (85 source files, 0 deps)
- `packages/mobile-sdk-demo` (66 source files, 56 deps)
- `packages/kmp-sdk-test-app` (40 source files, 0 deps)

## Workspaces with no `test` script

- `packages/sdk-test-app`

## Workspaces with unusually large dependency sets

- Threshold: >= 66 total dependencies (mean + 1σ, minimum 50).
- `app`: 142 total (91 deps, 51 devDeps, 0 peerDeps)

