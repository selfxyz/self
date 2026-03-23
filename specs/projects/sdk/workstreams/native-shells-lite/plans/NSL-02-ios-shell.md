## iOS Native Shell (Plain Swift)

> Last updated: 2026-03-20
> Status: Ready

- Workstream: native-shells-lite
- Backlog IDs: NSL-02
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- The WebView-only SDK needs a thin iOS host to load the WebView bundle and handle keychain + crypto signing.
- The existing Swift providers in `packages/self-sdk-swift/` already implement keychain and crypto in plain Swift. This is a direct port with bridge routing added.
- No KMP dependency — standalone Swift Package.

### Scope

- New package: `packages/native-shell-ios/`
- Bridge infrastructure: `BridgeModels.swift`, `BridgeHandler.swift`, `MessageRouter.swift`
- 3 handlers: `SecureStorageHandler.swift`, `CryptoHandler.swift`, `LifecycleHandler.swift`
- WebView host: `SelfWebViewHost.swift` (WKWebView + WKScriptMessageHandler)
- Public API: `SelfSdk.swift`, `SelfSdkConfig.swift`
- Build: `Package.swift` (iOS 15+, resources in `Resources/self-sdk-web/`)

### Out of Scope

- NFC, camera, biometrics handlers
- Sumsub integration (WebView workstream)
- WebView app bundle (build-pipeline workstream)
- Test app (NSL-03)
- Android shell (NSL-01)

### Files to Modify

- None (new package)

### Files Not to Modify

- `packages/self-sdk-swift/` — reference only, do not modify
- `packages/kmp-sdk/` — reference only
- `packages/webview-bridge/` — upstream, do not change

### Preconditions

- Bridge protocol v1 types defined in `packages/webview-bridge/src/types.ts`
- Bridge adapter response shapes defined in `packages/webview-bridge/src/adapters/crypto.ts` and `storage.ts`

### Implementation Notes

- Port `SecureStorageProviderImpl` from `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/SecureStorageProviderImpl.swift` (89 LOC). Uses Keychain Services with service `"xyz.self.sdk"`, `kSecClassGenericPassword`, `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`. Wrap in bridge handler interface that returns `{ value: string|null }` for `get`.
- Port `CryptoProviderImpl` from `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/CryptoProviderImpl.swift` (107 LOC). EC P-256 via `SecKeyCreateRandomKey`, `kSecAttrKeyTypeECSECPrimeRandom`. Signs with `.ecdsaSignatureMessageX962SHA256`. Wrap in bridge handler that returns `{ signature: base64 }` / `{ publicKey: base64 }` / `{ keyRef, success: true }`.
- Port `WebViewProviderImpl` from `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/WebViewProviderImpl.swift` (141 LOC). WKWebView + `WKUserContentController` with `SelfNativeIOS` script message handler. `WeakScriptMessageProxy` to break retain cycles. Loads from `self-sdk-web/` bundle directory (production) or `localhost:5173` (debug).
- `MessageRouter` — new Swift implementation of the KMP `MessageRouter` pattern: decode JSON → route by domain → call handler → encode response → `evaluateJavaScript("window.SelfNativeBridge._handleResponse('...')")`.
- `LifecycleHandler` — `ready` (no-op), `dismiss` (dismiss presenting VC), `setResult` (invoke callback with result, then dismiss).
- Config delivery: `SelfSdk.createViewController(config:callback:)` passes `teeUrl`, `verificationId`, `userId` as URL query params when loading the WebView.
- Public API: `SelfSdkConfig` struct, `SelfSdkCallback` protocol with `onSuccess(result:)`, `onFailure(error:)`, `onCancelled()`.

### Validation

```bash
cd packages/native-shell-ios && swift build
```

### Definition of Done

- [ ] `swift build` passes
- [ ] `SecureStorageHandler` handles get/set/remove with iOS Keychain
- [ ] `CryptoHandler` generates EC P-256 keys, signs with ECDSA-SHA256, returns base64 public key
- [ ] `LifecycleHandler` handles ready/dismiss/setResult
- [ ] `MessageRouter` routes bridge JSON and sends responses via evaluateJavaScript
- [ ] `SelfWebViewHost` creates WKWebView with `SelfNativeIOS` message handler
- [ ] `SelfSdk.createViewController()` returns configured UIViewController
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-20: Plan created.
- 2026-03-21: Code complete on `feat/webview-sdk` (commit `807a748`). `swift build --sdk iphonesimulator` passes. Needs integration testing with WebView bundle.
