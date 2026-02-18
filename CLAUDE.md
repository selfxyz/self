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
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` must be platform-agnostic outside of `src/adapters/react-native/`.
- **Native handlers are thin wrappers.** No business logic in Kotlin or Swift. All logic lives in TypeScript.
- **Keychain is always native-managed.** No web fallbacks for secure storage. This is a security boundary.

## SDK Specs

For SDK implementation work, read the specs in `specs/`:

- **Start:** [specs/README.md](./specs/README.md) — table of contents and reading order
- **Architecture:** [specs/SDK-OVERVIEW.md](./specs/SDK-OVERVIEW.md) — bridge protocol, module table, decision matrix
- **Rules:** [specs/PROJECT-RULES.md](./specs/PROJECT-RULES.md) — project-specific guardrails
- **Wave plan:** [specs/WAVE-PLAN.md](./specs/WAVE-PLAN.md) — parallel execution plan

## Planning Protocol

**Always write plans to disk before executing.** When working on multi-step tasks:

1. Read relevant specs and understand the current state
2. Create a plan (markdown file or update to the spec's chunk status)
3. **Write the plan to a file** (e.g., update WAVE-PLAN.md, or create a session plan in specs/)
4. Then start implementing

This protects against session loss (API errors, context overflow, `/clear`), enables multiple agents to work from the same plan, and creates an audit trail. A plan that only exists in session memory is a plan that will be lost.

## Validation Commands

```bash
# SDK core
cd packages/mobile-sdk-alpha && npx vitest run && npx tsc --noEmit

# Bridge
cd packages/webview-bridge && yarn build && yarn vitest run

# WebView app
cd packages/webview-app && npx tsc --noEmit && npx vite build

# KMP
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Full repo
yarn lint && yarn types && yarn build
```

## Workspace-Specific Instructions

- `app/AGENTS.md` — Mobile app development, E2E testing, deployment
- `packages/mobile-sdk-alpha/AGENTS.md` — SDK development, testing guidelines
- `noir/AGENTS.md` — Noir circuit development
