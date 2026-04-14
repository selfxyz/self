# Native Hardware Handlers — Spike Findings

> Last updated: 2026-04-13
> Owner: SDK / Platform
> Linear: SELF-2614
> Status: Spike (feasibility assessment)

## Question

Is it feasible to bring NFC passport reading, MRZ/passport OCR scanning, and camera capture into the webview SDK's native shells as bridge handlers — and what does the work look like?

## Answer: Yes — most of the work already exists

The KMP SDK (`packages/kmp-sdk/`) already contains **bridge handler implementations with shared-parser test coverage** for both NFC and Camera/MRZ on both platforms (handler-level integration tests do not exist — `NfcApduPolicy` and `MrzParser` are tested, but `NfcBridgeHandler` and `CameraMrzBridgeHandler` are not directly tested). These were stripped from handler registration during KMP Revival (SELF-2488) but the code was explicitly retained. The TypeScript bridge layer also already defines the domains, methods, adapters, and types.

The work is a **port**, not a greenfield build.

---

## Inventory

### What already exists

#### TypeScript (bridge protocol + adapters) — DONE

| Layer                     | File                                               | Status                                         |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Bridge domain enum        | `webview-bridge/src/types.ts:14-24`                | `nfc` and `camera` already in `BridgeDomain`   |
| NFC method types          | `webview-bridge/src/types.ts:91-93`                | `'scan' \| 'cancelScan' \| 'isSupported'`      |
| NFC params/events         | `webview-bridge/src/types.ts:95-113`               | `NfcScanParams`, `NfcScanProgress`, `NfcEvent` |
| NFC bridge adapter        | `webview-bridge/src/adapters/nfc-scanner.ts`       | Full impl with abort signal, 120s timeout      |
| NFC progress subscription | `webview-bridge/src/adapters/nfc-scanner.ts:43-45` | `onNfcProgress()`                              |
| Camera method types       | `webview-bridge/src/types.ts:72`                   | `'scanMRZ' \| 'isAvailable'`                   |
| Camera bridge adapter     | `webview-bridge/src/adapters/camera.ts`            | Full impl with `MrzScanParams`/`MrzScanResult` |
| SDK NFC adapter interface | `mobile-sdk-alpha/src/types/public.ts:339-341`     | `NFCScannerAdapter`                            |
| SDK NFC types             | `mobile-sdk-alpha/src/types/public.ts:315-332`     | `NFCScanOpts`, `NFCScanResult`                 |

#### Native domain enums — DONE

Both native shells already have `nfc` and `camera` in their `BridgeDomain` enums:

- Android: `native-shell-android/.../bridge/BridgeModels.kt:12-42`
- iOS: `native-shell-ios/.../Bridge/BridgeModels.swift:5-16`

#### KMP handler implementations — EXISTS, needs porting

| Handler    | Platform | File                                                    | LOC  | Dependencies                               |
| ---------- | -------- | ------------------------------------------------------- | ---- | ------------------------------------------ |
| NFC        | Android  | `kmp-sdk/.../androidMain/.../NfcBridgeHandler.kt`       | ~498 | jMRTD, BouncyCastle, SCUBA                 |
| NFC        | iOS      | `kmp-sdk/.../iosMain/.../NfcBridgeHandler.kt`           | ~114 | Delegates to `NfcProvider` interface       |
| Camera/MRZ | Android  | `kmp-sdk/.../androidMain/.../CameraMrzBridgeHandler.kt` | ~247 | CameraX, ML Kit Text Recognition           |
| Camera/MRZ | iOS      | `kmp-sdk/.../iosMain/.../CameraMrzBridgeHandler.kt`     | ~82  | Delegates to `CameraMrzProvider` interface |

Supporting KMP code:

- `NfcApduPolicy` — parameter validation (commonMain)
- `NfcScanParams`, `NfcScanProgress`, `NfcScanState` — models (commonMain)
- `MrzParser` — shared MRZ extraction + parsing (commonMain)
- `NfcProvider` interface — iOS NFC delegation (iosMain)
- `IosProviderRegistry` — iOS provider registry (iosMain)

#### Existing Swift references already in this repo — EXISTS, reusable

The iOS side is not a greenfield protocol implementation. The repo already contains working Swift-side helpers/providers that can be adapted into native-shell reference providers:

| Reference                     | File                                                                                 | LOC       | Notes                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------- |
| NFC helper                    | `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/NfcPassportHelper.swift`       | 265       | Wraps `NFCPassportReader`, exposes progress + JSON result       |
| NFC provider                  | `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/NfcProviderImpl.swift`       | 67        | Thin `NfcProvider` wrapper around helper                        |
| MRZ helper                    | `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/MrzCameraHelper.swift`         | 329       | AVFoundation + Vision preview + OCR                             |
| MRZ provider                  | `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/CameraMrzProviderImpl.swift` | 63        | Thin `CameraMrzProvider` wrapper around helper                  |
| App-side passport reader refs | `app/ios/PassportReader.swift`, `app/ios/PassportReaderCore.swift`                   | 490 total | Existing wallet implementation using the forked passport reader |

The React Native app and Swift package already prove the underlying iOS NFC/camera workflows work in this repo. The shell work is primarily packaging, adaptation, and bridge registration.

### What does NOT exist

- **Native shell NFC handlers** — `native-shell-android` and `native-shell-ios` have no `NfcHandler` or `CameraHandler`. Only `SecureStorageHandler`, `CryptoHandler`, `LifecycleHandler` are registered.
- **Handler registration** — `SelfVerificationActivity.kt:67-69` and `SelfSdk.swift:61-63` only register the 3 current domains.
- **Native dependencies** — Native shells have minimal deps (appcompat, webkit, kotlinx-serialization on Android; zero external deps on iOS). NFC/camera will add significant dependencies.

---

## Feasibility by Module

### NFC Passport Reading

**Verdict: Feasible. Full reference implementation exists in KMP.**

The KMP Android handler (`NfcBridgeHandler.kt`, 498 lines) is a complete ICAO 9303 passport reader:

- PACE authentication with CAN/MRZ key
- BAC fallback with retry logic
- Chip Authentication via DG14
- DG1 (MRZ) + SOD (security object) extraction
- Progress events pushed via `router.pushEvent()`
- Full result with MRZ, certificates, digests, data group hashes

**Android approach:** Port the KMP handler directly. It uses `NfcAdapter.enableReaderMode()` which requires an `Activity` reference — `SelfVerificationActivity` already is one.

**iOS approach:** The KMP iOS handler delegates to a `NfcProvider` interface. The native shell should do the same. iOS NFC passport reading requires CoreNFC with `NFCTagReaderSession` (ISO 7816). Apple restricts this to apps with the `com.apple.developer.nfc.readersession.formats` entitlement. The SDK consumer's app must have this entitlement — the shell cannot add it.

**Key constraint (iOS):** CoreNFC requires the consumer's app to have NFC entitlements + Info.plist keys. The SDK must document this requirement and fail gracefully if not configured.

**Dependencies added:**

| Platform | Library                           | Purpose                     | Size impact  |
| -------- | --------------------------------- | --------------------------- | ------------ |
| Android  | `org.jmrtd:jmrtd`                 | ICAO 9303 passport protocol | ~400KB       |
| Android  | `org.bouncycastle:bcprov-jdk18on` | Crypto for BAC/PACE         | ~6MB         |
| Android  | `net.sf.scuba:scuba-smartcards`   | Smart card abstraction      | ~100KB       |
| Android  | `commons-io:commons-io`           | IO utilities                | ~300KB       |
| iOS      | CoreNFC (system framework)        | NFC tag reading             | 0 (built-in) |
| iOS      | CryptoKit (system framework)      | BAC/PACE crypto             | 0 (built-in) |

**Android binary size impact:** ~7MB added to AAR (primarily BouncyCastle). This is significant given the shells are currently lightweight. Consider: ProGuard/R8 shrinking can reduce BouncyCastle substantially since only a subset of crypto is used.

**iOS binary size impact:** Negligible — uses system frameworks plus the existing passport-reader dependency pattern already used elsewhere in this repo. The missing work is wiring that existing Swift reference path into a native-shell-friendly provider surface.

### MRZ/OCR Camera Scanning

**Verdict: Feasible. Full reference implementation exists in KMP.**

The KMP Android handler (`CameraMrzBridgeHandler.kt`, 247 lines) uses CameraX + ML Kit:

- Opens camera via `ProcessCameraProvider`
- Runs `TextRecognition` on each frame
- Detects MRZ lines using regex (TD3: 2×44 chars, TD1: 3×30 chars)
- Parses detected MRZ and returns structured JSON
- Progress reporting via `MrzDetectionState`

**Android approach:** Port the KMP handler. Requires `Activity` (already available) and `LifecycleOwner` (Activity implements it). CameraX handles permissions, but the WebView needs to delegate camera permission requests — `SelfVerificationActivity` already handles `onRequestPermissionsResult`.

**iOS approach:** Delegate to provider interface (same pattern as KMP iOS). Consumer provides a `CameraMrzProvider` that wraps `AVCaptureSession` + `VNRecognizeTextRequest` (Vision framework). Alternatively, embed the implementation using system frameworks.

**Interaction model:** MRZ scanning requires a native preview surface. The shell will keep the existing request/response bridge contract and add a temporary native overlay above the WebView:

- `camera.scanMRZ()` presents a native full-screen/modal camera overlay from the shell container (`Activity` on Android, modal view controller on iOS).
- The WebView remains mounted underneath. JS keeps a pending bridge promise; there is no frame streaming through the bridge and no WebView reload.
- Progress continues through `router.pushEvent()` while the scan is active.
- The request resolves when the overlay returns a parsed MRZ result, and rejects on user cancel / timeout / permission failure.
- Dismissing the overlay is the end of the interaction; the shell returns to the same WebView state it had before the scan started.

This matches the KMP Android `scanMrzWithPreview()` behavior and keeps native UI concerns out of the web layer.

**Dependencies added:**

| Platform | Library                             | Purpose                   | Size impact           |
| -------- | ----------------------------------- | ------------------------- | --------------------- |
| Android  | `androidx.camera:camera-*`          | CameraX for camera access | ~2MB                  |
| Android  | `com.google.mlkit:text-recognition` | On-device OCR             | ~18MB (bundled model) |
| iOS      | AVFoundation (system)               | Camera capture            | 0                     |
| iOS      | Vision (system)                     | Text recognition          | 0                     |

**Android binary size impact:** ~20MB — primarily the ML Kit text recognition model. This is the largest concern. Mitigation: use `com.google.mlkit:text-recognition` with the thin (unbundled) model variant which downloads on first use (~3MB APK impact, ~18MB download on first use).

**iOS binary size impact:** Negligible — uses system frameworks only.

### Camera (generic capture)

**Verdict: Not needed as a separate handler.** QR scanning uses the WebView's built-in camera access (`getUserMedia`). Document photo capture (if needed) can use the same `camera` bridge domain with a new method. No separate "camera" module is required beyond what MRZ scanning already provides.

---

## Architecture Decisions

### Implementation split

**Decision: Use provider delegation for iOS, embedded implementation for Android.**

> **⚠️ Invariant override:** This decision intentionally departs from the current "native shells are thin wrappers with no business logic in Kotlin/Swift" rule (CLAUDE.md:26) and the native-shells-lite SPEC.md which marks NFC/camera out of scope. NFC passport reading and camera MRZ scanning require platform APIs (`NfcAdapter.enableReaderMode`, CameraX, ML Kit) that cannot run in the WebView — these are legitimate exceptions to the thin-wrapper rule. If this spike is greenlit, the following docs must be updated to reflect the exception:
>
> - `CLAUDE.md` — add a carve-out for hardware-access handlers (NFC, camera) that require platform APIs unavailable to WebView
> - `specs/projects/sdk/workstreams/native-shells-lite/SPEC.md` — remove NFC/camera from out-of-scope or note they moved to this workstream
> - `specs/projects/sdk/OVERVIEW.md` — update the native-shell architecture section if it references the thin-wrapper invariant

Rationale:

- **Android:** The KMP handler is a self-contained implementation using standard Android APIs (`NfcAdapter`, CameraX, ML Kit). No consumer-specific configuration needed beyond NFC hardware availability. Embedding keeps integration simple — one dependency, it works. This is not "business logic in native" — it is hardware-access code that physically cannot run in JavaScript.
- **iOS:** CoreNFC requires app-level entitlements that the SDK cannot add. The consumer must configure NFC in their Xcode project. A provider interface lets consumers wire in their own implementation (or use a reference implementation we publish separately). This matches the existing KMP iOS pattern.

This means:

- Android native shell handlers contain the full NFC/camera logic (ported from KMP)
- iOS native shell handlers delegate to provider interfaces (matching KMP iOS pattern)
- SDK consumers on iOS must supply providers (or use a reference impl package)

### Capability detection semantics

**Decision: `isSupported` / `isAvailable` report runtime hardware availability, not full end-to-end success guarantees.**

- `nfc.isSupported`
  - Android: `true` only on physical devices with NFC hardware/adapter available for reader mode.
  - iOS: `true` only when `NFCReaderSession.readingAvailable` is `true` on a physical device.
  - Simulator / no hardware: `false`.
  - Missing iOS entitlement / Info.plist configuration: not reliably detectable up front, so `isSupported` may still be `true`; `scan` must then fail with a clear configuration error instead of hanging or crashing.
- `camera.isAvailable`
  - `true` when a camera device exists and the shell can attempt to present a preview.
  - `false` on simulators or devices with no usable camera.
  - Permission is not part of this preflight check; `scanMRZ` is responsible for requesting permission and surfacing a clear denial/cancel error if access is unavailable.

This keeps the adapter contract predictable for WebView UI: preflight checks gate obvious unsupported devices, and operation-specific failures remain explicit runtime errors.

### KMP parity

**Decision: Do not re-register the KMP NFC/camera handlers in this workstream.**

Rationale:

- SELF-2488 intentionally reduced the KMP runtime surface.
- This spike is scoped to native-shell bridge parity, not to broadening the KMP artifact again.
- Re-enabling KMP handlers is easy later if product scope changes, but doing it here would silently expand footprint and support expectations across another distribution channel.

---

## Rough Sizing

| Chunk                           | Platform | Est. LOC   | Dependencies added                                |
| ------------------------------- | -------- | ---------- | ------------------------------------------------- |
| NFC handler                     | Android  | ~550       | jMRTD, BouncyCastle, SCUBA                        |
| NFC handler                     | iOS      | ~150       | None (provider interface)                         |
| Camera/MRZ handler              | Android  | ~300       | CameraX, ML Kit                                   |
| Camera/MRZ handler              | iOS      | ~100       | None (provider interface)                         |
| Handler registration            | Both     | ~50        | None                                              |
| Tests                           | Both     | ~400       | Test fixtures                                     |
| iOS reference provider (NFC)    | iOS      | ~350       | CoreNFC / existing Swift helper path              |
| iOS reference provider (Camera) | iOS      | ~400       | AVFoundation, Vision / existing Swift helper path |
| **Total**                       |          | **~2,300** |                                                   |

This is small enough for one large PR, but the cleaner execution plan is **3 PR-sized chunks**:

1. NFC handlers and registration (Android embedded + iOS provider contract) — ~1.1k LOC
2. Camera/MRZ handlers and native overlay presentation — ~850 LOC
3. iOS reference providers + consumer docs/validation fixtures — ~700 LOC

The iOS reference provider estimate is based on adapting code that already exists in `packages/self-sdk-swift`, not on writing a brand-new ICAO/CoreNFC implementation from scratch.

---

## Risks and Open Questions

1. **Android binary size** — NFC adds ~7MB (BouncyCastle), Camera/MRZ adds ~20MB (ML Kit). Total ~27MB. The native shells were designed to be lightweight after SD-01/SD-02 removed bundled WebView assets. This is the main tradeoff behind the Android embedded decision and needs explicit acceptance before implementation starts.

2. **ML Kit bundled vs. unbundled** — Bundled model (~18MB in APK) vs. unbundled (download on first use). Unbundled reduces APK size but adds a first-run download + failure mode.

3. **iOS NFC entitlement/configuration** — Consumer's app MUST have NFC entitlements and the required Info.plist configuration. The shell should not guess at startup; it should fail `scan` with a clear configuration error when the app is misconfigured.

4. **Overlay lifecycle correctness** — The interaction model is defined, but the shell still needs clean presentation/dismissal, cancellation, timeout, and rotation/backgrounding behavior for the native MRZ overlay.

5. **Dependency ownership on iOS** — The reference path currently spans `packages/self-sdk-swift`, `app/ios`, and the external passport-reader fork. The execution plan needs to decide which package owns the reusable reference provider so the shell does not duplicate long-term maintenance.

## Implementation Checklist

- **Define passport/MRZ data-handling rules.** Handlers return PII (document numbers, MRZ data, NFC certificate material, data group hashes). Before implementation: (a) ensure no passport-derived data is written to logs, analytics, or crash reporters in the native shell, (b) add redaction validation to handler tests, (c) document the data-handling contract in consumer docs so SDK integrators know what flows through the bridge and their retention obligations.
- Add Android `consumer-rules.pro` coverage for BouncyCastle / jMRTD / SCUBA reflection paths.
- Decide ML Kit bundled vs. unbundled packaging before the Android camera PR lands.
- Document iOS NFC entitlement and Info.plist requirements in shell consumer docs.
- Add capability-detection tests that lock the `isSupported` / `isAvailable` semantics above.
- Add overlay lifecycle tests or manual validation steps for cancel/background/rotation behavior.

## Next Steps

This spike should not become the execution doc. If greenlit, the next step is to create PR-sized plan files under `plans/` and keep this file as the durable inventory/decision record.

Suggested follow-ups:

1. `plans/SELF-2614-nfc-handlers.md` — Android embedded NFC handler + iOS provider contract + registration
2. `plans/SELF-2614-mrz-camera-overlay.md` — Android/iOS camera handler + overlay presentation lifecycle
3. `plans/SELF-2614-ios-reference-providers.md` — Swift reference providers, consumer docs, and validation
