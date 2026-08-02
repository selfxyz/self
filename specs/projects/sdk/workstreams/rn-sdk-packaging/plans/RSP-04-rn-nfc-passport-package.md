# RSP-04 — `@selfxyz/rn-nfc-passport` Optional Package

> Last updated: 2026-07-20
> Status: Ready

- Workstream: rn-sdk-packaging
- Backlog IDs: RSP-04
- Owner: SDK / Platform
- Depends on: RSP-01, RSP-02

## Why

- NFC passport chip reading is the heaviest capability (jMRTD/BouncyCastle on Android, CoreNFC +
  entitlements on iOS) and must be an opt-in native package.
- After RSP-02, `NfcHandler` prefers `SelfPassportReader`; this package provides that module by
  wrapping the maintained native readers, sharing one implementation with the KMP and Swift SDKs.

## Scope

- New package `packages/rn-nfc-passport` (`@selfxyz/rn-nfc-passport`), autolinked RN library exposing
  `SelfPassportReader`:
  - **Android**: depends on AAR `xyz.self.sdk:nfc` (jMRTD 0.8.1, BouncyCastle 1.78.1, SCUBA). RN module
    `SelfPassportReader.scan(options)` matching the Android signature in `NfcHandler.ts:287-293`
    (`{ documentNumber, dateOfBirth, dateOfExpiry, canNumber?, useCan?, skipPACE?, skipCA?, ... }`).
    Ship `consumer-rules.pro` for jMRTD/BouncyCastle/SCUBA reflection paths.
  - **iOS**: depends on `SelfSdkNfc` (→ `selfxyz/NFCPassportReader` fork, commit `b478e1f` — the same the
    app ships). RN module `SelfPassportReader.scanPassport(passportNumber, dateOfBirth, dateOfExpiry,
    canNumber, useCan, skipPACE, skipCA, extendedMode, usePacePolling, sessionId)` matching
    `NfcHandler.ts:296-338`. Requires the **consumer app** to carry the NFC entitlement +
    `NFCReaderUsageDescription` Info.plist key; fail `scan` with a clear configuration error (not a hang)
    when misconfigured. Note the fork's transitive Mixpanel dependency and the existing
    OpenSSL-Universal conflict workaround (`app/ios/Podfile:6,246`).
  - Autolink via `react-native.config.cjs` + podspec.
- Add to `@selfxyz/rn-sdk` `peerDependencies` with `peerDependenciesMeta: { optional: true }`.
- Pin explicit published `xyz.self.sdk:nfc` version + Maven repo injection.
- No passport-derived PII written to logs/analytics/crash reporters in the shim.

## Out of Scope

- MRZ package (RSP-03). Module-name lookup change (RSP-02, prerequisite).

## Files to Modify / Create

- `packages/rn-nfc-passport/` — `package.json`, `android/` (build.gradle + `consumer-rules.pro` + module/package), `ios/` (podspec + Swift module), `react-native.config.cjs`, `src/index.ts`.
- `packages/rn-sdk/package.json` — optional peer entry.
- Consumer docs: iOS NFC entitlement + Info.plist requirement.

## Files Not to Modify

- `packages/rn-sdk/src/handlers/NfcHandler.ts` beyond RSP-02.
- `app/**`, `self-sdk-native/**` (consume published artifacts).

## Preconditions

- RSP-02 landed (`SelfPassportReader` preferred in `NfcHandler`).
- `xyz.self.sdk:nfc` AAR and `SelfSdkNfc` Swift product published/resolvable.

## Parity Gate (Android only)

- The AAR uses jMRTD 0.8.1 + BouncyCastle 1.78.1; the RN app's active Android NFC path uses jMRTD
  0.8.1 (tradle bridge) / 0.7.35 + SpongyCastle. **Validate chip reads on a sample of real documents**
  (BAC + PACE, CA/DG14, DG1/SOD extraction) via the AAR before treating this as app-ready.
- iOS has **no parity gap**: `SelfSdkNfc` pins the same `b478e1f` commit as `app/ios`.

## Input / Output

**Input:**

```text
webview-app requests nfc.scan with BAC fields; NfcHandler invokes SelfPassportReader.
```

**Output:**

```text
Native reader performs the ICAO 9303 chip read and returns the document result. Package uninstalled ⇒
nfc capability false (RSP-01) and scan rejects NOT_AVAILABLE. iOS without entitlement ⇒ explicit config error.
```

## Validation

```bash
cd packages/rn-nfc-passport && (android build + pod install)
```

- On-device (both platforms): full passport register/disclose against real documents succeeds.
- Android parity: results match the app's production reader across the sampled document types.
- iOS misconfig: missing entitlement yields a clear error, not a hang/crash.
- Uninstall: `nfc` capability false; capture flow hidden.

## Definition of Done

- [ ] `@selfxyz/rn-nfc-passport` builds on both platforms and autolinks; registers `SelfPassportReader`.
- [ ] Android `consumer-rules.pro` covers jMRTD/BouncyCastle/SCUBA.
- [ ] iOS entitlement/Info.plist requirement documented; misconfig fails cleanly.
- [ ] Android chip-read parity validated on real documents.
- [ ] Optional peer; KYC-only install does not pull it.
- [ ] No passport PII in logs/analytics.
- [ ] AAR version pinned; Maven repo injection present.
- [ ] SPEC.md backlog status updated.

## Status Log

- 2026-07-20: Spec drafted.
