# RN SDK npm Publishing Readiness

> Last updated: 2026-03-10
> Status: Ready

- Workstream: rn-sdk
- Backlog IDs: RN-02
- Owner: RN SDK
- Branch: TBD
- PR: TBD

## Why

- The RN SDK implementation is largely complete, but publishing is still open.
- Packaging and release readiness should be isolated from integration work.

## Scope

- Audit npm packaging metadata, included files, scripts, and release prerequisites.
- Document remaining blockers and release steps.

## Out of Scope

- actual publish execution
- Self app integration fixes

## Files to Modify

- `packages/rn-sdk/package.json`
- release docs/specs as needed
- `specs/projects/sdk/paused/rn-sdk/SPEC.md`

## Files Not to Modify

- runtime handler logic unless a packaging-specific issue requires it

## Preconditions

- RN-01 is complete or explicitly waived.

## Validation

```bash
cd packages/rn-sdk && npx tsc --noEmit
```

## Definition of Done

- [ ] npm packaging readiness documented
- [ ] Remaining release blockers explicitly listed
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec cleanup.
