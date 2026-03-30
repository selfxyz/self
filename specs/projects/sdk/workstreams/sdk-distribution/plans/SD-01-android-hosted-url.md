## Android Hosted URL Loading

> Last updated: 2026-03-30
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-01
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- The Android native shell currently loads the WebView bundle from local assets via `WebViewAssetLoader`, embedding ~34MB into the AAR.
- Switching to a hosted URL (`https://verify.self.xyz/v1/`) eliminates the bundle from the SDK artifact, dropping AAR size to <200KB.
- The SDK opens a hosted webpage instead of a bundled one — UI updates ship without requiring SDK version bumps.

### Scope

- Remove `WebViewAssetLoader` and load the hosted URL directly via `webView.loadUrl()`
- Add `webAppUrl` field to `SelfSdkConfig` with default `https://verify.self.xyz/v1/`
- Remove `validateWebViewBundle` Gradle task
- Remove `androidx.webkit` dependency (only needed for `WebViewAssetLoader`)
- Update `shouldOverrideUrlLoading` to allow the hosted domain (`verify.self.xyz`)

### Out of Scope

- Bridge handler changes (protocol is identical regardless of URL source)
- Debug mode / `devServerUrl` (already works independently of asset loading)
- Maven publishing (SD-04)
- iOS changes (SD-02)
- Hosting setup (SD-03)
- CI/CD configuration

### Files to Modify

- `packages/native-shell-android/src/main/kotlin/.../AndroidWebViewHost.kt` — Replace `WebViewAssetLoader` with `webView.loadUrl(config.webAppUrl)`. Remove asset loader setup. Update `shouldOverrideUrlLoading` to whitelist `verify.self.xyz`.
- `packages/native-shell-android/src/main/kotlin/.../SelfSdkConfig.kt` — Add `val webAppUrl: String = "https://verify.self.xyz/v1/"`.
- `packages/native-shell-android/src/main/kotlin/.../SelfSdk.kt` — Pass `webAppUrl` through to the Activity intent extras.
- `packages/native-shell-android/src/main/kotlin/.../SelfVerificationActivity.kt` — Read `webAppUrl` from intent extras. Pass to `AndroidWebViewHost`.
- `packages/native-shell-android/build.gradle.kts` — Remove `validateWebViewBundle` task. Remove `androidx.webkit:webkit` dependency.

### Files NOT to Modify

- `packages/native-shell-android/src/main/kotlin/.../MessageRouter.kt` — Bridge routing is unchanged
- `packages/native-shell-android/src/main/kotlin/.../SecureStorageHandler.kt` — Handler logic unchanged
- `packages/native-shell-android/src/main/kotlin/.../CryptoHandler.kt` — Handler logic unchanged
- `packages/native-shell-android/src/main/kotlin/.../LifecycleHandler.kt` — Handler logic unchanged
- `packages/webview-bridge/` — Upstream, do not change
- `packages/webview-app/` — Upstream, do not change

### Preconditions

- NSL-01 is complete (Android native shell exists)
- SD-03 is complete (hosted URL is live at `https://verify.self.xyz/v1/`)

### Implementation Details

1. **Remove `WebViewAssetLoader`** in `AndroidWebViewHost.kt`:
   - Delete the `WebViewAssetLoader.Builder()` setup and the `PathHandler`
   - Delete `shouldInterceptRequest` override that delegates to the asset loader
   - Replace with `webView.loadUrl(webAppUrl)` where `webAppUrl` comes from config

2. **Update `shouldOverrideUrlLoading`**:
   - Allow navigation to `verify.self.xyz` domain
   - Continue blocking other external navigations
   - Keep the existing `devServerUrl` allowlisting for debug mode

3. **Add `webAppUrl` to config**:
   - In `SelfSdkConfig.kt`: `val webAppUrl: String = "https://verify.self.xyz/v1/"`
   - The default means existing integrators get hosted loading without config changes
   - Config params (`teeUrl`, `verificationId`, `userId`) continue to be appended as URL query params

4. **Remove Gradle bundle validation**:
   - Delete the `validateWebViewBundle` task from `build.gradle.kts`
   - Delete the `src/main/assets/self-wallet/` directory reference (no longer needed)
   - Remove `androidx.webkit:webkit` from dependencies

5. **Thread config through**:
   - `SelfSdk.launch()` → Intent extras → `SelfVerificationActivity` → `AndroidWebViewHost`
   - `webAppUrl` follows the same path as existing config fields

### Validation

```bash
# Build must succeed without assets/self-wallet/ directory
cd packages/native-shell-android && ./gradlew assembleDebug

# Verify no reference to WebViewAssetLoader
grep -r "WebViewAssetLoader" packages/native-shell-android/src/ && echo "FAIL: WebViewAssetLoader still referenced" || echo "PASS"

# Verify no androidx.webkit dependency
grep "androidx.webkit" packages/native-shell-android/build.gradle.kts && echo "FAIL: webkit dependency still present" || echo "PASS"
```

### Definition of Done

- [ ] `./gradlew assembleDebug` passes without `assets/self-wallet/` directory
- [ ] `WebViewAssetLoader` fully removed from source
- [ ] `androidx.webkit:webkit` removed from dependencies
- [ ] `validateWebViewBundle` Gradle task removed
- [ ] `SelfSdkConfig.webAppUrl` defaults to `https://verify.self.xyz/v1/`
- [ ] `shouldOverrideUrlLoading` allows `verify.self.xyz` domain
- [ ] Debug mode (`devServerUrl`) still works unchanged
- [ ] Bridge communication works identically (handlers unchanged)
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-30: Plan created.
