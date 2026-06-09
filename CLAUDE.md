# Claude Code Instructions

## Repository Overview

pnpm monorepo for Self - identity verification using passport NFC and zero-knowledge proofs.

- `app/` (`@selfxyz/mobile-app`) - React Native Self Wallet, production mobile app.
- `packages/` - SDK surfaces: WebView engine and native shells.

## Quick Setup

```bash
nvm use && corepack enable && pnpm install
```

## Key Rules

- **Package manager:** pnpm only (never npm or yarn). The version is pinned via `packageManager` in the root `package.json`; workspaces use `pnpm-workspace.yaml` with `nodeLinker: hoisted`.
- **Respect nested instructions.** Read the nearest `AGENTS.md` before working under `app/`, `packages/mobile-sdk-alpha/`, `packages/webview-app/`, or `noir/`.
- **DRY first.** Search for existing utilities/components/flows and reuse or refactor before adding new code.
- **Extract repeated UI.** Same sub-structure in 2+ places becomes a shared component; broad primitives belong in a shared library such as `@selfxyz/euclid`.
- **Keep files small.** Aim below 800 LOC; split as files approach it.
- **Move static data out of UI.** Large maps/lookups/constants belong in `utils/` or `data`, not screens/components.
- **Design tokens over hex.** Prefer shared color/font/spacing tokens.
- **No slop comments.** Comment only for non-obvious intent, temporary workarounds, `TODO:`/`FIXME:`, or invariants a future reader would otherwise break. Default to zero new comments in PRs.
- **Signal over praise.** Docs, reviews, specs, and PRs carry issues, risks, decisions, owners, next steps, and validation evidence.
- **Test behavior**, not mock wiring.
- **PR size:** 1k-3k LOC; larger PRs need a brief justification. One chunk equals one PR.
- **Do not commit generated artifacts** unless the build requires them for runtime/distribution.
- **Constraint tie-breaker.** Correctness/security first, then scope/clarity, then reuse. Document tradeoffs in the spec.
- **Unfamiliar term?** Check the Self Dictionary in Notion first; it is authoritative before searching the codebase.
- **Linear issue descriptions are immutable after creation.** Updates go in comments via `save_comment`; `save_issue` on an existing issue is only for structured fields.

## SDK Architecture Rules

- **TypeScript is the primary surface.** Core logic, state machines, stores, proving flow, and UI live in TS/WebView. Before writing native code ask "Can this run in the WebView?" If yes or maybe, it belongs in TS.
- **Native handlers stay thin.** Kotlin/Swift are for hardware, OS APIs, lifecycle, keychain, and crypto signing/key-gen only.
- **Keychain is native-managed.** No web fallback for secure storage.
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` is platform-agnostic except `src/adapters/react-native/`.
- **Reuse through `mobile-sdk-alpha`.** Shared types, interfaces, constants, parsing, validation, formatting, state machines, and stores belong in the SDK.
- **Bridge protocol is the only coupling.** Native shells and WebView share a JSON contract; no side channels, custom messaging, or platform extensions.
- **Adapter interfaces are the coupling layer.** WebView imports SDK adapter interfaces; native shells implement bridge handlers; code does not cross the bridge boundary.
- **Fail closed on security boundaries.** Reject unknown protocol versions, block remote `devServerUrl` in production, and default-deny session lifecycle edge cases.
- **No RN app regressions.** `mobile-sdk-alpha` changes stay backwards-compatible with Self Wallet.

## Validation

```bash
cd packages/mobile-sdk-alpha && pnpm test && pnpm types
cd packages/webview-bridge && pnpm build && pnpm test
cd packages/webview-app && pnpm build
pnpm kmp:test
pnpm lint && pnpm types && pnpm build
```

## Specs

- **Every SDK feature needs a repo spec + Linear issue.** App-only/non-SDK work needs a Linear issue with inline scope.
- **Read the relevant workstream `SPEC.md` before implementing.** Start at [SDK Index](./specs/projects/sdk/INDEX.md); architecture is in [SDK Overview](./specs/projects/sdk/OVERVIEW.md).
- Specs live in `specs/projects/sdk/workstreams/<scope>/` (`SPEC.md` = backlog; `plans/<ID>-<slug>.md` = execution). Keep `SPEC.md` scannable and update specs when implementation deviates.
- **Full planning protocol, spec-writing guidelines, and the `/pr-audit` to `/gaps-to-issues` to `/spec-from-audit` pipeline:** see [SDK Contributing](./specs/projects/sdk/CONTRIBUTING.md).

## Workspace-Specific Instructions

- [app/AGENTS.md](./app/AGENTS.md) - mobile app development, E2E testing, deployment.
- [packages/webview-app/AGENTS.md](./packages/webview-app/AGENTS.md) - WebView app development, Euclid migration, assets.
- [packages/mobile-sdk-alpha/AGENTS.md](./packages/mobile-sdk-alpha/AGENTS.md) - SDK development, testing guidelines.
- [noir/AGENTS.md](./noir/AGENTS.md) - Noir circuit development.
