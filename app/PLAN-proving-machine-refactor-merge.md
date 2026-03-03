# Plan: Merge provingMachine Refactor (PR #1526) onto dev

## PR #1526 Feedback Summary

### Human Feedback (transphorm)
- **iOS keychain modal guard is intentional** — the keychain bug only exists on Android, so `if (Platform.OS !== 'android') return` is correct.

### Bot Feedback (coderabbit / codex) — Grouped by Severity

#### Critical (test failures)
1. **Test mock missing `getSelfAppState`** — `teeConnectionHandler.test.ts` mock lacks this method, causes TypeError
2. **`wsEventListeners['open']()` missing `Event` argument** — TS2554 in teeConnectionHandler tests

#### Major (unsafe casts / missing guards)
3. **`secret as string` without null guard** — in `payloadGenerator.ts` (register + disclose cases) and `documentProcessor.ts` (2 places). Should add `if (!secret) throw` before each cast.
4. **`uuid!` non-null assertion** — in `payloadGenerator.ts` `_buildSubmitRequest` call
5. **`passportMetadata!` non-null assertion** — `documentProcessor.ts` line 65
6. **`env!` non-null assertion** — `documentProcessor.ts` line 162
7. **`deployed_circuits!` non-null assertion** — `documentProcessor.ts`
8. **`csca as string` unsafe cast + fire-and-forget IIFE** — `documentProcessor.ts` ~line 280
9. **TEE connection promise lacks timeout** — `teeConnectionHandler.ts` can hang indefinitely
10. **Stale `actor` reference in `connect_error`** — `socketIOListener.ts` line 34 captures actor at setup, should use `getActor()`
11. **Sensitive data in `console.error(data)`** — `socketIOListener.ts` logs full status message
12. **Public API break** — renamed `provingMachineCircuitType` export without backward-compatible alias

#### Minor (defensive improvements)
13. **`circuitType as string`** — `socketIOListener.ts`, should use `?? 'unknown'`
14. **Inconsistent aadhaar handling in `websocketUrlResolver.ts`** — DSC case doesn't throw for aadhaar like other resolvers do
15. **`__DEV__` usage** — dev branch already migrated to `selfClient.config.debug`

### Verdict on Feedback
- Items 1-2 are real test breakages that need fixing
- Items 3-11 are legitimate safety improvements but many were **pre-existing patterns** in the original `provingMachine.ts` (the refactor just moved them)
- Item 12 (public API alias) is worth doing
- Item 15 is moot — dev already fixed the `__DEV__` pattern

---

## Current Branch State

| Branch | Commits ahead of merge-base |
|--------|---------------------------|
| `codex/refactor-provingmachine.ts-for-maintainability` | 13 commits (refactoring) |
| `origin/dev` | ~30 commits (KYC support, WS reconnection, VERIFICATION_COMPLETE event, `__DEV__` → `config.debug`, platform detection, expo SDK 52, etc.) |

**Key changes on dev since PR branched:**
- **KYC document support** (`kyc` cases added throughout `provingMachine.ts`)
- **WebSocket reconnection logic** (`_reconnectTeeWebSocket`, `wsReconnectAttempts`, backoff)
- **`emitVerificationComplete` event** (new function + calls in success/failure/error states)
- **`__DEV__` → `selfClient.config.debug`** migration
- **`getPlatform()` → `getPlatform(selfClient)`** (reads from config instead of RN Platform)
- **`startProving` WS reconnection** (checks readyState, attempts reconnect before proving)

**The PR's version of `provingMachine.ts` is based on OLD code that lacks all of the above.**

---

## Recommended Strategy: Fresh Branch off dev

**Do NOT rebase or merge the PR as-is.** The base file has diverged too much — merging would either lose dev's new features or create an unmaintainable conflict mess.

### Approach: New branch, same architecture, current code

1. **Create new branch off `origin/dev`**: `feat/refactor-proving-machine-v2`

2. **Apply the same modular extraction pattern** from PR #1526, but against current dev code:

   | New Module | Responsibility | Source in current provingMachine.ts |
   |-----------|---------------|-------------------------------------|
   | `internal/stateMachine.ts` | XState machine definition, state types | Machine setup / types section |
   | `internal/payloadGenerator.ts` | `_generateCircuitInputs`, `_generatePayload`, `_buildSubmitRequest` | Payload generation block |
   | `internal/websocketUrlResolver.ts` | `getMappingKey`, `resolveWebSocketUrl` | URL resolution helpers |
   | `internal/websocketHandlers.ts` | `_handleWebSocketMessage`, `_handleWsOpen/Error/Close`, `_reconnectTeeWebSocket` | WS handler methods |
   | `internal/socketIOListener.ts` | Socket.IO status listener setup | `_setupSocketIOListener` method |
   | `internal/teeConnectionHandler.ts` | TEE connection + attestation validation | `_connectToTEE` method |
   | `internal/documentProcessor.ts` | Document support check, registration check, passport parsing | `_checkDocumentSupportedAndRegistration` |
   | `internal/actorSubscriptions.ts` | Actor event subscriptions, analytics, `emitVerificationComplete` | `setupActorSubscriptions` function |
   | `internal/constants.ts` | Shared constants (timeouts, retry counts) | Scattered magic numbers |
   | `internal/dependencyFactory.ts` | Dependency injection types | New (for testability) |
   | `internal/helpers.ts` | `createProofContext`, `getPlatform`, etc. | Utility functions |

3. **Rules for extraction (CRITICAL — no logic changes):**
   - Copy-paste functions verbatim from current dev's `provingMachine.ts`
   - Only change: add `export`, adjust imports, update function signatures for dependency injection
   - Do NOT fix any of the coderabbit feedback items during extraction
   - Do NOT change any conditional logic, error handling, or control flow
   - The extraction PR should be a pure structural refactor — `git diff` of the full tree should show only moved code + import changes

4. **Address coderabbit feedback in a SEPARATE follow-up PR:**
   - Null guards for `secret`, `uuid`, `passportMetadata`, `env`, `csca`
   - TEE connection timeout
   - Stale actor reference fix
   - Sensitive data logging removal
   - Public API backward-compatible alias
   - This keeps the refactor PR reviewable and the safety fixes auditable independently

5. **Close PR #1526** with a comment linking to the new PR

### Why not rebase/merge #1526?
- `provingMachine.ts` has ~420 lines of diff on dev since the branch point
- The PR extracts functions from an OLD version of the file — missing KYC, WS reconnect, verification events
- Rebasing would require manually resolving every extraction against new code — error-prone and unauditable
- Starting fresh means every line is traceable to current dev

---

## Follow-up PR Scope (Post-Refactor)

### Worth Addressing (Follow-up PR)

| # | Issue | Where | Why |
|---|---|---|---|
| 1 | `secret as string` without null guard | `payloadGenerator.ts` (2 places), `documentProcessor.ts` (2 places) | If `secret` is null, `as string` can silently pass bad input to crypto functions. Add `if (!secret) throw` before each cast. |
| 2 | `uuid!` non-null assertion | `payloadGenerator.ts` `_buildSubmitRequest` call | Could pass null into submit request. Add explicit guard before use. |
| 3 | TEE connection promise lacks timeout | `teeConnectionHandler.ts` | If actor never transitions, promise can hang indefinitely and user can be stuck on loading state. |
| 4 | Sensitive data in `console.error(data)` | `socketIOListener.ts` | Full status payload may contain proof-related data. Log `data.status` only. |
| 5 | Stale actor reference inconsistency in `connect_error` | `socketIOListener.ts` | Most handlers already use `deps.getActor()`; `connect_error` still uses captured actor from setup scope. Minor consistency cleanup. |
| 6 | Public API break (renamed export) | `index.ts` | `provingMachineCircuitType` needs backward-compatible deprecated alias export. |

### Not Worth Addressing (Skip in Follow-up PR)

| # | Issue | Why Skip |
|---|---|---|
| 7 | `passportMetadata!` non-null assertion | `initPassportDataParsing` returns metadata or throws; non-null assertion is effectively safe here. |
| 8 | `env!` non-null assertion | Already guarded in payload generation; in document fetch path `env` is set before use. |
| 9 | `deployed_circuits!` non-null assertion | Protocol store populates this after `fetch_all`; extra guard would be dead/duplicate defensive code. |
| 10 | `csca as string` cast | `isUserRegisteredWithAlternativeCSCA` returns `csca` only when `isRegistered` is true; this path already relies on that contract. |
| 11 | Fire-and-forget IIFE for `markCurrentDocumentAsRegistered` | Intentional non-blocking behavior; making it blocking would delay proving completion for non-critical post-step. |
| 12 | `circuitType as string` fallback (`?? 'unknown'`) | `circuitType` is set before this path. |
| 13 | Aadhaar handling inconsistency in websocket URL resolver DSC case | `payloadGenerator.ts` already throws for Aadhaar+DSC before URL resolution path. |
| 14 | `__DEV__` usage concern | Already migrated on `dev` to `selfClient.config.debug`. |
| 15 | Test mock missing `getSelfAppState` | Relevant to old PR #1526 test setup, not this refactor branch. |

### Follow-up Summary
- Include items **1-4 and 6** as required safety fixes.
- Treat item **5** as optional consistency cleanup in the same PR (or fold into item 4 touches).
- Skip items **7-15** for now to keep scope focused and auditable.

### Follow-up Test Plan (High-Value)
- Add `payloadGenerator` tests for null-guard behavior:
  - Throws when `secret` is missing/null before crypto input generation.
  - Throws when `uuid` is missing/null before `_buildSubmitRequest`.
- Add `teeConnectionHandler` timeout test:
  - Returns failure when actor never reaches success/error transition within timeout.
- Add `socketIOListener` safety tests:
  - Logs status code only (no full payload logging).
  - Uses fresh actor lookup in `connect_error` path.
- Add dedicated module tests for extracted orchestration modules:
  - `actorSubscriptions.ts` state transition/event emission wiring.
  - `teeConnectionHandler.ts` connect success/error/timeout wiring.

---

## Validation

```bash
# After extraction, verify no logic changes:
cd packages/mobile-sdk-alpha

# 1. Types must pass
yarn types

# 2. Existing tests must pass without modification
yarn test

# 3. Lint must pass
yarn lint

# 4. Build must succeed
yarn build

# 5. Proof generation performance gate (client-side only)
# Validate on a mid-tier mobile device profile using curve/circuit-specific baselines.
# Do not regress median client-side proving phases by more than 10% for any circuit:
# payload generation, encryption, WebSocket setup/reconnect, and state-machine transitions.
# End-to-end proof time is backend-dependent and has no absolute SLA gate in this frontend refactor PR.
```

## Files Modified (extraction PR)
- `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` — slimmed to orchestration
- `packages/mobile-sdk-alpha/src/proving/internal/*.ts` — new modules (11 files)
- `packages/mobile-sdk-alpha/src/proving/types.ts` — shared types
- `packages/mobile-sdk-alpha/src/index.ts` — re-export if needed
- `packages/mobile-sdk-alpha/tests/proving/internal/*.test.ts` — new test files

## Files NOT Modified
- `app/` — no app changes in the extraction PR
- Any logic, conditionals, or error handling within extracted functions
- Package versions, configs, CI

## Definition of Done
- [ ] New branch created off current `dev`
- [ ] All proving internals extracted into `internal/` modules
- [ ] `provingMachine.ts` is orchestration-only (imports + wiring)
- [ ] `yarn types && yarn test && yarn lint && yarn build` all pass
- [ ] Client-side proving phases meet curve/circuit-specific baselines (<=10% median regression)
- [ ] No absolute end-to-end proof-time bound is enforced in this PR (backend-dependent)
- [ ] No behavioral changes — diff shows only moved code + imports
- [ ] PR #1526 closed with link to new PR
- [ ] Follow-up PR created for coderabbit safety fixes
