## iOS Hosted URL Loading

> Last updated: 2026-03-30
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-02
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- The iOS native shell currently loads the WebView bundle from local files via `WKWebView.loadFileURL`, embedding ~34MB into the Swift Package.
- Switching to a hosted URL (`https://verify.self.xyz/v1/`) eliminates the bundle from the package, making SPM resolution fast and the package lightweight.
- The SDK opens a hosted webpage instead of a bundled one — UI updates ship without requiring SDK version bumps.

### Scope

- Replace `loadFileURL` with `load(URLRequest(url:))` for the hosted URL
- Add `webAppUrl` field to `SelfSdkConfig` with default `https://verify.self.xyz/v1/`
- Remove `.copy("Resources/self-sdk-web")` resource processing from `Package.swift`
- Update navigation policy to allow the hosted domain

### Out of Scope

- Bridge handler changes (protocol is identical regardless of URL source)
- Debug mode / `devServerUrl` (already works independently of file loading)
- SPM publishing cleanup (SD-05)
- Android changes (SD-01)
- Hosting setup (SD-03)
- CI/CD configuration

### Files to Modify

- `packages/native-shell-ios/Sources/.../SelfWebViewHost.swift` — Replace `loadFileURL(_:allowingReadAccessTo:)` with `load(URLRequest(url: URL(string: config.webAppUrl)!))`. Update `decidePolicyFor navigationAction` to allow `verify.self.xyz` domain.
- `packages/native-shell-ios/Sources/.../SelfSdkConfig.swift` — Add `public var webAppUrl: String = "https://verify.self.xyz/v1/"`.
- `packages/native-shell-ios/Sources/.../SelfSdk.swift` — Thread `webAppUrl` from config to the WebView host.
- `packages/native-shell-ios/Package.swift` — Remove `.copy("Resources/self-sdk-web")` from the resource processing rules. Remove the `Resources/` directory reference if it becomes empty.

### Files NOT to Modify

- `packages/native-shell-ios/Sources/.../MessageRouter.swift` — Bridge routing is unchanged
- `packages/native-shell-ios/Sources/.../SecureStorageHandler.swift` — Handler logic unchanged
- `packages/native-shell-ios/Sources/.../CryptoHandler.swift` — Handler logic unchanged
- `packages/native-shell-ios/Sources/.../LifecycleHandler.swift` — Handler logic unchanged
- `packages/webview-bridge/` — Upstream, do not change
- `packages/webview-app/` — Upstream, do not change

### Preconditions

- NSL-02 is complete (iOS native shell exists)
- SD-03 is complete (hosted URL is live at `https://verify.self.xyz/v1/`)

### Implementation Details

1. **Replace `loadFileURL`** in `SelfWebViewHost.swift`:
   - Remove the bundle path resolution that finds `Resources/self-sdk-web/index.html`
   - Remove `loadFileURL(_:allowingReadAccessTo:)` call
   - Replace with `webView.load(URLRequest(url: URL(string: webAppUrl)!))` where `webAppUrl` comes from config
   - Config params (`teeUrl`, `verificationId`, `userId`) continue to be appended as URL query params

2. **Update navigation policy**:
   - In `decidePolicyFor navigationAction`, allow navigation to `verify.self.xyz` domain
   - Continue blocking other external navigations
   - Keep the existing `devServerUrl` allowlisting for debug mode

3. **Add `webAppUrl` to config**:
   - In `SelfSdkConfig.swift`: `public var webAppUrl: String = "https://verify.self.xyz/v1/"`
   - The default means existing integrators get hosted loading without config changes

4. **Clean up `Package.swift`**:
   - Remove `.copy("Resources/self-sdk-web")` from the SPM resource rules
   - If `resources:` array becomes empty, remove the parameter entirely
   - Delete the `Resources/self-sdk-web/` directory (or its `.gitkeep` placeholder)

5. **Thread config through**:
   - `SelfSdk.start(config:)` → `SelfWebViewHost` init → `loadURL`
   - `webAppUrl` follows the same path as existing config fields

### Validation

```bash
# Build must succeed without Resources/self-sdk-web/ directory
cd packages/native-shell-ios && swift build

# Verify no loadFileURL reference
grep -r "loadFileURL" packages/native-shell-ios/Sources/ && echo "FAIL: loadFileURL still referenced" || echo "PASS"

# Verify no resource copy in Package.swift
grep "self-sdk-web" packages/native-shell-ios/Package.swift && echo "FAIL: resource copy still present" || echo "PASS"
```

### Definition of Done

- [ ] `swift build` passes without `Resources/self-sdk-web/` directory
- [ ] `loadFileURL` fully removed from source
- [ ] `.copy("Resources/self-sdk-web")` removed from `Package.swift`
- [ ] `SelfSdkConfig.webAppUrl` defaults to `https://verify.self.xyz/v1/`
- [ ] Navigation policy allows `verify.self.xyz` domain
- [ ] Debug mode (`devServerUrl`) still works unchanged
- [ ] Bridge communication works identically (handlers unchanged)
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-30: Plan created.
