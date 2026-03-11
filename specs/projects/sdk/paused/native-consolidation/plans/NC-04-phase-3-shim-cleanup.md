# Phase 3 ObjC Shim Cleanup

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-consolidation
- Backlog IDs: NC-04
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- ObjC shims are lower risk than PassportReader parity but still create maintenance drag.

## Scope

- Reduce duplicate ObjC bridge shims to the minimum required set.
- Document deprecations and linking constraints.

## Out of Scope

- PassportReader logic changes
- final dead-file deletions

## Files to Modify

- `app/ios/*.m`
- `packages/mobile-sdk-alpha/ios/SelfSDK/*.m`
- `specs/projects/sdk/workstreams/native-consolidation/SPEC.md`

## Files Not to Modify

- Swift scanner or PassportReader logic unless required for linkage

## Preconditions

- NC-03 is done and validated.

## Implementation Notes

- Keep JS-visible module names stable until explicit deletion phase.

## Validation

```bash
cd app && yarn jest:run --watchman=false
yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false
```

## Definition of Done

- [ ] Duplicate shims reduced
- [ ] Linkage/build impact validated
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
