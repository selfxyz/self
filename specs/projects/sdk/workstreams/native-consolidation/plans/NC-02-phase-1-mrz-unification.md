# Phase 1 MRZ Core Unification and Validation

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-consolidation
- Backlog IDs: NC-02
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- MRZ duplication was the active local phase in this workstream and shipped in PR #1823.
- The earlier plan exists, but pickup should no longer require reading a giant phase narrative.

## Scope

- Record the merged MRZ wrapper consolidation state in one place.
- Reconcile status and validation notes after PR #1823.

## Out of Scope

- PassportReader parity
- ObjC shim cleanup
- CI guardrails

## Files to Modify

- `app/ios/**`
- `packages/mobile-sdk-alpha/ios/SelfSDK/**`
- `specs/projects/sdk/workstreams/native-consolidation/SPEC.md`
- validation notes as needed

## Files Not to Modify

- `packages/self-sdk-swift/**` unless the canonicalization decision is explicitly changed first

## Preconditions

- Phase 0 safety rails should be complete or explicitly waived.

## Implementation Notes

- The current phase plan chose duplicated identical helper files outside `self-sdk-swift`.
- If that decision changes, update `SPEC.md` and the historical phase plan together so agents do not read conflicting directions.

## Validation

```bash
cd app && yarn jest:run --watchman=false
yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false
```

## Definition of Done

- [x] Remaining iOS build validation completed or explicitly called out
- [x] `SPEC.md` and plan agree on the canonicalization approach
- [x] Backlog row updated

## Status Log

- 2026-03-10: Created to replace implicit "current phase" pickup.
- 2026-03-10: Marked done after PR #1823 merged; future cross-repo MRZ follow-up moved to NC-06.
