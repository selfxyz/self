# RSP-01 — Capabilities Handshake + WebView Flow Gating

> Last updated: 2026-07-20
> Status: Ready

- Workstream: rn-sdk-packaging
- Backlog IDs: RSP-01
- Owner: SDK / Platform
- Depends on: —

## Why

- With NFC/MRZ becoming optional native modules (RSP-03/04), the WebView must know which
  capabilities exist **before** routing the user, instead of dead-ending mid-flow when a bridge
  call rejects with `NOT_AVAILABLE`.
- Today `lifecycle.getConfig` (`packages/rn-sdk/src/handlers/LifecycleHandler.ts:36-43`) returns
  `{ mode, verificationRequest, debug, platform, referenceId }` — no capability information.
- Detection already exists per handler (lazy-load + `NOT_AVAILABLE`); this plan surfaces it at boot
  and lets the web app gate flow selection on it.

## Scope

- Extend `lifecycle.getConfig` to include a `capabilities: { nfc, mrzCamera, biometrics, secureStorage }`
  object (booleans), computed at handler-creation time from the same probes the handlers use.
- Bump the bridge protocol minor version in `packages/webview-bridge` and document the field.
- In `packages/webview-app`, consume `capabilities` from `OperatingModeProvider`/boot config and:
  - Filter document types that require an absent capability out of the pick-id-type / boot route
    (hide passport & ID-card capture when `nfc`/`mrzCamera` false; keep Aadhaar and
    disclose-against-existing-documents).
  - In `embed` mode, fail closed (existing `lifecycle.setResult({ success:false, error })` pattern in
    `decideBootRoute.ts`) when the inbound `VerificationRequest` can only be satisfied by an
    unavailable capability.
- Keep per-call `NOT_AVAILABLE` rejections as the runtime backstop.

## Out of Scope

- Building the optional native packages (RSP-03/04) or changing native module names (RSP-02).
- Any `secureStorage` host-injection work (advertise the capability only).

## Files to Modify

- `packages/rn-sdk/src/handlers/LifecycleHandler.ts` — add `capabilities` to `getConfig`; accept a capability probe in `LifecycleConfig`.
- `packages/rn-sdk/src/handlers/index.ts` — compute capabilities from the constructed handlers (reuse `CameraHandler.isAvailable`-style probes, `NfcHandler` supported check, keychain/biometrics lazy-load) and pass into `LifecycleHandler`.
- `packages/webview-bridge/src/schema.ts` (+ `types.ts`) — protocol version bump; `capabilities` type on the lifecycle config response.
- `packages/webview-app/src/providers/OperatingModeProvider.tsx` — read + expose `capabilities`.
- `packages/webview-app/src/components/decideBootRoute.ts` — gate boot route + embed fail-closed.
- `packages/webview-app/src/screens/onboarding/<pick-id-type screen>` — filter unavailable document types.

## Files Not to Modify

- `app/**`, `packages/mobile-sdk-alpha/**`, `self-sdk-native/**`

## Preconditions

- Handler probes are side-effect-free and safe to call at construction (verify `NfcHandler`/`CameraHandler` lazy-loads do not open hardware).

## Input / Output

**Input:**

```text
WebView boots and calls lifecycle.getConfig over the bridge.
```

**Output:**

```text
getConfig returns capabilities alongside mode/request. The web app hides capture flows whose
native capability is false, and embed mode fails closed for requests it cannot satisfy. A pre-
capabilities WebView build ignores the new field and behaves as before (treated as all-true).
```

## Validation

```bash
cd packages/rn-sdk && pnpm test && pnpm types && pnpm build
cd packages/webview-bridge && pnpm build && pnpm test
cd packages/webview-app && pnpm build
```

Expected:

- Unit test: `getConfig` returns `capabilities` reflecting which handler modules resolve; missing modules ⇒ `false`.
- Web app: with `nfc:false, mrzCamera:false`, passport/ID capture entry points are hidden and Aadhaar/disclose remain reachable; embed mode with an NFC-only request emits a fail-closed `setResult`.
- Backward compat test: config without `capabilities` is treated as all-true.

## Definition of Done

- [ ] `getConfig` returns `{ …, capabilities: { nfc, mrzCamera, biometrics, secureStorage } }`.
- [ ] Bridge protocol minor version bumped; `capabilities` documented in the schema.
- [ ] webview-app gates flow selection and embed fail-closed on capabilities.
- [ ] Missing `capabilities` field is treated as all-true (backward compat).
- [ ] rn-sdk, webview-bridge, webview-app all build/test/type-check clean.
- [ ] SPEC.md backlog status updated.

## Status Log

- 2026-07-20: Spec drafted.
