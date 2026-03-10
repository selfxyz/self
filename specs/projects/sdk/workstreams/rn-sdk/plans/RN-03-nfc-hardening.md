# RN NFC Handler Hardening

> Last updated: 2026-03-10
> Status: Ready

- Workstream: rn-sdk
- Backlog IDs: RN-03
- Owner: RN SDK
- Branch: TBD
- PR: TBD

## Why

- The RN NFC handler still carries the main open security hardening items: APDU validation, timeout handling, and sensitive-payload minimization.
- These should be tracked as one focused hardening stream rather than a topic-only checklist.

## Scope

- Add APDU allowlisting.
- Add iOS transceive timeout handling.
- Redact sensitive error data.
- Review and minimize NFC return payload exposure.

## Out of Scope

- KMP-side allowlist work
- broader bridge redesign

## Files to Modify

- `packages/rn-sdk/src/handlers/NfcHandler.ts`
- `packages/rn-sdk/HANDOFF.md`
- related RN SDK tests
- `specs/projects/sdk/workstreams/rn-sdk/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**`

## Preconditions

- Existing bridge request and response contracts remain compatible unless explicitly versioned.

## Validation

```bash
cd packages/rn-sdk && npx vitest run
```

## Definition of Done

- [ ] APDU validation added
- [ ] Timeout handling added
- [ ] Sensitive payload/error exposure reviewed and reduced
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec cleanup.
