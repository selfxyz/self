# Self app Integration Validation for `SelfVerification`

> Last updated: 2026-03-10
> Status: Ready

- Workstream: rn-sdk
- Backlog IDs: RN-01
- Owner: RN SDK
- Branch: TBD
- PR: TBD

## Why

- The RN SDK is implemented, but Self app integration validation is still open.
- This is the clearest remaining product-level confidence gap for the RN host path.

## Scope

- Validate `SelfVerification` inside the Self app app.
- Confirm launch, callback, asset loading, and core native bridge flows work in the host app.
- Record any integration-specific incompatibilities.

## Out of Scope

- npm publishing
- new feature development in the WebView flow

## Files to Modify

- `app/**` if host integration fixes are required
- `packages/rn-sdk/**` if wrapper fixes are required
- `specs/projects/sdk/paused/rn-sdk/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**`

## Preconditions

- The RN SDK package builds and loads bundled assets on iOS and Android.

## Validation

```bash
cd packages/rn-sdk && npx vitest run
cd app && yarn test
```

## Definition of Done

- [ ] Self app integration path validated
- [ ] Required fixes split or landed
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec cleanup.
