# Phase 2 PassportReader Parity Bridge

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-consolidation
- Backlog IDs: NC-03
- Owner: SDK Platform
- Branch: TBD
- PR: TBD

## Why

- PassportReader divergence is the highest regression-risk consolidation step after MRZ.
- It should remain isolated in its own PR.

## Scope

- Define explicit PassportReader parity contract.
- Introduce shared internal core or equivalent parity-preserving structure.
- Keep wrapper module names stable.

## Out of Scope

- MRZ consolidation
- ObjC shim cleanup

## Files to Modify

- `app/ios/PassportReader.swift`
- `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.swift`
- related TS integration and analytics call sites if required
- `specs/projects/sdk/paused/native-consolidation/SPEC.md`

## Files Not to Modify

- MRZ scanner modules unless parity work proves a contract dependency

## Preconditions

- NC-02 is done and verified.

## Implementation Notes

- Update tests first if consumer behavior changes.
- Do not delete legacy wrappers until parity is proven.

## Validation

```bash
cd app && yarn jest:run --watchman=false
yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
```

## Definition of Done

- [x] Parity contract table updated
- [x] One internal implementation or equivalent parity-preserving structure exists
- [x] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
- 2026-03-10: Extracted shared `PassportReaderCore.swift`, kept wrapper selectors/module names stable, and updated parity docs.
