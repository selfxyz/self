# @selfxyz/rn-nfc-passport

Optional native NFC passport reader for [`@selfxyz/rn-sdk`](../rn-sdk). It registers the
`SelfPassportReader` React Native module that `@selfxyz/rn-sdk`'s `NfcHandler` resolves to
perform the ICAO 9303 chip read (BAC/PACE, DG1/DG14/SOD).

NFC chip reading is the heaviest native capability (jMRTD/BouncyCastle on Android, CoreNFC +
entitlements on iOS), so it ships as an **opt-in package**. It is an optional peer of
`@selfxyz/rn-sdk`: KYC-only apps do not install it, and when it is absent `NfcHandler` reports
the `nfc` capability as unavailable and `scanPassport` rejects with `NOT_AVAILABLE`.

## Install

```bash
pnpm add @selfxyz/rn-nfc-passport
cd ios && pod install
```

The package is autolinked (`react-native.config.cjs` + podspec); no manual registration is
needed. Native artifacts (the Android AAR, the iOS binary xcframeworks) are resolved from Self's
private distribution channels — see below.

### Android

The module depends on the AAR `xyz.self.sdk:nfc` (jMRTD 0.8.1 / BouncyCastle 1.78.1 / SCUBA).
Its version is locked to this package's npm version.

The AAR is served from `mavenLocal` (SDK development) or the private
`maven.pkg.github.com/selfxyz/self-sdk-dist` repository. A library module's own repositories are
**not** consulted for the app's classpath, so the consumer app must inject these repositories
into its **app-level** `android/build.gradle`:

```groovy
allprojects {
  repositories {
    mavenLocal { content { includeGroupByRegex("xyz\\.self\\.sdk(\\..*)?") } }
    if (System.getenv("SELF_SDK_GITHUB_TOKEN")) {
      maven {
        url uri("https://maven.pkg.github.com/selfxyz/self-sdk-dist")
        credentials {
          username = System.getenv("SELF_SDK_GITHUB_USER") ?: "self-sdk"
          password = System.getenv("SELF_SDK_GITHUB_TOKEN")
        }
        content { includeGroupByRegex("xyz\\.self\\.sdk(\\..*)?") }
      }
    }
  }
}
```

`consumer-rules.pro` is applied automatically (via `consumerProguardFiles`) and keeps the
jMRTD / BouncyCastle / SCUBA reflection paths under R8/minification.

### iOS — REQUIRED consumer configuration

The chip read uses CoreNFC. The **consumer app** must add:

1. **Entitlement** — `com.apple.developer.nfc.readersession.formats` with `TAG` (and the
   associated NFC capability + provisioning profile). Without it CoreNFC cannot open a reader
   session.
2. **Info.plist** — `NFCReaderUsageDescription` with a user-facing string, e.g.

   ```xml
   <key>NFCReaderUsageDescription</key>
   <string>Scan the NFC chip in your passport to verify your identity.</string>
   ```

If `NFCReaderUsageDescription` is missing, `scanPassport` fails with a clear
`NFC_NOT_CONFIGURED` error instead of crashing/hanging CoreNFC. If the entitlement is not
provisioned, it fails with `NFC_NOT_AVAILABLE`.

The iOS reader is the same `selfxyz/NFCPassportReader` fork (commit `b478e1f`) shipped by the
Self Wallet app, so there is **no iOS parity gap**.

#### Mixpanel transitive dependency + OpenSSL conflict

The NFCPassportReader fork pulls in Mixpanel transitively, and its `.swiftinterface` imports
`OpenSSL`, so this podspec depends on `OpenSSL-Universal ~> 1.1.2301` (the version the binaries
were built against). A **second** `OpenSSL.xcframework` on the link line (commonly from an NFC-
enabled document-capture SDK) causes duplicate-symbol/link failures. Mirror the Self Wallet
workaround: pin document-capture SDKs to a variant that ships **no** CoreNFC / OpenSSL. For
Didit that is the AutoDetection variant:

```ruby
# ios/Podfile
ENV["DIDIT_SDK_IOS_VARIANT"] ||= "autodetection"
```

## Usage

Nothing to import at the call site — installing the package is enough. `@selfxyz/rn-sdk`'s
`NfcHandler` detects `NativeModules.SelfPassportReader` and routes `nfc.scanPassport` through it.

A typed accessor is exported for diagnostics:

```ts
import { isSelfPassportReaderAvailable } from '@selfxyz/rn-nfc-passport';

if (!isSelfPassportReaderAvailable()) {
  // package not linked / native module absent
}
```

## Native contract

| Platform | Method | Signature |
| --- | --- | --- |
| Android | `scan(options)` | `{ documentNumber, dateOfBirth, dateOfExpiry, canNumber?, useCan?, skipPACE?, skipCA?, extendedMode?, usePacePolling?, sessionId?, ... }` → `Promise<string>` |
| iOS | `scanPassport(...)` | `(passportNumber, dateOfBirth, dateOfExpiry, canNumber, useCan, skipPACE, skipCA, extendedMode, usePacePolling, sessionId)` → `Promise<string>` |

Both resolve the reader's document result as a JSON string (the WebView contract). No
passport-derived PII is logged or sent to analytics by this shim.

> **Advanced BAC/PACE toggles** (`canNumber`, `useCan`, `skipPACE`, `skipCA`, `extendedMode`,
> `usePacePolling`) are accepted for signature compatibility with `NfcHandler`. The current
> maintained readers negotiate PACE→BAC automatically and do not yet honor these flags; they
> will be forwarded once the underlying reader APIs expose them.

## Pre-cutover validation gate (Android)

Before this package replaces the Self Wallet app's production Android reader, the AAR chip read
**must be validated on a sample of real documents** — the AAR uses jMRTD 0.8.1 / BouncyCastle
1.78.1 while the app's legacy path uses jMRTD 0.8.1 (tradle bridge) / 0.7.35 + SpongyCastle.
Validate BAC + PACE, CA/DG14, and DG1/SOD extraction, and confirm results match the app's
production reader across the sampled document types. This on-device parity check requires real
documents and the private AAR and is **not** covered by the package's automated tests.
