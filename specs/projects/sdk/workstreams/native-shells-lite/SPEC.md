# Native Shells (Lite) — Implementation Spec

> Last updated: 2026-03-21
> Owner: SDK / Platform
> Parent: `../../OVERVIEW.md`
> Status: Active

## Purpose

- You own the thin native shells that host the WebView and handle keychain/keystore + crypto signing.
- These replace the paused KMP-based native shells with plain Kotlin (Android) and plain Swift (iOS).
- Done when both shells build, handle the 3 required bridge domains, and a test app exercises the full WebView flow.

## Scope

- Android native shell: `packages/native-shell-android/` (plain Kotlin, Android library module)
- iOS native shell: `packages/native-shell-ios/` (plain Swift, Swift Package)
- Bridge infrastructure: MessageRouter, BridgeRequest/Response models (ported from KMP common)
- 3 bridge domain handlers per platform: `secureStorage`, `crypto`, `lifecycle`
- Test apps adapted from `packages/kmp-sdk-test-app/`

## Out of Scope

- KMP shared code or expect/actual patterns
- NFC, camera, biometrics, haptic, analytics, documents, navigation bridge handlers
- KYC provider integration (owned by WebView workstream)
- WebView app build/bundle (owned by build-pipeline workstream)
- Changes to `packages/webview-bridge/` or `packages/mobile-sdk-alpha/`

## Invariants

- Native shells are thin wrappers. No business logic in Kotlin or Swift.
- Bridge protocol v1 is the only coupling between native and WebView.
- Keychain/keystore is always native-managed. No web fallbacks for secure storage.
- `secureStorage` handler ignores the `requireBiometric` flag. Device lock provides sufficient security.
- Response JSON shapes must match what `webview-bridge/src/adapters/crypto.ts` and `storage.ts` expect.
- **Bridge parity with `webview-in-app`.** Handler signatures, response shapes, and error vocabulary must stay identical to what the `webview-in-app/` RN host implements. The WebView must not be able to distinguish which shell it runs inside. Any handler change in [WebView-in-App Native Adapters](../webview-in-app/SPEC-NATIVE-ADAPTERS.md) must be mirrored here in the same release cycle.

## Dependencies

| Depends On                 | Type                       | Status | Notes                                      |
| -------------------------- | -------------------------- | ------ | ------------------------------------------ |
| `packages/webview-bridge/` | Upstream (bridge protocol) | Done   | Defines message shapes and transport names |
| `packages/webview-app/`    | Upstream (WebView bundle)  | Active | Native shells load this bundle             |
| Build pipeline             | Downstream                 | Ready  | Copies webview-app dist into native assets |

## Ownership Boundaries

| Area                             | Owner                | Notes                         |
| -------------------------------- | -------------------- | ----------------------------- |
| `packages/native-shell-android/` | Native Shells (Lite) | New package                   |
| `packages/native-shell-ios/`     | Native Shells (Lite) | New package                   |
| `packages/sdk-test-app/`         | Native Shells (Lite) | Adapted from kmp-sdk-test-app |
| `packages/kmp-sdk/`              | Paused               | Reference only, do not modify |
| `packages/self-sdk-swift/`       | Paused               | Reference only, do not modify |

## Backlog

| ID     | Title                                   | Status      | Priority | Depends On             | Plan                                                                     | PR                                                            |
| ------ | --------------------------------------- | ----------- | -------- | ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| NSL-01 | Android native shell (plain Kotlin)     | In Progress | High     | -                      | [plans/NSL-01-android-shell.md](./plans/NSL-01-android-shell.md)         | Code complete on `feat/webview-sdk`, needs testing            |
| NSL-02 | iOS native shell (plain Swift)          | In Progress | High     | -                      | [plans/NSL-02-ios-shell.md](./plans/NSL-02-ios-shell.md)                 | Code complete on `feat/webview-sdk`, needs testing            |
| NSL-03 | Test apps (adapt from kmp-sdk-test-app) | In Progress | Medium   | NSL-01, NSL-02         | [plans/NSL-03-test-apps.md](./plans/NSL-03-test-apps.md)                 | Code complete on `feat/webview-sdk`, needs build verification |
| NSL-04 | Delegate keychain to SDK consumers      | Done        | Medium   | NSL-01, NSL-02, NSL-03 | [plans/NSL-04-delegate-keychain.md](./plans/NSL-04-delegate-keychain.md) | Implemented on `dev`                                          |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                     | IDs    | Status                                                |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------- |
| [plans/NSL-01-android-shell.md](./plans/NSL-01-android-shell.md)         | NSL-01 | In Progress (code complete, needs testing)            |
| [plans/NSL-02-ios-shell.md](./plans/NSL-02-ios-shell.md)                 | NSL-02 | In Progress (code complete, needs testing)            |
| [plans/NSL-03-test-apps.md](./plans/NSL-03-test-apps.md)                 | NSL-03 | In Progress (code complete, needs build verification) |
| [plans/NSL-04-delegate-keychain.md](./plans/NSL-04-delegate-keychain.md) | NSL-04 | Done                                                  |

## Completion Checklist

- [ ] Backlog reflects reality
- [ ] Active plan links are current
- [ ] Done items are marked done
- [ ] Cross-workstream dependencies updated

## Reference Implementations

These existing files define the contract and patterns to port:

| What                             | Source                                                               | Notes                                              |
| -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Bridge protocol (message shapes) | `packages/webview-bridge/src/types.ts`                               | Canonical — native must match                      |
| Bridge transport detection       | `packages/webview-bridge/src/bridge.ts`                              | Android: `SelfNativeAndroid`, iOS: `SelfNativeIOS` |
| Crypto adapter expectations      | `packages/webview-bridge/src/adapters/crypto.ts`                     | Defines request params and response shapes         |
| Storage adapter expectations     | `packages/webview-bridge/src/adapters/storage.ts`                    | Defines request params and response shapes         |
| KMP MessageRouter                | `packages/kmp-sdk/.../commonMain/.../MessageRouter.kt`               | Port routing logic                                 |
| Android SecureStorage            | `packages/kmp-sdk/.../androidMain/.../SecureStorageBridgeHandler.kt` | Port EncryptedSharedPreferences pattern            |
| Android WebView host             | `packages/kmp-sdk/.../androidMain/.../AndroidWebViewHost.kt`         | Port WebViewAssetLoader + JS interface             |
| Android Activity                 | `packages/kmp-sdk/.../androidMain/.../SelfVerificationActivity.kt`   | Port entry point, simplify permissions             |
| iOS CryptoProvider               | `packages/self-sdk-swift/.../CryptoProviderImpl.swift`               | Port EC P-256 signing                              |
| iOS SecureStorage                | `packages/self-sdk-swift/.../SecureStorageProviderImpl.swift`        | Port Keychain Services                             |
| iOS WebView host                 | `packages/self-sdk-swift/.../WebViewProviderImpl.swift`              | Port WKWebView + script message handler            |

## Bridge Domain Contract

Only 3 domains are implemented by the native shells:

### `secureStorage`

| Method   | Params                           | Response                    |
| -------- | -------------------------------- | --------------------------- |
| `get`    | `{ key: string }`                | `{ value: string \| null }` |
| `set`    | `{ key: string, value: string }` | `null`                      |
| `remove` | `{ key: string }`                | `null`                      |

### `crypto`

| Method         | Params                                              | Response                            |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| `generateKey`  | `{ keyRef: string }`                                | `{ keyRef: string, success: true }` |
| `getPublicKey` | `{ keyRef: string }`                                | `{ publicKey: string }` (base64)    |
| `sign`         | `{ data: string, keyRef: string }` (data is base64) | `{ signature: string }` (base64)    |

### `lifecycle`

| Method      | Params                                                | Response                                  |
| ----------- | ----------------------------------------------------- | ----------------------------------------- |
| `ready`     | `{}`                                                  | `null` (no-op)                            |
| `dismiss`   | `{ reason?: string }`                                 | `null` (finishes Activity / dismisses VC) |
| `setResult` | `{ success: bool, userId?, verificationId?, error? }` | `null` (forwards to host, then finishes)  |

Any other domain request returns a `DOMAIN_NOT_FOUND` error response.

## Host Result Contract

When the WebView calls `lifecycle.setResult()`, the native shell forwards the result to the host app and finishes.

### Result payload (matches `VerificationResult` in `webview-bridge/src/types.ts`)

```typescript
{
  success: boolean;
  userId?: string;
  verificationId?: string;
  error?: { code: string; message: string };
}
```

### Android → Host

`LifecycleHandler` calls `Activity.setResult()` with:

- `RESULT_OK` when `success: true`
- `RESULT_CANCELED` when user dismisses
- `RESULT_FIRST_USER` on error

Result JSON is included as Intent extra (`xyz.self.sdk.RESULT_DATA`). Host reads via `onActivityResult()` or Activity Result API.

### iOS → Host

`LifecycleHandler` invokes the `SelfSdkCallback` protocol:

- `onSuccess(result:)` when `success: true`
- `onCancelled()` when user dismisses
- `onFailure(error:)` on error

Then dismisses the presenting ViewController.

### Provider agnosticism

The host never sees raw KYC provider output. The WebView normalizes provider results into `KycProviderResult` (WV-02) internally, and only the terminal Self result (`success`, `userId`, `verificationId`, `error`) reaches the host. The provider is pluggable — the host sees the same shape regardless of which KYC provider was used.

## Related Specs

| Spec                                                       | Relationship                                           |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| [SDK Overview](../../OVERVIEW.md)                          | Parent architecture                                    |
| [WebView Spec](../webview/SPEC.md)                         | Sibling — owns KYC provider integration and WebView UX |
| [SDK Core Spec](../sdk-core/SPEC.md)                       | Sibling — owns mobile-sdk-alpha engine                 |
| [Build Pipeline Spec](../build-pipeline/SPEC.md)           | Downstream — bundles webview-app into native shells    |
| [Paused Native Shells](../../paused/native-shells/SPEC.md) | Predecessor — KMP-based, now deprecated                |
