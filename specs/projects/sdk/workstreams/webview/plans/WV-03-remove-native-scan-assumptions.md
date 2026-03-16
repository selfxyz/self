# Remove Native Scan Assumptions

> Last updated: 2026-03-11
> Status: Done

- Workstream: webview
- Backlog IDs: WV-03
- Owner: WebView / Product Platform
- Branch: `justin/kmp-wv-02`
- PR: TBD

## Why

- The active WebView client path now delegates capture/KYC to a provider, but `packages/webview-app/` still routes users through Self-managed camera and NFC screens.
- `WV-02` defined the provider-owned boundary; `WV-03` aligns the active UI, routing, and adapter wiring with that contract.
- This change must stay local to `packages/webview-app/` so the RN app and `mobile-sdk-alpha` native-scan exports remain intact.

## Scope

- Remove WebView app routes and imports for `DocumentCameraScreen` and `DocumentNFCScreen`.
- Redirect document selection to a provider placeholder route instead of `/onboarding/camera`.
- Create a minimal provider placeholder screen that represents the upcoming provider launch handoff.
- Remove unused NFC/camera adapter consumption from `SelfClientProvider`.
- Update active WebView spec status/checklist after implementation.

## Out of Scope

- Implementing an actual provider SDK or hosted flow
- Modifying `packages/mobile-sdk-alpha/` exports or any RN app dependencies
- Changing paused native specs or native/KMP packages

## Files to Modify

- `specs/projects/sdk/workstreams/webview/SPEC.md`
- `specs/projects/sdk/workstreams/webview/plans/WV-03-remove-native-scan-assumptions.md`
- `packages/webview-app/src/App.tsx`
- `packages/webview-app/src/providers/SelfClientProvider.tsx`
- `packages/webview-app/src/screens/onboarding/IDSelectionScreen.tsx`
- `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx`
- `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx`
- `packages/webview-app/src/utils/countryFlags.tsx`

## Files Not to Modify

- `packages/mobile-sdk-alpha/**`
- `packages/kmp-sdk/**`
- `specs/projects/sdk/paused/**`
- `noir/**`

## Preconditions

- `WV-02` provider contract is complete and is the source of truth for provider-backed capture.
- `packages/webview-app/` is the only workspace that should stop consuming the camera/NFC scan adapters.

## Input / Output

**Input:**

```text
User selects a document type from /onboarding/id-type in the WebView app.
```

**Output:**

```text
The app navigates to a provider placeholder route instead of Self-managed camera/NFC screens, and no native scan route or adapter usage remains in webview-app/src/.
```

## Validation

```bash
cd packages/webview-app && yarn build
cd packages/mobile-sdk-alpha && yarn test && yarn types
rg -n "DocumentCameraScreen|DocumentNFCScreen|scanMRZ|scanNFC" packages/webview-app/src/
```

Expected result:

- `webview-app` builds cleanly
- `mobile-sdk-alpha` tests and types still pass
- `rg` returns zero matches in `packages/webview-app/src/`

## Definition of Done

- [x] `DocumentCameraScreen.tsx` and `DocumentNFCScreen.tsx` are deleted from `webview-app`
- [x] `/onboarding/camera` and `/onboarding/nfc` routes are removed from `App.tsx`
- [x] `IDSelectionScreen` navigates to a provider placeholder route
- [x] `SelfClientProvider` no longer exposes unused NFC/camera adapters
- [x] No `scanMRZ` or `scanNFC` references remain in `packages/webview-app/src/`
- [x] `webview-app` build passes
- [x] `mobile-sdk-alpha` tests and types pass
- [x] `SPEC.md` backlog/checklist reflects completion

## Status Log

- 2026-03-11: Replaced the WebView camera/NFC onboarding path with a provider placeholder route, removed the native scan screens and adapter usage from `webview-app`, and validated that `mobile-sdk-alpha` still passes tests and type-checking.
