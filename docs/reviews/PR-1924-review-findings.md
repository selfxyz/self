# PR #1924 Review Findings

**PR:** Harden WebView bridge and asset serving across native shells
**Branch:** `justin/address-wv-vulns`
**Reviewed:** 2026-04-05
**Last updated:** 2026-04-05

This document reflects the substantive, non-pedantic feedback on PR #1924 from both GitHub PR comments and manual code review.
It intentionally excludes low-signal review noise such as docstring coverage, PR description nags, bot walkthrough summaries, and duplicate comments that collapse into the same work item.

---

## Resolved

### ~~1. Bundled Android entry path breaks relative asset loading~~

**Status:** Resolved — not a real issue.
`BundledAssetPathHandler` receives only the URL path component (e.g. `/assets/app.js`), not the full navigation URL. The `/tunnel/tour/1` initial URL never reaches the asset handler. Asset requests correctly resolve to `self-wallet/assets/...` in the Android bundle. PR comment resolved.

### ~~6. iOS local asset server startup must fail closed~~

**Status:** Resolved — already addressed.
`SelfWebViewHost` (native-shell-ios) uses a custom URL scheme handler (`SelfBundledAssetSchemeHandler`), not a local asset server. `WebViewProviderImpl` (self-sdk-swift) falls back to `bundledPort = 0` on server failure, which correctly rejects trust checks downstream. PR comments resolved.

### ~~7. SwiftPM resource path is declared but not populated by build automation~~

**Status:** Resolved — already addressed.
`build-webview-bundle.sh` copies the generated bundle to the self-sdk-swift resources path. The directory exists and is populated. PR comments resolved.

### ~~2. Trust boundary is fail-open in MessageRouter APIs~~

**Status:** Resolved.
Removed the default `isTrustedSource = true` value from the KMP, Android, and iOS routers, and updated callers/tests to pass trust explicitly.

### ~~3. Android bridge trust uses `webView.url` instead of callback origin~~

**Status:** Resolved.
Both Android hosts now evaluate bridge trust from `WebViewCompat.addWebMessageListener`'s `sourceOrigin` callback parameter rather than re-reading `webView.url`.

### ~~4. iOS bridge trust is rechecked from `webView?.url` after the origin was already validated~~

**Status:** Resolved.
`SelfWebViewHost` now passes `isTrustedSource: true` after `isTrustedBridgeFrameInfo()` succeeds, removing the race-prone recheck against `webView?.url`.

### ~~5. Bridge initialization does not fail closed when `WEB_MESSAGE_LISTENER` is unavailable~~

**Status:** Resolved.
Both Android hosts now fail closed with a hard `check(...)` when `WEB_MESSAGE_LISTENER` is unavailable instead of loading a broken bridge.

### ~~8. iOS `loadHTMLString` base URL resolves relative assets against entry path~~

**Status:** Resolved.
`SelfWebViewHost` already loads verified remote HTML with the configured `baseURL`, not the full `/tunnel/tour/1` entry URL, so relative asset resolution is anchored correctly at the remote app base.

### ~~9. Android allows Didit navigation in main frame; iOS restricts to subframes only~~

**Status:** Resolved.
The Android native-shell and KMP hosts now reject Didit in `isAllowedNavigationUrl`, aligning main-frame behavior with the iOS restriction.

### ~~10. Duplicate constant in Android host~~

**Status:** Resolved.
The current native Android host uses only `BUNDLED_ASSET_HOST`; the duplicate `BUNDLED_HOST` constant is no longer present.

### ~~11. iOS `navigationDelegate` set twice~~

**Status:** Resolved.
The current `SelfWebViewHost` assigns `webView.navigationDelegate = self` only once.

---

## Validation

- `cd packages/native-shell-android && ./gradlew test` — passed
- `cd packages/kmp-sdk && ./gradlew :shared:jvmTest` — passed
- `cd packages/native-shell-ios && swift test` — blocked by environment: SwiftPM cannot import `UIKit` in this shell (`no such module 'UIKit'`)

## Current Status

All substantive findings tracked in this review doc are now resolved in source.

## Explicitly Excluded

- Docstring coverage complaints
- PR description / checklist formatting comments
- Generic CodeRabbit walkthrough summaries
- Duplicate comments that collapse into the same work item
