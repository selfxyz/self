# RSP-02 — Unify NFC Native-Module Name Lookup

> Last updated: 2026-07-20
> Status: Ready

- Workstream: rn-sdk-packaging
- Backlog IDs: RSP-02
- Owner: SDK / Platform
- Depends on: —

## Why

- The optional NFC package (RSP-04) will register a single SDK-owned native module name,
  `SelfPassportReader`, on both platforms.
- `NfcHandler` currently resolves only the app's / third-party names: `NativeModules.RNPassportReader`
  (Android, `scan(options)`) and `NativeModules.PassportReader` (iOS, `scanPassport(...)`)
  — see `packages/rn-sdk/src/handlers/NfcHandler.ts:282-345`.
- `CameraHandler` already models the desired pattern: `SelfMRZScannerModule ?? MRZScannerModule`
  (`packages/rn-sdk/src/handlers/CameraHandler.ts:24-26`). Mirror it for NFC so the SDK package is
  preferred while `app/` keeps working through the legacy fallbacks.

## Scope

- In `loadPassportReader()` (`NfcHandler.ts`), prefer `NativeModules.SelfPassportReader` first, then
  fall back to the existing platform names:
  - Android: `SelfPassportReader.scan(options)` → else `RNPassportReader.scan(options)`.
  - iOS: `SelfPassportReader.scanPassport(...)` → else `PassportReader.scanPassport(...)`.
- Keep the existing option-mapping / positional-arg adapter logic unchanged; only the module
  resolution order changes.
- Add unit coverage asserting precedence (Self module wins when both present) and fallback.

## Out of Scope

- Building the `SelfPassportReader` native module (RSP-04).
- Capabilities advertising (RSP-01) — though the same probe is reused there.

## Files to Modify

- `packages/rn-sdk/src/handlers/NfcHandler.ts` — `loadPassportReader()` resolution order.
- `packages/rn-sdk/src/handlers/__tests__/` — precedence + fallback tests (mock `NativeModules`).

## Files Not to Modify

- `app/**` — must not need changes; the app's `PassportReader`/`RNPassportReader` remain valid fallbacks.

## Preconditions

- RSP-04 will expose `SelfPassportReader` with an API shape matching one of the two existing
  signatures (`scan(options)` on Android, positional `scanPassport` on iOS). This spec assumes that
  contract and must stay in sync with RSP-04.

## Input / Output

**Input:**

```text
NfcHandler resolves a passport-reader native module at scan time.
```

**Output:**

```text
When SelfPassportReader is present it is used; otherwise the legacy app/third-party module is used.
No behavior change for hosts that only have the legacy module (the RN app).
```

## Validation

```bash
cd packages/rn-sdk && pnpm test && pnpm types
```

Expected:

- New tests pass: `SelfPassportReader` preferred when both registered; legacy used when only it exists; `NOT_AVAILABLE` when neither.
- Existing NfcHandler tests still pass.

## Definition of Done

- [ ] `loadPassportReader()` prefers `SelfPassportReader`, falls back to legacy names per platform.
- [ ] Precedence/fallback unit tests added and passing.
- [ ] No `app/` changes required.
- [ ] SPEC.md backlog status updated.

## Status Log

- 2026-07-20: Spec drafted.
