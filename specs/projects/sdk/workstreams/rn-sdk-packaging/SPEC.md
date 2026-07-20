# RN SDK Packaging — Implementation Spec

> Last updated: 2026-07-20
> Owner: SDK / Platform
> Parent: `../../OVERVIEW.md`
> Status: Active

## Purpose

- Make `packages/rn-sdk` a self-contained, distributable React Native SDK where **NFC passport
  reading and MRZ camera scanning are optional native dependencies** a consumer opts into.
- Today `NfcHandler`/`CameraHandler` look up native modules (`RNPassportReader`/`PassportReader`,
  `SelfMRZScannerModule`) that rn-sdk does not ship — they come from the Self wallet app (`app/`)
  and private Gradle clones. A consumer installing `@selfxyz/rn-sdk` alone cannot capture a
  passport, and a **KYC / disclose-only** consumer cannot cleanly avoid the heavy NFC/MRZ deps or
  learn up front what is missing (the WebView only discovers a gap via a runtime `NOT_AVAILABLE`).
- Reuse the maintained native artifacts already published by the sibling `self-sdk-native` repo
  rather than forking a third copy of the jMRTD / ML Kit / Vision code.
- Done when: a KYC-only install requires zero capture modules; a full-capture install opts in via
  two optional packages; the WebView gates flows on advertised capabilities; and Expo + bare-RN
  consumers can wire the bundle without hand-editing native projects.

## Native Reuse Mapping (confirmed)

| Capability | Android | iOS |
| ---------- | ------- | --- |
| NFC passport | AAR `xyz.self.sdk:nfc` (jMRTD 0.8.1, BouncyCastle 1.78.1, SCUBA) | `SelfSdkNfc` Swift product → `selfxyz/NFCPassportReader` fork (`SelfNFCPassportReader` pod). **Same commit `b478e1f` as `app/ios/Podfile:177`** — identical to what the app ships. |
| MRZ camera | AAR `xyz.self.sdk:ocr` (ML Kit text-recognition, CameraX) | Vision-framework engine `MrzScanEngine.swift`/`MrzOcrCorrection.swift` — the **same source already in `app/ios/`**, mirrored in `self-sdk-swift/Sources/SelfSdkOcr/`. |

- `react-native-passport-reader` (tradle `io.tradle.nfc`) is **Android-only**; it is not the iOS NFC path.
- AARs / Swift products expose KMP provider APIs (`NfcProvider`/`CameraMrzProvider`), **not** RN
  NativeModules — thin RN shims adapt them to the module names the handlers look up
  (`SelfPassportReader`, `SelfMRZScannerModule`).
- AAR coordinates/publish: `self-sdk-native/kmp-sdk/{nfc,ocr,full}/build.gradle.kts`
  (GitHub Packages `self-sdk-dist` + mavenLocal via the `rn-v*` tag pipeline).

## Decisions

- **Native source** = reuse the artifacts above (no third source fork; not the `useKmpBridge` KMP-bridge route).
- **ML Kit** = unbundled / thin variant on Android (first-run model download), to keep the optional MRZ package light.
- **Expo** = ship a config plugin for automatic asset/native wiring.
- **Maven auth** = acceptable to depend on the private `self-sdk-dist` repo (rn-sdk is private); plumb tokens in CI + consumer setup.
- **Version decoupling does not break kmp-sdk**: the AAR version is CI-stamped at publish (`-PsdkVersion` from the `rn-v*` tag); the package.json read is only a local-dev fallback. Shims pin an explicit published coordinate like any Maven consumer; both consumers coexist as long as the small `NfcProvider`/`CameraMrzProvider` interfaces stay backward-compatible.

## Scope

- Capabilities handshake in the bridge so the WebView knows which native modules are present (RSP-01).
- Align the NFC native-module name lookup so an SDK-shipped module is preferred (RSP-02).
- Two optional npm packages wrapping the `self-sdk-native` artifacts (RSP-03 MRZ, RSP-04 NFC).
- Expo config plugin + documented bare-RN asset wiring (RSP-05).

## Out of Scope

- KMP `useKmpBridge` routing of nfc/camera domains (separate experimental track).
- Changes to `self-sdk-native` artifact APIs (consume as published).
- `mobile-sdk-alpha` native-scan exports and the RN app's existing native flow (must stay working).
- Replacing the embedded bundle with hosted-URL loading (tracked in `sdk-distribution` SD-01–05).

## Invariants

- No RN app regressions: `app/` continues to resolve its existing `PassportReader`/`RNPassportReader`
  and `MRZScannerModule` modules; the module-name change (RSP-02) only *prepends* a preferred name.
- Bridge protocol stays backward compatible: a WebView that predates the capabilities field treats a
  missing `capabilities` object as all-true.
- Capture modules are truly optional peers (`peerDependenciesMeta.optional`); a KYC-only install links none of them.
- No passport-derived PII (document numbers, MRZ, certificates, DG hashes) written to logs/analytics/crash reporters in the shim layer.

## Backlog

| ID     | Title                                            | Status | Priority | Depends On     | Plan | Est. LOC |
| ------ | ------------------------------------------------ | ------ | -------- | -------------- | ---- | -------- |
| RSP-01 | Capabilities handshake + WebView flow gating     | Done     | High     | -              | [plans/RSP-01-capabilities-handshake.md](./plans/RSP-01-capabilities-handshake.md) | ~250 |
| RSP-02 | Unify NFC native-module name lookup              | Done     | High     | -              | [plans/RSP-02-nfc-module-name-unification.md](./plans/RSP-02-nfc-module-name-unification.md) | ~60 |
| RSP-03 | `@selfxyz/rn-mrz-scanner` optional package        | Ready    | Medium   | RSP-01         | [plans/RSP-03-rn-mrz-scanner-package.md](./plans/RSP-03-rn-mrz-scanner-package.md) | ~400 |
| RSP-04 | `@selfxyz/rn-nfc-passport` optional package       | Ready    | Medium   | RSP-01, RSP-02 | [plans/RSP-04-rn-nfc-passport-package.md](./plans/RSP-04-rn-nfc-passport-package.md) | ~500 |
| RSP-05 | Expo config plugin + asset wiring                 | Deferred | Medium   | -              | [plans/RSP-05-expo-config-plugin.md](./plans/RSP-05-expo-config-plugin.md) | ~150 |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Follow-ups (not core specs)

- **`secureStorage` host injection (low priority).** Add a `secureStorage?` prop to `SelfVerification`
  mirroring `documents?: DocumentsStore`, so a consumer without `react-native-keychain` can supply
  persistence — the last hard dependency blocking a zero-optional-native KYC build. Bundle with a
  keychain hardening fix: honor `requireBiometric` on private-key reads and set `accessControl`/
  `accessible` options in `KeychainHandler` (currently ignored). Track here; spec separately if picked up.

## Completion Checklist

- [ ] `lifecycle.getConfig` advertises `capabilities`; bridge protocol version bumped; missing field ⇒ all-true.
- [ ] webview-app hides capture flows for absent capabilities; embed mode fails closed on unsatisfiable requests.
- [ ] `NfcHandler` prefers `SelfPassportReader`, legacy names fall back; `app/` unaffected.
- [ ] `@selfxyz/rn-mrz-scanner` + `@selfxyz/rn-nfc-passport` published, autolink, satisfy their handlers.
- [ ] Android NFC chip-read parity validated on real documents before cutover.
- [ ] Both capture packages are optional peers; KYC-only install links neither.
- [ ] Expo config plugin wires assets automatically; bare-RN manual steps documented.
- [ ] AAR versions pinned explicitly; kmp-sdk release pipeline unchanged.

## Related Specs

| Spec | Relationship |
| ---- | ------------ |
| [SDK Overview](../../OVERVIEW.md) | Parent architecture |
| [Native Hardware Handlers (spike)](../native-hardware-handlers/SPEC.md) | Inventory + risk source (binary size, iOS entitlement, ML Kit bundled-vs-unbundled, PII redaction) |
| [KMP Revival](../kmp-revival/SPEC.md) | Sibling — the `self-sdk-native` KMP artifacts this workstream consumes |
| [SDK Distribution](../sdk-distribution/SPEC.md) | Hosted-URL loading (SD-01–05) — eventual replacement for embedded-bundle asset wiring |
| [WebView-in-App](../webview-in-app/SPEC.html) | Defines `self-app` vs `embed` operating modes the flow gating builds on |
