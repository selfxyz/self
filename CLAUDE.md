# Claude Code Instructions

## Repository Overview

Yarn v4 monorepo for Self — identity verification using passport NFC + zero-knowledge proofs.

- `app/` (`@selfxyz/mobile-app`) — React Native Self Wallet, production mobile app.
- `packages/` — SDK surfaces: WebView engine + native shells.

Setup: `nvm use && corepack enable && yarn install`

## Key Rules

- **Package manager:** Yarn only (never npm/pnpm).
- **Respect nested instructions.** Read the nearest `AGENTS.md` before working under `app/`, `packages/mobile-sdk-alpha/`, `packages/webview-app/`, or `noir/`.
- **DRY first.** Search for existing utilities/components/flows and reuse or refactor before adding new code.
- **Extract repeated UI.** Same sub-structure in 2+ places → shared component; broad primitives → a shared library such as `@selfxyz/euclid`.
- **Keep files small.** Aim <800 LOC; split as files approach it.
- **Move static data out of UI.** Large maps/lookups/constants → `utils/` or `data/`, not screens/components.
- **Design tokens over hex.** Prefer shared color/font/spacing tokens.
- **No slop comments.** Comment only for non-obvious intent, temporary workarounds, `TODO:`/`FIXME:`, or invariants a future reader would otherwise break. Default to zero new comments in PRs; no JSDoc-restating-the-obvious, no "// Handle X" labels.
- **Signal over praise.** Docs/reviews/specs/PRs carry issues, risks, decisions, owners, next steps, validation evidence — not feel-good text.
- **Test behavior**, not mock wiring.
- **PR size:** 1k–3k LOC; >3k needs a justification. One chunk = one PR.
- **Do not commit generated artifacts** unless the build requires them for runtime/distribution.
- **Constraint tie-breaker.** Correctness/security first, then scope/clarity (small PRs/files), then reuse. Document tradeoffs in the spec.
- **Unfamiliar term?** Check the [Self Dictionary](https://www.notion.so/34257801cd1280a4b348d01fac82a2be) in Notion first — it's authoritative, before searching the codebase.
- **Linear issue descriptions are immutable after creation.** All updates (status, progress, blockers, decisions) go in **comments** via `save_comment`. `save_issue` on an existing issue is only for structured fields (status/priority/assignee/labels).

## SDK Architecture Rules

- **TypeScript is the primary surface.** Core logic, state machines, stores, proving flow, and UI live in TS/WebView. Before writing native code ask "Can this run in the WebView?" — if yes/maybe, it belongs in TS.
- **Native handlers stay thin.** Kotlin/Swift are for hardware, OS APIs, lifecycle, keychain, and crypto signing/key-gen only.
- **Keychain is native-managed.** No web fallback for secure storage (security boundary).
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` is platform-agnostic except `src/adapters/react-native/`.
- **Reuse through `mobile-sdk-alpha`.** Shared types, interfaces, constants, parsing, validation, formatting, state machines, and stores belong in the SDK — migrate there before building WebView UI that needs them.
- **Bridge protocol is the only coupling.** Native shells and WebView share a JSON contract; no side channels, custom messaging, or platform extensions. The WebView must not know which shell it runs in.
- **Adapter interfaces are the coupling layer.** WebView imports SDK adapter interfaces; native shells implement bridge handlers; code does not cross the bridge boundary.
- **Fail closed on security boundaries.** Reject unknown protocol versions, block remote `devServerUrl` in production, default-deny session lifecycle edge cases.
- **No RN app regressions.** `mobile-sdk-alpha` changes stay backwards-compatible with Self Wallet.

## Validation

```bash
cd packages/mobile-sdk-alpha && yarn test && yarn types   # SDK core
cd packages/webview-bridge && yarn build && yarn test      # Bridge
cd packages/webview-app && yarn build                      # WebView app
yarn kmp:test                                              # KMP SDK (Kotlin)
yarn lint && yarn types && yarn build                      # Full repo
```

## Specs

- **Every SDK feature needs a repo spec + Linear issue.** App-only/non-SDK work → a Linear issue with inline scope is enough.
- **Read the relevant workstream `SPEC.md` before implementing.** Start at [SDK Index](./specs/projects/sdk/INDEX.md); architecture in [SDK Overview](./specs/projects/sdk/OVERVIEW.md).
- Specs live in `specs/projects/sdk/workstreams/<scope>/` (`SPEC.md` = backlog; `plans/<ID>-<slug>.md` = execution). Keep `SPEC.md` scannable (100–200 lines, no paths/code). Update specs when implementation deviates.
- **Full planning protocol, spec-writing guidelines, and the `/pr-audit` → `/gaps-to-issues` → `/spec-from-audit` pipeline:** see [SDK Contributing](./specs/projects/sdk/CONTRIBUTING.md).

## Workspace-Specific Instructions

- [app/AGENTS.md](./app/AGENTS.md) — mobile app dev, E2E testing, deployment.
- [packages/webview-app/AGENTS.md](./packages/webview-app/AGENTS.md) — WebView app dev, Euclid migration, assets.
- [packages/mobile-sdk-alpha/AGENTS.md](./packages/mobile-sdk-alpha/AGENTS.md) — SDK dev, testing guidelines.
- [noir/AGENTS.md](./noir/AGENTS.md) — Noir circuit development.
