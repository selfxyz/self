# AGENTS Instructions

## Repository Overview

Self is a pnpm monorepo for identity verification using passport NFC and zero-knowledge proofs.

- `app/` (`@selfxyz/mobile-app`) - React Native Self Wallet.
- `packages/` - SDK surfaces, including WebView engine and native shells.
- `common/`, `circuits/`, `contracts`, `sdk/core`, `sdk/qrcode`, `noir` - shared utilities, circuits, contracts, and SDK packages.

Setup: `nvm use && corepack enable && pnpm install`

## Key Rules

- **Package manager:** pnpm only. Use `pnpm install`, `pnpm add`, `pnpm remove`, and `pnpm --filter <workspace>`; never use npm or yarn for dependency management.
- **Respect nested instructions.** Read the nearest `AGENTS.md` before working under `app/`, `packages/mobile-sdk-alpha/`, `packages/webview-app/`, or `noir/`.
- **DRY first.** Search for existing utilities/components/flows and reuse or refactor before adding new code.
- **Extract repeated UI.** Same UI sub-structure in 2+ places becomes a shared component; broad primitives belong in a shared library such as `@selfxyz/euclid`.
- **Keep files small.** Aim below 800 LOC; split modules as files approach that size.
- **Move static data out of UI.** Large maps/lookups/constants belong in `utils/` or `data/`, not screens/components.
- **Design tokens over hex.** Prefer shared color/font/spacing tokens.
- **No slop comments.** Add comments only for non-obvious intent, temporary workarounds, `TODO:`/`FIXME:`, or invariants future readers would otherwise break.
- **Signal over praise.** Docs, reviews, specs, and PR text should contain issues, risks, decisions, owners, next steps, and validation evidence.
- **Test behavior.** Prefer tests that validate outcomes, not mock wiring.
- **Do not commit generated artifacts** unless the build requires them for runtime or distribution.

## SDK Architecture Rules

- **TypeScript is the primary surface.** Core logic, state machines, stores, proving flow, and UI live in TypeScript/WebView.
- **Native handlers stay thin.** Kotlin/Swift are for hardware, OS APIs, lifecycle, keychain, and crypto signing/key-gen only.
- **Keychain is native-managed.** No web fallback for secure storage.
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` is platform-agnostic except `src/adapters/react-native/`.
- **Reuse through `mobile-sdk-alpha`.** Types, interfaces, constants, parsing, validation, formatting, state machines, and stores belong in the SDK when shared.
- **Bridge protocol is the only coupling.** Native shells and WebView share a JSON contract; no side channels, custom messaging, or platform-specific extensions.
- **Adapter interfaces are the coupling layer.** WebView imports SDK adapter interfaces; native shells implement bridge handlers; code does not cross the bridge boundary.
- **Fail closed on security boundaries.** Reject unknown protocol versions, block remote `devServerUrl` in production, and default-deny session lifecycle edge cases.
- **No RN app regressions.** `mobile-sdk-alpha` changes must remain backwards-compatible with Self Wallet.

## Validation

Run the narrowest relevant checks first, then broaden before PR/commit.

```bash
pnpm --filter '...[HEAD]' --if-present run nice
pnpm lint
pnpm types
pnpm build
pnpm test
pnpm --filter @selfxyz/contracts build
```

Workspace examples:

```bash
pnpm --filter @selfxyz/common test
pnpm --filter @selfxyz/circuits test
pnpm --filter @selfxyz/mobile-app test
pnpm --filter @selfxyz/mobile-sdk-alpha test
```

Notes:

- `@selfxyz/circuits` tests may fail locally if OpenSSL algorithms are missing.
- `@selfxyz/contracts` tests are disabled in CI and may be skipped.
- Mobile E2E tests run in CI; local E2E is optional unless the task specifically needs it.
- In React Native tests, avoid nested/dynamic `require('react-native')`; prefer top-level ES imports to prevent CI OOM issues.
- Use shared `.github/actions/cache-*` composite actions for workflow dependency caching; avoid direct `actions/cache`.

## Specs

Before SDK work, read the Key Rules and SDK Architecture Rules above plus the relevant `specs/projects/sdk/workstreams/*/SPEC.md` constraints, validation commands, and ownership boundaries. For the planning protocol and spec-writing guidelines, see [SDK Contributing](./specs/projects/sdk/CONTRIBUTING.md).

Start at [specs/README.md](./specs/README.md). Key files:

- [SDK Index](./specs/projects/sdk/INDEX.md) - project entry point and workstream links.
- [SDK Overview](./specs/projects/sdk/OVERVIEW.md) - architecture, bridge protocol, module table, execution status.
- `specs/projects/sdk/workstreams/*/SPEC.md` - durable context, invariants, backlog.
- `specs/projects/sdk/workstreams/*/plans/*.md` - PR-sized execution plans.
- `specs/projects/sdk/paused/*/SPEC.md` - paused workstreams retained for reuse.

Spec rules:

- Use doc-type names (`INDEX.md`, `OVERVIEW.md`, `SPEC.md`, `PLAN.md`, `STATUS.md`, `HANDOFF.md`, `REVIEW.md`, `ARCHITECTURE.md`, `INITIATIVE.md`); do not repeat project names already present in folder context.
- `INDEX.md` is navigation only; `OVERVIEW.md` is substantive context.
- Do not create one-file folders.
- Workstream docs use `workstreams/<scope>/SPEC.md`; PR plans use `workstreams/<scope>/plans/<BACKLOG-ID>-<slug>.md`.
- If renaming/moving specs, update references in `specs/`, `AGENTS.md`, and `CLAUDE.md` in the same change.
- Qualify coverage claims precisely: distinguish unit/shared-utility coverage from handler-level, integration, and E2E coverage.
- Flag invariant departures explicitly, justify them, and list parent docs that need updates if accepted.

## Workspace-Specific Instructions

- [app/AGENTS.md](./app/AGENTS.md) - mobile app development, E2E testing, deployment.
- [packages/mobile-sdk-alpha/AGENTS.md](./packages/mobile-sdk-alpha/AGENTS.md) - SDK development, testing, package validation.
- [packages/webview-app/AGENTS.md](./packages/webview-app/AGENTS.md) - WebView app development, Euclid migration, assets.
- [noir/AGENTS.md](./noir/AGENTS.md) - Noir circuit development.

## Scope

These instructions apply to the entire repository unless overridden by a nested `AGENTS.md`.
