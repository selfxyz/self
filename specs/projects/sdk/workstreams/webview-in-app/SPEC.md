# WebView-in-App — Workstream Spec

> Last updated: 2026-05-19
> Owner: Self Wallet / SDK
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active — feature-branch work

## The Bet

The React Native Self Wallet (`app/`) replaces its native screens with a single
WebView that loads the deployed `webview-app`. The **RN app becomes the native
shell.** Custom Kotlin/Swift shells (`native-shells-lite/`) remain active but
serve external SDK consumers (KMP, partner wallets), not Self Wallet itself.

## Why

- The `webview-app` is the active product surface and is already ~80% of a
  full wallet UI; shipping it inside Self Wallet collapses two parallel UI
  tracks into one and starts dogfooding the SDK in production.
- The RN app already owns the hardware: NFC, MRZ, QR, keychain, biometrics.
  Re-implementing those in a Kotlin/Swift shell duplicates production-tested
  modules.
- The cost is bounded: the RN app does not speak the bridge protocol today,
  but the adapter delta is a single-workstream sized piece of work.

## North Star

- **Goal:** Self Wallet renders the verification flow from a hosted
  `webview-app` URL, with the existing RN process providing the hardware,
  secure storage, and lifecycle handlers via the bridge protocol.
- **Success metric:** A user installs the next Self Wallet release, completes
  registration and disclose end-to-end without any RN screen being rendered
  (Splash + error boundary only), and the keychain entries written by the
  WebView open the same wallet on next launch.
- **Constraint:** The bridge JSON contract is the only coupling between the
  RN host and the WebView. No imports across the boundary, no platform
  extensions, no side channels.

## Branch Model

- All workstream PRs land on `feat/webview-in-app`, a long-lived feature
  branch off `dev`.
- Each spec under this folder produces one PR into `feat/webview-in-app`.
- The branch merges to `dev` in a single cutover PR when internal testing is
  green. At cutover, the legacy RN screens are deleted in the same PR — no
  parallel paths, no RemoteConfig flag, no dual-write shims.
- Speed > ceremony on this initiative. Correctness still rules security-
  critical paths (keychain, signing keys, attestation persistence).

## Code Home

The bridge host implementation lives in **`packages/rn-sdk/`** (revived
from paused). `app/` consumes it as a workspace dependency.

- `packages/rn-sdk/` — the WebView shell component (TS), a thin
  `SelfBridgeModule` native module that registers KMP bridge handlers
  into the RN runtime, and TS adapters for the handful of domains
  that need an RN-only path (e.g. `analytics`, `navigation`,
  `lifecycle` reply shapes).
- `app/` — splash, error boundary, deep-link receiver, workspace dep
  on `@selfxyz/rn-sdk`. Imports and mounts the shell at the root of
  the navigation graph.
- Future 3rd-party RN apps install `@selfxyz/rn-sdk` from npm and
  consume the same shell + handlers. Self Wallet is consumer #1, not
  the only consumer.

## Architecture — Path A (rn-sdk wraps kmp-sdk)

The React Native SDK does **not** reimplement the bridge layer.
Instead it consumes `packages/kmp-sdk/` (Android AAR + iOS XCFramework)
and registers KMP's bridge handlers and the consumer's platform
providers into the `SdkProviderRegistry`. This collapses three parallel
bridge implementations (Kotlin native-shell, RN-side TS handlers,
KMP shared) into one source of truth in KMP commonMain / per-platform
providers.

- KMP owns: `MessageRouter`, `SecureStorageBridgeHandler`,
  `CryptoBridgeHandler`, `LifecycleBridgeHandler`, and (as MOD-01→06
  lands) `NfcBridgeHandler`, `CameraMrzBridgeHandler`,
  `BiometricBridgeHandler`, `DocumentsBridgeHandler`. Each handler
  delegates to a `*Provider` interface in `commonMain`.
- `rn-sdk` owns: the WebView shell, `SelfBridgeModule` (Kotlin) which
  instantiates a `MessageRouter`, registers KMP handlers, and bridges
  inbound JSON / outbound JS-injection to React Native's message bus,
  and a Swift counterpart for iOS that does the same against the
  XCFramework via `IosProviderRegistry`.
- Self Wallet (and any RN consumer) supplies platform providers that
  wrap existing RN-native modules: `react-native-keychain` →
  `SecureStorageProvider`, AndroidKeyStore / iOS Security Framework
  → `CryptoProvider`, `react-native-passport-reader` → `NfcProvider`,
  `MRZScannerModule` → `CameraMrzProvider`, etc. Providers are
  registered into the KMP `SdkProviderRegistry` before the WebView
  mounts.

This direction is the outcome of the
[Path A spike](./plans/PATH-A-rn-wraps-kmp.html) — the build-side
prototype on Android is complete; hardware smoke is the remaining
gate. The bridge envelope, error vocabulary, and per-domain handler
behavior come straight from `kmp-sdk`, so the WebView cannot tell
which shell (native-Kotlin, KMP, or RN) it is running inside —
the invariant from the umbrella holds by construction rather than
by parallel maintenance.

## Tracks

| Track           | Spec                                                | Owner-shaped for                   |
| --------------- | --------------------------------------------------- | ---------------------------------- |
| Bridge host     | [SPEC-BRIDGE-HOST.md](./SPEC-BRIDGE-HOST.md)        | RN/TS engineer (no native needed)  |
| Native adapters | [SPEC-NATIVE-ADAPTERS.md](./SPEC-NATIVE-ADAPTERS.md)| iOS + Android native engineers     |
| Hosted loading  | [SPEC-HOSTED-LOADING.md](./SPEC-HOSTED-LOADING.md)  | Release / build engineer           |
| Observability   | [SPEC-OBSERVABILITY.md](./SPEC-OBSERVABILITY.md)    | Analytics / product-observability  |
| Operating modes | [SPEC-MODES.md](./SPEC-MODES.md)                    | SDK / WebView UI (cross-cuts webview/) |

These run in parallel after `WIA-01`. Bridge host blocks native adapters
(adapters need the message router to exist before they can be registered).
Hosted loading is independent of native adapters; observability depends on
bridge host (the `analytics.trackEvent` routing is settled there). Modes
depends on bridge host (the `lifecycle.getConfig` response shape is settled
there) and cross-cuts into the `webview/` workstream for the actual
webview-app routing implementation.

## Backlog

| ID     | Title                                              | Track          | Status   |
| ------ | -------------------------------------------------- | -------------- | -------- |
| WIA-00 | Revive `packages/rn-sdk/` from paused; workspace dep in `app/` | Umbrella | Pending  |
| WIA-01 | Establish `feat/webview-in-app` branch + umbrella  | Umbrella       | Active   |
| WIA-02 | RN WebView host shell + message router (in `rn-sdk`)| Bridge host   | Pending  |
| WIA-03 | Lifecycle, navigation, analytics handlers          | Bridge host    | Pending  |
| WIA-04 | SecureStorage handler — Path A prototype lands; production wiring registers `EncryptedSharedPreferencesProvider` (Android) + RNKeychain-backed Swift `SecureStorageProvider` (iOS) into `SdkProviderRegistry` | Native adapters| In prototype |
| WIA-05 | Crypto handler — register KMP's `CryptoBridgeHandler` in `SelfBridgeModule`; consumer-side providers reuse `AndroidKeystoreCryptoProvider` and `self-sdk-swift`'s `CryptoProviderImpl`. No net-new RN-only `SelfCrypto` module. | Native adapters| Pending  |
| WIA-06 | NFC handler — register KMP's `NfcBridgeHandler`; provide RN-flavored `NfcProvider` wrapping `react-native-passport-reader` | Native adapters| Pending (depends on MOD-01/02) |
| WIA-07 | Camera / MRZ handler — register KMP's `CameraMrzBridgeHandler`; provide RN-flavored `CameraMrzProvider` wrapping existing `MRZScannerModule` | Native adapters| Pending (depends on MOD-01/03/05) |
| WIA-08 | Biometrics handler — register KMP's `BiometricBridgeHandler`; provide RN `BiometricProvider` wrapping `react-native-biometrics` | Native adapters| Pending  |
| WIA-09 | Hosted URL loading + version pinning               | Hosted loading | Pending  |
| WIA-10 | Retire RN-native Didit integration                 | Umbrella       | Pending  |
| WIA-11 | Cutover PR — delete legacy RN screens              | Umbrella       | Pending  |
| WIA-12 | WebView Sentry integration (cohort tags, masking)  | Observability  | Pending  |
| WIA-13 | WebView Session Replay with PII masking            | Observability  | Pending  |
| WIA-14 | Re-home ANA-15 attempt_id footer to webview-app    | Observability  | Pending  |
| WIA-15 | Documents handler — register KMP's `DocumentsBridgeHandler`; provide RN `DocumentsProvider` that delegates to the existing `databaseProvider` flow | Native adapters| Pending  |
| WIA-16 | `mode` + `verificationRequest` in lifecycle.getConfig | Operating modes | Pending  |

## Cross-Workstream Dependencies

- **`webview/` workstream** must complete enough parity work that Self Wallet
  users can register, disclose, and manage settings without falling back to
  RN. The umbrella tracks readiness via the existing `webview/` backlog;
  blocking items are WV-05 (Didit web SDK to production), WV-13–WV-16
  (remaining screens), and settings parity.
- **`build-pipeline/` workstream** (BP-01, done) produces the artifact
  served at the hosted URL. `WIA-09` does not depend on a new build
  artifact — it consumes the existing one.
- **`sdk-distribution/` workstream** owns `verify.self.xyz` hosting.
  `WIA-09` pins to that URL contract; coordinate URL or major-version
  changes with that workstream's owner.
- **`native-shells-lite/` workstream** keeps Kotlin/Swift shells in parity
  with the bridge protocol changes introduced here. Owner of that workstream
  must mirror any new handler shape added by `WIA-02`/`WIA-03`.
- **`analytics/` workstream** (ANA-13 landed 2026-05-19) defines the
  observability surface this workstream must preserve through cutover. The
  carve-out in `analytics/SPEC.md` ("WebView has no Sentry integration today;
  out of scope") becomes this workstream's responsibility — see
  [SPEC-OBSERVABILITY.md](./SPEC-OBSERVABILITY.md). ANA-15 (`attempt_id`
  footer on error screens) is re-homed to `WIA-14`; if ANA-15 ships
  unmodified before cutover, its work is overwritten.

## Out of Scope

- **No new bridge domains.** The 10 existing domains (`nfc`, `biometrics`,
  `secureStorage`, `camera`, `crypto`, `haptic`, `analytics`, `lifecycle`,
  `documents`, `navigation`) cover everything this workstream needs. Anything
  that doesn't fit goes into `analytics.trackEvent` or a host callback.
- **No RemoteConfig flag for the WebView host vs. RN screens.** Cutover is at
  merge time.
- **No web fallback for keychain.** Secure storage remains 100% native.
- **No Didit RN-native SDK in the final cutover.** The web SDK is canonical.
  The RN-native integration is retired with the RN screens.
- **No proving-machine relocation.** Proving stays in `mobile-sdk-alpha` and
  runs inside the WebView. The RN host does not own proving state.
- **No SDK distribution work.** Hosting the bundle for external consumers is
  `sdk-distribution/`'s problem, not this workstream's.
- **No fork of the observability stack.** This workstream extends the
  ANA-13 surface (same Sentry project, same cohort tag taxonomy, same
  redact list, same terminal-event clear semantics) — it does not
  introduce a parallel observability pipeline for the WebView.

## Invariants

1. The WebView must not know which native shell it runs inside. Bridge
   messages from Self Wallet are indistinguishable from bridge messages from
   the Kotlin/Swift shells.
2. Keychain operations originate in TypeScript inside the WebView, are sent
   over the bridge, and execute in the RN host's native modules. No JS-side
   fallback for keychain reads or writes.
3. Bridge protocol version mismatches fail closed. If the WebView speaks a
   protocol version the RN host does not implement, the host returns an
   error envelope and the WebView surfaces a recoverable error to the user.
4. The RN host renders exactly two non-WebView surfaces in production:
   a splash/initialization screen and a top-level error boundary. Everything
   else is the WebView.
5. Observability continuity: every onboarding attempt produces a Sentry
   event stream identifiable by `attempt_id`, regardless of whether the
   error originates in the RN host or inside the WebView. WebView errors
   land in the same Sentry project as RN-host errors; cohort tags
   (`attempt_id`, `initial_branch`, `current_branch`,
   `document_country`, `document_type`, `signature_algorithm`,
   `csca_hash_algorithm`, `kyc_provider`) are set on the captured event
   regardless of origin. The PII redact list from ANA-13
   (`passport|mrz|dg\d|chip|aadhaar|name|dob|birth|photo`) applies on
   both sides.

## Validation

Each track's spec defines its own validation. The umbrella holds two:

- **End-to-end registration on a real device.** A fresh install on iOS and
  Android completes passport NFC registration via the WebView, with all
  hardware calls routed through the bridge. Keychain entries persist across
  app launches.
- **End-to-end disclose on a real device.** A QR-launched disclose request
  completes, returns a result to the calling browser/relayer, and produces
  analytics events identical in shape to the pre-cutover RN flow.

The cutover PR (`WIA-11`) cannot merge until both validations pass on a
TestFlight + Play internal-track build.

## Cancelled

_(none yet — leave for future cancellations; do not reuse IDs.)_
