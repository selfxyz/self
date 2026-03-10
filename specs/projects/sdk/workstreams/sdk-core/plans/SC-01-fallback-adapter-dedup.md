# Bridge Fallback Adapter De-duplication

> Last updated: 2026-03-10
> Status: Ready

- Workstream: sdk-core
- Backlog IDs: SC-01
- Owner: SDK Core
- Branch: TBD
- PR: TBD

## Why

- The engine-level adapters are supposed to be canonical, but fallback behavior still exists in both engine and bridge layers.
- This creates ambiguous ownership and makes future changes easy to drift.

## Scope

- Consolidate fallback ownership so engine adapters remain canonical.
- Update consuming surfaces to use the canonical path.
- Reconcile any transitional notes in specs.

## Out of Scope

- native handler changes
- crypto bridge surface additions

## Files to Modify

- `packages/mobile-sdk-alpha/src/adapters/browser/**`
- `packages/webview-bridge/**`
- `packages/webview-app/**` if needed to switch imports
- `specs/projects/sdk/workstreams/sdk-core/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**`
- `packages/rn-sdk/**`

## Preconditions

- Browser entry invariants remain unchanged.

## Implementation Notes

- Preserve behavior compatibility while moving ownership.
- Keep the bridge package as protocol plumbing, not business logic.

## Validation

```bash
cd packages/mobile-sdk-alpha && npx tsc --noEmit
cd packages/mobile-sdk-alpha && npx vitest run
cd packages/webview-app && npx vite build
```

## Definition of Done

- [ ] Fallback ownership is unambiguous
- [ ] Consuming imports are updated
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created from remaining follow-up list.
