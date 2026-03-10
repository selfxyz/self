# Phase 1 MRZ Core Unification and Validation

> Last updated: 2026-03-10
> Status: In Progress

- Workstream: native-consolidation
- Backlog IDs: NC-02
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- MRZ duplication is the current active phase in this workstream.
- The earlier plan exists, but pickup should no longer require reading a giant phase narrative.

## Scope

- Finish MRZ wrapper consolidation work already in flight.
- Complete remaining build validation and status reconciliation.
- Record the chosen canonicalization approach in one place.

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

- [ ] Remaining iOS build validation completed
- [ ] `SPEC.md` and plan agree on the canonicalization approach
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created to replace implicit "current phase" pickup.
