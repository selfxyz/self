# Handoff: Person 1-2-3 PR Review Reconciliation

> Branch: `feat/person1-2-3-implementation`
> Review date: 2026-02-19
> Scope: Documentation reconciliation against `origin/main..HEAD` and current codebase state.

## What This PR Delivers

- New bridge + WebView packages are implemented and present:
  - `@selfxyz/webview-bridge`
  - `@selfxyz/webview-app`
- Native shell expansion is implemented across KMP + Swift:
  - iOS provider + handler chain is present (beyond original 3-handler plan)
  - Android handler set remains focused on core native needs
- RN shell package is implemented:
  - `@selfxyz/rn-sdk` with component, router, handlers, asset strategy, tests, and a package handoff doc
- Integration sample package is implemented:
  - `@selfxyz/kmp-minipay-sample` with launch flow and result handling

## Package Inventory Added In This Branch

- `packages/webview-bridge/`
- `packages/webview-app/`
- `packages/self-sdk-swift/`
- `packages/rn-sdk/`
- `packages/kmp-minipay-sample/`

## Person 1 (WebView + Bridge)

### Delivered

- Bridge protocol, adapters, schema, mocks, and tests are implemented in `packages/webview-bridge/`.
- WebView app shell/screens/provider wiring are implemented in `packages/webview-app/`.

### Remaining / Follow-Up

- Correctness gap: fallback wiring consistency in `SelfClientProvider`:
  - haptic currently bridges native (`bridgeHapticAdapter`) instead of no-op fallback
  - crypto path is hybrid (`hash` via Web Crypto + `sign` via native bridge)
- Dynamic proving request values remain hardcoded and should be sourced/configured by request context.

## Person 2 (Native Shells)

### Delivered

- iOS chain (2G-2K scope) is implemented with handler/provider registration in KMP + Swift package.
- Android shell + handlers remain implemented and integrated.

### Remaining / Follow-Up

- **iOS lifecycle flat payload bug (P1):** `LifecycleBridgeHandler.kt` requires both `success` and `data` fields to classify a result as success, but WebView sends flat payloads like `{ type: 'proofRequested' }`. All iOS completion callbacks are misclassified as cancellations. See `packages/webview-app/src/screens/proving/ProvingScreen.tsx` and `.../ConfirmIdentificationScreen.tsx` for the call sites.
- **iOS lifecycle race condition:** `dismiss()` and `setResult()` in `LifecycleBridgeHandler.kt` share `pendingCallback` and `dismissAction` on `Dispatchers.Default` (thread pool) with no synchronization. Concurrent invocation can double-fire callbacks. Fix: route to `Dispatchers.Main` or protect with `Mutex`.
- **iOS dev server port mismatch:** `WebViewProviderImpl.swift` hardcodes `localhost:3000` for debug builds, but Vite dev server runs on `5173` (matching Android). Minor — dev-only.
- Public API finalization and validation remain partially open:
  - cross-platform behavior alignment and explicit platform contract documentation
  - device-level validation coverage and integration hardening
- iOS handler scope expanded beyond initial plan; this needs explicit architectural sign-off.

## Person 3 (Integrations)

### Delivered

- MiniPay sample project scaffold exists and wires verification launch + result flow.

### Remaining / Follow-Up

- End-to-end physical device validation is still required (especially NFC path and failure modes).
- Integration polish/error handling should be validated against real SDK outcomes, not only scaffolding.

## Person 4 (SDK Core)

### Delivered

- Browser/web fallback adapter implementations are present.
- Browser entry and exports are in place and consumed by WebView-oriented clients.

### Remaining / Follow-Up

- Ownership consolidation decision is needed for duplicated web fallback adapters:
  - `packages/webview-bridge/src/adapters/`
  - `packages/mobile-sdk-alpha/src/adapters/browser/`

## Person 5 (RN SDK) Reconciliation

Source reconciled from: `packages/rn-sdk/HANDOFF.md`

### Implemented (confirmed)

- `SelfVerification` component and `MessageRouter`
- Biometric, keychain, lifecycle handlers
- NFC handler
- Asset loading paths and `devServerUrl` override
- Test coverage for handlers/router/asset-loading behavior

### Carry-Forward Risks / Gaps

- **Asset paths break production WebView (P1):** `rn-sdk/assets/self-wallet/index.html` uses absolute paths (`src="/assets/..."`) that resolve to `file:///assets/...` on device instead of the bundle directory. Fix: add `base: './'` to `packages/webview-app/vite.config.ts` and rebuild.
- NFC spec deviation:
  - current return is tag metadata flow, not raw APDU exchange path
- Camera/MRZ:
  - `scanMRZ` is still `NOT_IMPLEMENTED`
- Both NFC and Camera/MRZ should be prioritized before broad production rollout.

## Cross-Workstream Findings

- Duplicate fallback adapters exist in both bridge and core packages; consolidation is required.
- Person 1 fallback wiring is inconsistent with intended web-first model (haptic + crypto behavior).
- iOS handler scope expanded (9 handlers) while Android keeps web fallbacks for those domains, creating platform asymmetry that needs explicit decision and documentation.
- `WAVE-PLAN` aggregate status values were stale and need replacement with reconciled counts.
- **`structuredClone` compat:** `documents-web.ts` calls `structuredClone()` which is unavailable on Safari 15.0–15.3 / iOS 15.0–15.3 WKWebView. Vite build target is `safari15`. Either bump target to `safari15.4` or add a `JSON.parse(JSON.stringify())` fallback.
- **Font-family name drift:** `webview-app/src/fonts.css` introduces new font names, but `mobile-sdk-alpha/src/constants/fonts.ts`, `app/tamagui.config.ts`, and `app/web/fonts.css` still reference old names (`Advercase-Regular`, `DINOT-Bold`, etc.). Affected code silently falls back to system fonts.

## Stale / Descoped / Superseded Items

- 2D/2E are superseded by 2G-2K implementation path.
- 4D remains optional/skipped.
- 2L remains deferred (Phase 2).

## Suggested Follow-Up PR Order

1. **Fix runtime-breaking bugs:**
   - iOS lifecycle flat payload misclassification (all completions fire as cancellations)
   - iOS lifecycle race condition (`dismiss`/`setResult` concurrency)
   - RN SDK absolute asset paths (production WebView load failure)
2. **Resolve correctness gaps impacting runtime consistency:**
   - Person 1 fallback wiring (haptic + crypto) and adapter ownership decision
   - `structuredClone` Safari 15.0–15.3 compat in `documents-web.ts`
3. **Resolve high-risk native capability gaps:**
   - RN SDK NFC/APDU path and Camera/MRZ implementation decision
4. **Resolve platform policy and API consistency:**
   - iOS/Android handler asymmetry documentation + API contract finalization
   - Font-family name alignment across webview-app, mobile-sdk-alpha, and app
   - iOS dev server port alignment (`3000` → `5173`)
5. **Complete validation and integration hardening:**
   - Device E2E coverage for MiniPay and cross-platform verification outcomes
