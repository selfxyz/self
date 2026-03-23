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

| Depends On | Type | Status | Notes |
|------------|------|--------|-------|
| `packages/webview-app/` | Upstream | Active | Source of the WebView bundle |
| `packages/native-shell-android/` | Downstream | Ready | Receives assets at `src/main/assets/self-wallet/` |
| `packages/native-shell-ios/` | Downstream | Ready | Receives assets at `Resources/self-sdk-web/` |

## Backlog

| ID | Title | Status | Priority | Depends On | Plan | PR |
|----|-------|--------|----------|------------|------|----|
| BP-01 | WebView bundle build + copy script | Done | Medium | NSL-01, NSL-02 | [plans/BP-01-build-script.md](./plans/BP-01-build-script.md) | Complete on `feat/webview-sdk` |
| BP-02 | Runtime bundle integrity for CDN loading | Deferred | High | — | — | — |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

### BP-02 Context (Deferred)

When the SDK moves to CDN-hosted bundles in production, runtime integrity verification becomes a security boundary. Scope:

- Build step: generate a signed manifest (SHA-256 checksums of all bundle files) during `build-webview-bundle.sh`
- Android: Kotlin runtime check — verify downloaded bundle against manifest before loading into WebView
- iOS: Swift runtime check — same verification before `WKWebView.loadFileURL`
- Fail closed: refuse to load on any mismatch (missing file, checksum diff, missing manifest)
- The existing Gradle `validateWebViewBundle` task remains a dev-time guard; this is the prod-time counterpart

Trigger: when remote/CDN bundle loading is implemented.

## Active Plans

| Plan | IDs | Status |
|------|-----|--------|
| [plans/BP-01-build-script.md](./plans/BP-01-build-script.md) | BP-01 | Done |

## Completion Checklist

- [ ] Backlog reflects reality
- [ ] Active plan links are current
- [ ] Done items are marked done

## Related Specs

| Spec | Relationship |
|------|-------------|
| [SDK Overview](../../OVERVIEW.md) | Parent architecture |
| [WebView Spec](../webview/SPEC.md) | Upstream — produces the bundle |
| [Native Shells Lite](../native-shells-lite/SPEC.md) | Downstream — consumes the bundle |
