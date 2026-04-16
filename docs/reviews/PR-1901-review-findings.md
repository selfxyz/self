# PR #1901 Review Findings

**PR:** Stitch tunnel flow screens with proving machine, recovery, and disclose
**Branch:** `justin/debug-stitch-screens-build-issues`
**Reviewed:** 2026-04-01

This document reflects the substantive GitHub PR comments on PR #1901.
It intentionally excludes low-signal review noise such as PR title, PR description, docstring coverage, and bot/meta comments.

---

## Critical

### 1. Remote WebView loading in production without integrity checks

**Files:** `AndroidWebViewHost.kt:96,116,180` · `SelfWebViewHost.swift:49-55`

Non-debug builds now load from `https://self-app-alpha.vercel.app/` by default. The WebView still exposes the native bridge (`SelfNativeAndroid`), so a remote alpha deployment becomes privileged app code. A compromise or XSS on that host can drive the native bridge, camera/mic prompts inside host apps. iOS has no local/bundled fallback — offline devices fail at startup.

**Fix:** Keep bundled `appassets` as the default entrypoint. Gate remote content behind an explicit environment flag and integrity check. Add offline fallback on iOS.

---

### 2. `null` selected document takes the success path in recovery

**File:** `SecretPhraseInputScreen.tsx:183-197`

`loadSelectedDocument()` returning `null` collapses into the same branch as a mock document. That branch calls `restoreSecretFromMnemonic()` and routes to `/tunnel/kyc`, so a missing/unreadable document context overwrites `self_mnemonic` and `self_private_key` without any identity match check.

**Fix:** Explicitly handle `null` as an error state. Do not proceed with secret restoration when the document cannot be loaded.

---

### 3. Register phase can be skipped on stale `"completed"` state

**File:** `TunnelProvingScreen.tsx:107-117`

Lines 107-114 switch `phase` to `'register'` but keep `initDone` true. On next render, `currentState` can still be `"completed"`, so lines 115-117 immediately route to `/tunnel/proof/disclose` before `init(client, 'register', true)` has produced a fresh register state.

**Fix:** Reset `initDone` (or the relevant gate) when switching phase to `'register'`, so the completed-state redirect doesn't fire before the new init resolves.

---

### 4. `setResult` lifecycle handler breaks backwards compatibility

**File:** `LifecycleHandler.kt:44-47` · `LifecycleHandler.swift:33-38`

Android now passes the full lifecycle envelope to `EXTRA_RESULT_DATA` instead of the verification payload. Missing `success` field returns `RESULT_OK`. A legacy or malformed bridge payload comes back as `RESULT_OK` with a JSON shape the host app can't parse. iOS similarly passes the full envelope to `onResult` instead of the verification payload.

**Fix:** Extract `result` from the envelope before passing to `EXTRA_RESULT_DATA` / `onResult`. Treat missing `success` as `false` (fail closed). Support both payload shapes for backwards compatibility.

---

## Major

### 5. Document finalization is half-transactional

**File:** `recoveryValidation.ts:26-35`

If `reStorePassportDataWithRightCSCA()` succeeds and `markCurrentDocumentAsRegistered()` throws, the caller only rolls back secret storage. The selected document has already been mutated, so retries run against a partially finalized document.

**Fix:** Either make the two operations atomic, or roll back the document state on failure.

---

### 6. In-flight recovery navigates after unmount

**File:** `SecretPhraseInputScreen.tsx:197,249-268`

`isMountedRef` only protects `setState` calls. If the user backs out during validation/finalization, `navigate(...)` still fires from the stale request, yanking them onto another route.

**Fix:** Gate `navigate()` calls behind the `isMountedRef` check as well.

---

### 7. No error handling on TourScreen final step

**File:** `TourScreen.tsx:37`

If `loadSelectedDocument(client)` rejects, `onNext` aborts and the user is stuck on the last tour screen with no recovery path.

**Fix:** Wrap in try/catch, fall through to `/tunnel/kyc` on failure.

---

### 8. PII logged in TourScreen

**File:** `TourScreen.tsx:29`

`console.log('selected Doc', selectedDoc)` logs the full document payload, which can include passport/KYC PII.

**Fix:** Remove the log statement.

---

### 9. Secret snapshot reads are not atomic

**File:** `secretManager.ts:81`

`readStoredSecretSnapshot()` runs two `get()` calls outside `secretLock`. A concurrent write can interleave, producing a mnemonic/private-key pair that never existed together.

**Fix:** Run the read under `withSecretLock()`.

---

### 10. Snapshot restore is not failure-atomic

**File:** `secretManager.ts:108-122`

Two sequential writes with no rollback. If the mnemonic write succeeds and the private-key write fails, storage is left half-restored and mismatched.

**Fix:** Capture the previous snapshot before writing. On failure, restore the previous values.

---

### 11. Hardcoded zero insets instead of `WEB_SAFE_AREA`

**File:** `ProviderLaunchScreen.tsx:297`

`KycPendingScreen` receives `{ top: 0, bottom: 0 }` instead of `WEB_SAFE_AREA`, causing potential safe-area overlap/clipping on some devices.

**Fix:** Import and use `WEB_SAFE_AREA` from `src/utils/insets.ts`.

---

## Additional PR Comment Review

- Reviewed the current PR comments on `selfxyz/self#1901`.
- No additional non-pedantic findings need to be added beyond the items above.
- The inline CodeRabbit comments about iOS legacy `setResult` compatibility and secret snapshot restore atomicity are already covered by findings 4 and 10.
