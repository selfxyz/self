# External MRZ/NFC Source Inventory and Owner Handoff

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-consolidation
- Backlog IDs: NC-06
- Owner: SDK Platform for documentation, Seshanth for MRZ/NFC consolidation implementation
- Branch: TBD
- PR: TBD

## Why

- Local wrapper consolidation is no longer the main unknown.
- Remaining MRZ/NFC risk is that source-of-truth logic still spans external repos and checked-out mirrors.
- Phase 3 and Phase 4 should not delete code based only on repo-local evidence.
- The purpose of this plan is to support Seshanth's track, not to replace or absorb it.

## Scope

- Inventory MRZ and NFC logic that lives outside the local `app/ios` and `packages/mobile-sdk-alpha/ios/SelfSDK` wrappers.
- Record which repo currently owns each behavior: OCR/parsing, camera UX state mapping, MRZ-key derivation, NFC BAC/PACE flow, certificate serialization, analytics/session hooks.
- Update `SPEC.md` and `CONTRACTS.md` with explicit ownership notes and any new constraints.
- Preserve a clear boundary: this plan does not execute consolidation changes that belong to Seshanth.

## Out of Scope

- Rewriting the external repos
- Deleting local wrappers
- Changing bridge contracts

## Files to Modify

- `specs/projects/sdk/paused/native-consolidation/SPEC.md`
- `specs/projects/sdk/paused/native-consolidation/CONTRACTS.md`
- optional handoff notes if a follow-up spec is needed

## Files Not to Modify

- `app/ios/**`
- `packages/mobile-sdk-alpha/ios/SelfSDK/**`
- external repo runtime code unless this plan is replaced by an implementation PR

## Preconditions

- NC-03 is done and the current local parity state is documented.

## Implementation Notes

- Treat `selfxyz/NFCPassportReader` as an external dependency even if only referenced indirectly in this repo.
- Use the checked-out mirror at `app/android/android-passport-nfc-reader` as the local evidence source for Android external logic.
- If ownership is still ambiguous after the inventory, document the ambiguity and block deletion work instead of guessing.
- If Seshanth provides a completed consolidation plan or merged implementation later, update this spec to reference that work instead of creating a parallel local plan.

## Validation

```bash
git -C app/android/android-passport-nfc-reader rev-parse --short HEAD
rg -n "MRZ|mrz|BAC|PACE|PassportReader|NFC" app/android/android-passport-nfc-reader app/android/react-native-passport-reader packages/self-sdk-swift
```

## Definition of Done

- [ ] External MRZ/NFC logic inventory is captured in `SPEC.md`
- [ ] Cross-repo ownership assumptions are explicit
- [ ] NC-04 and NC-05 dependencies reflect the inventory result

## Status Log

- 2026-03-10: Created after local MRZ consolidation merged and MRZ/NFC ownership shifted to a separate cross-repo track.
- 2026-03-10: Updated to make the handoff explicit: this plan supports Seshanth's consolidation work and should not compete with it.
