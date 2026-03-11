# Phase 0 Safety Rails and Contract Baselines

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-consolidation
- Backlog IDs: NC-01
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- Later consolidation phases should not proceed without baseline tests and parity documentation.
- The workstream spec already treats Phase 0 as a hard gate.

## Scope

- Add bridge contract tests for app NFC and RN test app MRZ.
- Add `CONTRACTS.md` parity snapshots.
- Add PR checklist support if still missing.

## Out of Scope

- MRZ code moves
- PassportReader refactors

## Files to Modify

- test files listed in `SPEC.md`
- `specs/projects/sdk/paused/native-consolidation/CONTRACTS.md`
- `specs/projects/sdk/paused/native-consolidation/SPEC.md`

## Files Not to Modify

- native scanner implementations

## Preconditions

- Existing bridge contracts are treated as canonical until explicitly changed.

## Implementation Notes

- Tests first, consolidation later.
- Keep this PR limited to safety rails and documentation.

## Validation

```bash
cd app && yarn jest:run --watchman=false
yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false
```

## Definition of Done

- [x] Layer 1 tests exist and pass
- [x] CONTRACTS.md exists and is linked
- [x] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
- 2026-03-10: Marked done to match merged Phase 0 safety-rail work in PR #1822.
