# Build Pipeline — Implementation Spec

> Last updated: 2026-03-20
> Owner: SDK / Platform
> Parent: `../../OVERVIEW.md`
> Status: Active

## Purpose

- You own the build automation that bundles the webview-app into native shells.
- Done when a single script builds the WebView bundle and copies it into both native shell asset directories, and native builds succeed with the bundled assets.

## Scope

- Build script: `scripts/build-webview-bundle.sh`
- Android asset integration: Gradle preBuild validation
- iOS asset integration: SPM resource processing
- .gitignore for bundled assets (build artifacts, not committed)

## Out of Scope

- WebView app source code (owned by WebView workstream)
- Native shell source code (owned by native-shells-lite workstream)
- CI/CD pipeline configuration
- Publishing to Maven/CocoaPods/npm

## Invariants

- Bundled assets are build artifacts. Never committed to source control.
- Both native shells must fail-fast if the WebView bundle is missing at build time.
- The build script runs `yarn workspace @selfxyz/webview-app build` — it does not modify the webview-app source.

## Dependencies

| Depends On                       | Type       | Status | Notes                                             |
| -------------------------------- | ---------- | ------ | ------------------------------------------------- |
| `packages/webview-app/`          | Upstream   | Active | Source of the WebView bundle                      |
| `packages/native-shell-android/` | Downstream | Ready  | Receives assets at `src/main/assets/self-wallet/` |
| `packages/native-shell-ios/`     | Downstream | Ready  | Receives assets at `Resources/self-sdk-web/`      |

## Backlog

| ID    | Title                                    | Status   | Priority | Depends On     | Plan                                                         | PR                             |
| ----- | ---------------------------------------- | -------- | -------- | -------------- | ------------------------------------------------------------ | ------------------------------ |
| BP-01 | WebView bundle build + copy script       | Done     | Medium   | NSL-01, NSL-02 | [plans/BP-01-build-script.md](./plans/BP-01-build-script.md) | Complete on `feat/webview-sdk` |
| BP-02 | Runtime bundle integrity for CDN loading | Deferred | High     | —              | —                                                            | —                              |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

### BP-02 Context (Deferred)

The SDK Distribution workstream ([SDK Distribution Spec](../sdk-distribution/SPEC.md)) supersedes the CDN bundle approach with hosted URL loading. Native shells will load `https://verify.self.xyz/v1/` directly instead of downloading and verifying CDN bundles.

With hosted URL loading:

- Runtime bundle integrity verification is no longer needed — the browser handles HTTPS/TLS verification
- The `validateWebViewBundle` Gradle task will be removed as part of SD-01
- The build script (`build-webview-bundle.sh`) remains useful for **local development only** — developers can bundle locally and use `devServerUrl` for offline work

If a future requirement emerges for offline/bundled mode alongside hosted mode, BP-02 would be revisited. Until then, this item remains deferred.

Trigger: only if offline/bundled mode is required alongside hosted mode.

## Active Plans

| Plan                                                         | IDs   | Status |
| ------------------------------------------------------------ | ----- | ------ |
| [plans/BP-01-build-script.md](./plans/BP-01-build-script.md) | BP-01 | Done   |

## Completion Checklist

- [ ] Backlog reflects reality
- [ ] Active plan links are current
- [ ] Done items are marked done

## Related Specs

| Spec                                                | Relationship                     |
| --------------------------------------------------- | -------------------------------- |
| [SDK Overview](../../OVERVIEW.md)                   | Parent architecture              |
| [WebView Spec](../webview/SPEC.md)                  | Upstream — produces the bundle   |
| [Native Shells Lite](../native-shells-lite/SPEC.md) | Downstream — consumes the bundle |
