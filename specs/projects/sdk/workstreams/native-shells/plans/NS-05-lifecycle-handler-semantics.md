# LifecycleBridgeHandler Type and Error Semantics

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-shells
- Backlog IDs: NS-05
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- The current iOS lifecycle handler behavior may drop error fields when `type` is present.
- The intended contract should be explicit before more integrations rely on it.

## Scope

- Decide whether lifecycle payloads with `type` may also carry error semantics.
- Implement the chosen behavior or document/assert the invariant.
- Add or update tests.

## Out of Scope

- Broader lifecycle redesign
- Android lifecycle changes

## Files to Modify

- `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`
- related test files
- `specs/projects/sdk/workstreams/native-shells/SPEC.md`

## Files Not to Modify

- `packages/rn-sdk/**`
- `packages/webview-app/**`

## Preconditions

- Current callback contract in `OVERVIEW.md` remains canonical.

## Implementation Notes

- Prefer an explicit contract decision over silent current behavior.
- If behavior changes, note the compatibility impact in the PR.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
```

## Definition of Done

- [ ] Lifecycle type/error contract is explicit
- [ ] Tests or assertions reflect the chosen behavior
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created from security hardening follow-up.
