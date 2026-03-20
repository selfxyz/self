## Android Native Shell (Plain Kotlin)

> Last updated: 2026-03-20
> Status: Ready

- Workstream: native-shells-lite
- Backlog IDs: NSL-01
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- The WebView-only SDK needs a thin Android host to load the WebView bundle and handle keychain/keystore operations.
- KMP adds unnecessary build complexity for 3 bridge handlers. Plain Kotlin is simpler.
- The KMP Android code already works — this is a direct port without the KMP abstraction layer.

### Scope

- New package: `packages/native-shell-android/`
- Bridge infrastructure: `BridgeModels.kt`, `BridgeHandler.kt`, `MessageRouter.kt`
- 3 handlers: `SecureStorageHandler.kt`, `CryptoHandler.kt`, `LifecycleHandler.kt`
- WebView host: `SelfWebViewHost.kt`, `SelfVerificationActivity.kt`
- Public API: `SelfSdk.kt`, `SelfSdkConfig.kt`
- Build config: `build.gradle.kts` (Android library, minSdk 24, targetSdk 34)

### Out of Scope

- NFC, camera, biometrics handlers
- Sumsub integration (WebView workstream)
- WebView app bundle (build-pipeline workstream)
- Test app (NSL-03)
- iOS shell (NSL-02)

### Files to Modify

- None (new package)

### Files Not to Modify

- `packages/kmp-sdk/` — reference only
- `packages/webview-bridge/` — upstream, do not change
- `packages/mobile-sdk-alpha/` — upstream, do not change

### Preconditions

- Bridge protocol v1 types defined in `packages/webview-bridge/src/types.ts`
- Bridge adapter response shapes defined in `packages/webview-bridge/src/adapters/crypto.ts` and `storage.ts`

### Implementation Notes

- Port `MessageRouter` from `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/bridge/MessageRouter.kt`. Remove KMP `expect`/`actual` patterns — use standard Kotlin.
- Port `SecureStorageBridgeHandler` from `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/SecureStorageBridgeHandler.kt`. Nearly identical — uses `EncryptedSharedPreferences` with `MasterKey.KeyScheme.AES256_GCM`.
- `CryptoHandler` is new (KMP iOS had one but Android didn't have a direct one). Use Android Keystore API:
  - `KeyPairGenerator.getInstance("EC", "AndroidKeyStore")` with P-256 curve
  - `Signature.getInstance("SHA256withECDSA")` for signing
  - Store with `setKeyGenParameterSpec` using `PURPOSE_SIGN`
  - Return base64 public key from `KeyStore.getInstance("AndroidKeyStore").getCertificate(keyRef).publicKey.encoded`
- Port `AndroidWebViewHost` from `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/AndroidWebViewHost.kt`. Same `WebViewAssetLoader` pattern, JS interface `SelfNativeAndroid`.
- Port `SelfVerificationActivity` from `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/SelfVerificationActivity.kt`. Remove CAMERA/NFC permissions. Register only 3 handlers. Pass config as URL query params when loading WebView.
- Config delivery: Activity reads `teeUrl`, `verificationId`, `userId`, `debugMode` from Intent extras. Appends as query params to the WebView URL: `https://appassets.androidplatform.net/index.html?teeUrl=...&verificationId=...`
- Dependencies: `androidx.security:security-crypto:1.1.0-alpha06`, `org.jetbrains.kotlinx:kotlinx-serialization-json`, `androidx.webkit:webkit`, `androidx.appcompat:appcompat`

### Validation

```bash
cd packages/native-shell-android && ./gradlew assembleDebug
```

### Definition of Done

- [ ] `./gradlew assembleDebug` passes
- [ ] `SecureStorageHandler` handles get/set/remove with EncryptedSharedPreferences
- [ ] `CryptoHandler` generates EC P-256 keys, signs with ECDSA-SHA256, returns base64 public key
- [ ] `LifecycleHandler` handles ready/dismiss/setResult
- [ ] `MessageRouter` routes bridge JSON to correct handler and sends responses via evaluateJavascript
- [ ] `SelfWebViewHost` loads bundled assets from `self-wallet/` via WebViewAssetLoader
- [ ] `SelfSdk.launch()` starts `SelfVerificationActivity` with config extras
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-20: Plan created.
- 2026-03-21: Code complete on `feat/webview-sdk` (commit `169ce8c`). `./gradlew assembleDebug` passes. Needs integration testing with WebView bundle.
