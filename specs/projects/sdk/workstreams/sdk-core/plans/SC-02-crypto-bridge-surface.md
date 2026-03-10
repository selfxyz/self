# Crypto Bridge Surface for Key Generation and Public Key Retrieval

> Last updated: 2026-03-10
> Status: Ready

- Workstream: sdk-core
- Backlog IDs: SC-02
- Owner: SDK Core
- Branch: TBD
- PR: TBD

## Why

- The architecture assumes native crypto methods for `sign`, `generateKey`, and `getPublicKey`.
- The current bridge adapter surface still omits `generateKey()` and `getPublicKey()`.

## Scope

- Extend the bridge crypto adapter interface to expose `generateKey()` and `getPublicKey()`.
- Align engine, bridge, and consuming code with the canonical crypto contract.
- Update specs if naming or result shapes change.

## Out of Scope

- changing native secure-storage policy
- crypto signing redesign

## Files to Modify

- `packages/mobile-sdk-alpha/src/types/**`
- related bridge adapter implementation files
- `specs/projects/sdk/workstreams/sdk-core/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**` unless contract alignment exposes a required follow-up

## Preconditions

- SC-01 should land first if ownership cleanup affects the same adapter files.

## Implementation Notes

- Maintain the existing trust boundary: key material remains native-managed.

## Validation

```bash
cd packages/mobile-sdk-alpha && npx tsc --noEmit
cd packages/mobile-sdk-alpha && npx vitest run
```

## Definition of Done

- [ ] Adapter interface exposes `generateKey()` and `getPublicKey()`
- [ ] Consumers compile against the updated interface
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created from remaining follow-up list.
