# Claude Code Instructions

## Repository Overview

Yarn v4 monorepo for Self — identity verification using passport NFC + zero-knowledge proofs. Two major surfaces:

1. **React Native app** (`app/`) — Self Wallet, production mobile app
2. **SDK packages** (`packages/`) — Embeddable verification SDK (WebView engine + native shells)

## Quick Setup

```bash
nvm use && corepack enable && yarn install
```

## Key Rules

- **Package manager:** Yarn (never npm or pnpm)
- **Keep the codebase DRY.** Before writing new code, search for existing utilities/components/flows and reuse or refactor to shared modules. Create new code only if a reusable option does not exist.
- **Extract repeated UI.** If the same UI sub-structure appears in 2+ places, extract a shared component.
- **Reusable UI belongs in shared libraries.** If a UI primitive is broadly reusable, add it to a shared library (e.g., `@selfxyz/euclid` or another shared package) instead of duplicating in feature code.
- **Keep files small.** Aim for <800 LOC per file. If a file approaches 800 LOC, split it into smaller modules.
- **Move static data out of UI.** Large static maps/lookups/constants do not belong in screen/components; move them to `utils/` or `data/` modules.
- **Prefer design tokens over hex.** Use shared color/font/spacing tokens instead of raw hex values in UI code.
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` must be platform-agnostic outside of `src/adapters/react-native/`.
- **Native handlers are thin wrappers.** No business logic in Kotlin or Swift. All logic lives in TypeScript.
- **Keychain is always native-managed.** No web fallbacks for secure storage. This is a security boundary.
- **No “slop comments.”** Only add comments when they convey non-obvious intent or constraints. Never add generic or chatty comments.
- **Signal over praise in docs/reviews.** Remove feel-good or back-patting text that does not change decisions or actions. Keep only actionable content: concrete issues, risks, decisions, owners, next steps, and validation evidence.
- **Spec naming and structure must be context-first.** Use doc-type file names (for example `OVERVIEW.md`, `SPEC.md`) and do not repeat project prefixes in file names. Use descriptive labels in markdown links — `[SDK Overview](./OVERVIEW.md)` not `[OVERVIEW.md](./OVERVIEW.md)` — so the link text is meaningful without folder context.
- **No singleton spec folders.** Do not create a folder that exists only to hold one markdown file; keep single docs at the nearest meaningful project/shared root.
- **Workstream spec names are fixed.** Under `workstreams/<scope>/`, use `SPEC.md` (context + implementation in one file); use `SPEC-<TOPIC>.md` only when multiple implementation specs are needed in that same folder.
- **Use the two-layer spec model.** `INDEX.md` and `OVERVIEW.md` are stable project context. Each workstream `SPEC.md` is durable context plus backlog. PR execution lives in `workstreams/<scope>/plans/<BACKLOG-ID>-<slug>.md`. Paused workstreams live under `specs/projects/sdk/paused/<scope>/` with the same structure.
- **Test value over mock wiring.** Prefer tests that validate behavior. Avoid tests that only assert mocks were called unless that is the behavior being validated.
- **PR size target:** 1k–3k LOC changed. Smaller is fine for focused fixes. If >3k, add a brief justification for why it can’t be split.
- **No generated artifacts in source PRs.** Do not commit build outputs or generated assets unless the build system requires them for runtime or distribution.
- **Each chunk = one PR.** Don't bundle chunks into mega PRs. Keeps reviews fast, reverts clean, and progress visible.
- **TypeScript is the primary surface area.** All core logic (proving machine, state machines, stores, UI) lives in TypeScript in the WebView. Kotlin and Swift exist only for hardware access (NFC, camera, biometrics), OS-level APIs (keychain, lifecycle), and crypto signing/key-gen. Before writing any native code, ask: "Can this run in the WebView?" If yes or maybe, it belongs in TypeScript.
- **Maximize code reuse through `mobile-sdk-alpha`.** Before adding code to `webview-app`, `kmp-sdk`, or `app/`, check if `mobile-sdk-alpha` already has it or should have it. Types, interfaces, constants, parsing, validation, formatting, state machines, and stores belong in the SDK. Migrate shared code to `mobile-sdk-alpha` before building WebView UI that needs it.
- **Bridge protocol is the only coupling.** Native shells and the WebView share a JSON contract, not code. New native handlers must follow the bridge protocol exactly — no custom messaging, no side channels, no platform-specific extensions. The WebView must not know which native shell it's running inside.
- **Adapter interfaces are the coupling layer.** WebView code imports adapter interfaces from SDK core. Native shells implement bridge handlers. Nobody imports code across the bridge boundary.
- **Fail closed on security-critical boundaries.** Default-deny for protocol compatibility, remote bundle loading, and verification session lifecycle. Reject unknown protocol versions, block remote `devServerUrl` in production.
- **No regressions in the RN app.** Every change to `mobile-sdk-alpha` must be backwards-compatible with the existing Self Wallet app.
- **Specs stay current.** When implementation deviates from the spec, update the spec. A stale spec is worse than no spec.
- **Constraint tie-breaker.** If rules conflict: correctness and security first, then scope/clarity (small PRs, small files), then reuse. Document the tradeoff in the spec.
- **Linear issue descriptions are immutable after creation.** Never overwrite an issue description with `save_issue` to add updates, status notes, or context. Issue descriptions are the original scope set at creation time. All subsequent updates — status changes, progress notes, discovered context, blockers, decision records — go in **comments** via `save_comment`. The only valid use of `save_issue` on an existing issue is to change structured fields (status, priority, assignee, labels). If you need to correct a factual error in the description, add a comment explaining the correction rather than silently rewriting history.

## Specs & Planning

**Every feature — even minor ones — needs a spec.** For SDK work (`packages/`, `webview-app`, `webview-bridge`), specs live in **both** the repo (`specs/`) and Linear. The repo spec is the canonical, version-controlled execution plan. The Linear issue is the tracking and discovery layer. For app-only or non-SDK work, a Linear issue with inline scope is sufficient — no repo spec required.

### Where Specs Live

- **Execution specs → `specs/projects/sdk/workstreams/<scope>/plans/<ID>-<slug>.md`** — version-controlled, agent-executable plans
- **Backlog → `specs/projects/sdk/workstreams/<scope>/SPEC.md`** — durable context plus backlog table per workstream
- **Architecture context → `specs/projects/sdk/OVERVIEW.md`** — system architecture, bridge protocol, decision matrix
- **Audit docs → `docs/reviews/`** — PR audit findings, kept in repo for git history
- **Linear issues** — tracking, discovery, status. Link to the repo spec. Attach a Linear document copy for cross-tool access.

### Planning Protocol

1. **Read** this file's Key Rules and any relevant specs — understand the current state and constraints
2. **Create a Linear issue** if one doesn't exist — include scope, files modified, acceptance criteria
3. **Write the spec** in `specs/` following the two-layer model (backlog row in `SPEC.md`, execution plan in `plans/`)
4. **Create a Linear document** attached to the issue with the spec content (so non-GitHub users can review)
5. **Then implement** — one spec = one PR (see PR size target in Key Rules)
6. **After completion:** Update the Linear issue status via `save_issue` (status field only). Add a **comment** via `save_comment` summarizing what was done, linking the PR. Close when done.

### Spec-Writing Guidelines

Specs are agent-executable prompts. A new Claude Code session with no prior context must be able to pick up the spec and produce a correct PR.

- **Make decisions, not options.** "Use local wrappers" not "Consider adding to Euclid or using local wrappers." Agents can't choose between approaches — tell them which one.
- **Use second person.** "You are fixing X" not "X should be fixed."
- **Be explicit about constraints.** "You will NOT modify..." not just "Focus on..."
- **Provide exact file paths with line numbers.** `src/utils/kycProvider.ts:118` not "the provider file."
- **State the validation command.** Agents will run it. If it's not there, they'll skip validation.
- **One spec = one PR.** Target the PR size from Key Rules (1k–3k LOC). If a spec would exceed that, split it.
- **Mark items as required vs optional.** Don't let agents infer priority.
- **Include out-of-scope sections.** These are as important as in-scope sections for preventing drift.
- **Qualify coverage claims precisely.** "Complete, tested" means handler-level integration tests pass end-to-end. If only shared parsers or utilities are tested, say that. Overclaimed coverage propagates into execution plans and skips real testing work.
- **Flag invariant departures explicitly.** If a spec's approach conflicts with an active rule in CLAUDE.md, OVERVIEW.md, or a sibling workstream SPEC.md, the spec must call out the conflict, justify the departure, and list the parent docs that need updating. Silent contradictions cause repo-wide drift.
- **Use `--remote` for medium+ work.** Medium and large specs benefit from `claude --remote` so work continues in the background.

### Audit Pipeline Skills

Three Claude Code skills automate the review-to-implementation pipeline:

1. **`/pr-audit`** — Multi-agent review (component + integration + routing), produces audit doc in `docs/reviews/`
2. **`/gaps-to-issues`** — Creates Linear issues from audit PR buckets
3. **`/spec-from-audit`** — Generates agent-executable specs (repo file + Linear document), one per issue

Run them in sequence with review pauses between each step.

### Why Specs

- Prevents scope creep — writing "files NOT modified" forces focus
- Survives session loss — specs live in the repo and Linear, not session memory
- Enables parallel work — multiple agents can pick up specs from the same project
- Creates audit trail — what was planned vs what was built (version-controlled in git)
- Enables cross-tool review — Linear documents let non-GitHub users review specs

## Validation Commands

```bash
# SDK core
cd packages/mobile-sdk-alpha && yarn test && yarn types

# Bridge
cd packages/webview-bridge && yarn build && yarn test

# WebView app
cd packages/webview-app && yarn build

# KMP
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Full repo
yarn lint && yarn types && yarn build
```

## Workspace-Specific Instructions

- `app/AGENTS.md` — Mobile app development, E2E testing, deployment
- `packages/webview-app/AGENTS.md` — WebView app development, Euclid screen migration, asset management
- `packages/mobile-sdk-alpha/AGENTS.md` — SDK development, testing guidelines
- `noir/AGENTS.md` — Noir circuit development
