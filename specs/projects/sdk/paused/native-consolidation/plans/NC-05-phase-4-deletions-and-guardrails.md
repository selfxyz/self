# Phase 4 Deletions and CI Guardrails

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-consolidation
- Backlog IDs: NC-05
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- The workstream is not truly finished until duplicate files are deleted and guardrails prevent regression.

## Scope

- Delete dead duplicate scanner/passport files.
- Add CI or lint guardrails that detect reintroduced duplicate native implementations.
- Update docs/status to match the final state.

## Out of Scope

- New native feature work
- contract redesign

## Files to Modify

- duplicate native implementation files proven unused
- CI or lint config
- `specs/projects/sdk/workstreams/native-consolidation/SPEC.md`

## Files Not to Modify

- active runtime code not directly involved in cleanup

## Preconditions

- NC-04 is done and validated.

## Implementation Notes

- Delete only after contract and wrapper compatibility work is complete.

## Validation

```bash
cd app && yarn jest:run --watchman=false
yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false
```

## Definition of Done

- [ ] Dead duplicate files removed
- [ ] Guardrail added and documented
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
