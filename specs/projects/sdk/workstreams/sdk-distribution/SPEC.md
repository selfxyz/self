# SDK Distribution — Implementation Spec

> Last updated: 2026-04-06
> Owner: SDK / Platform
> Parent: `../../OVERVIEW.md`
> Status: Active

## Purpose

- You own the transition from embedded WebView bundles (~34MB) to hosted URL loading.
- Native shells will load `https://verify.self.xyz/v1/` instead of bundled assets, eliminating bundle size from the SDK.
- Done when both native shells load the hosted URL, the WebView app is deployed at the hosted URL, and native shells are published without bundled assets.

## Scope

- Config model changes: add `webAppUrl` to `SelfSdkConfig` on both platforms
- URL loading changes: replace asset loaders with hosted URL loading in both native shells
- Build cleanup: remove bundle validation tasks, asset copy resources, and `androidx.webkit` dependency
- Hosting: deploy webview-app at `https://verify.self.xyz/v1/`
- Publishing: Maven (Android) and SPM (iOS) distribution without bundled assets

## Out of Scope

- Bridge protocol changes (v1 unchanged)
- Bridge handler logic (owned by native-shells-lite workstream)
- React Native wrapper (separate follow-up)
- Debug mode changes (devServerUrl remains unchanged)
- CI/CD pipeline configuration
- WebView app source code changes (owned by WebView workstream)

## Invariants

- HTTPS-only in production. The hosted URL must be served over HTTPS with HSTS.
- Bridge protocol v1 is unchanged. Hosted loading does not change the message contract.
- Debug mode is unchanged. `devServerUrl` override continues to work for local development.
- `webAppUrl` has a default. If not set, defaults to `https://verify.self.xyz/v1/`.
- Auto-update model. The hosted page updates independently of SDK releases. `/v1/` path changes only for breaking changes.

## Dependencies

| Depends On                    | Type     | Status | Notes                                                 |
| ----------------------------- | -------- | ------ | ----------------------------------------------------- |
| Native Shells (Lite) — NSL-01 | Upstream | Active | Android shell must exist before switching URL loading |
| Native Shells (Lite) — NSL-02 | Upstream | Active | iOS shell must exist before switching URL loading     |
| `packages/webview-app/`       | Upstream | Active | Source of the hosted web app                          |
| Build Pipeline                | Sibling  | Active | Bundle script remains for local dev only after SD-03  |
| KMP Revival — KR-03           | Upstream | Active | KMP artifacts validated locally before remote publish |

## Ownership Boundaries

| Area                             | Owner            | Notes                                  |
| -------------------------------- | ---------------- | -------------------------------------- |
| `packages/native-shell-android/` | SDK Distribution | Config + URL loading changes only      |
| `packages/native-shell-ios/`     | SDK Distribution | Config + URL loading changes only      |
| `packages/webview-app/`          | SDK Distribution | Hosting setup only (no source changes) |
| `packages/kmp-sdk/`              | SDK Distribution | Decommission — publishing moved to external `self-webview-sdk` (SD-07; supersedes SD-06), pending WIA-17 convergence decision |
| Bridge handlers                  | Native Shells    | Not modified by this workstream        |

## Backlog

| ID    | Title                             | Status | Priority | Depends On | Plan                                                                                 | PR  |
| ----- | --------------------------------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------------ | --- |
| SD-01 | Android hosted URL loading        | Ready  | High     | NSL-01     | [plans/SD-01-android-hosted-url.md](./plans/SD-01-android-hosted-url.md)             | —   |
| SD-02 | iOS hosted URL loading            | Ready  | High     | NSL-02     | [plans/SD-02-ios-hosted-url.md](./plans/SD-02-ios-hosted-url.md)                     | —   |
| SD-03 | WebView app hosting setup         | Ready  | High     | —          | [plans/SD-03-hosting-setup.md](./plans/SD-03-hosting-setup.md)                       | —   |
| SD-04 | Android Maven publishing          | Ready  | Medium   | SD-01      | [plans/SD-04-android-maven-publishing.md](./plans/SD-04-android-maven-publishing.md) | —   |
| SD-05 | iOS publishing (SPM + CocoaPods)  | Ready  | Medium   | SD-02      | [plans/SD-05-ios-spm-publishing.md](./plans/SD-05-ios-spm-publishing.md)             | —   |
| SD-06 | KMP remote publishing (Maven+SPM) | Blocked | Medium   | KR-03      | [plans/SD-06-kmp-remote-publishing.md](./plans/SD-06-kmp-remote-publishing.md)       | —   |
| SD-07 | Decommission vendored KMP SDK     | Blocked | Medium   | external `self-webview-sdk` release; WIA-17 convergence decision | [plans/SD-07-decommission-vendored-kmp-sdk.md](./plans/SD-07-decommission-vendored-kmp-sdk.md) | —   |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

> **SD-06 / SD-07 are mutually exclusive directions.** SD-06 publishes the monorepo's vendored `packages/kmp-sdk` as the source-of-truth. SD-07 deletes it and consumes the externally published artifact from `selfxyz/self-webview-sdk`. The canonical-home decision (this repo vs `self-webview-sdk`) is still open — see [WIA-17 open questions](../webview-in-app/plans/SPIKE-rn-wraps-kmp.md). SD-06 is held Blocked until that resolves; if `self-webview-sdk` is confirmed canonical, SD-06 moves to Cancelled and SD-07 becomes the path.

### Execution Order

1. **SD-03** first — hosting must be live before native shells can load it
2. **SD-01 + SD-02** in parallel — Android and iOS URL loading changes
3. **SD-04 + SD-05** in parallel — native-shell publishing
4. **SD-06 vs SD-07** — blocked pending the WIA-17 canonical-home decision; exactly one ships

## Active Plans

| Plan                                                                                 | IDs   | Status |
| ------------------------------------------------------------------------------------ | ----- | ------ |
| [plans/SD-01-android-hosted-url.md](./plans/SD-01-android-hosted-url.md)             | SD-01 | Ready  |
| [plans/SD-02-ios-hosted-url.md](./plans/SD-02-ios-hosted-url.md)                     | SD-02 | Ready  |
| [plans/SD-03-hosting-setup.md](./plans/SD-03-hosting-setup.md)                       | SD-03 | Ready  |
| [plans/SD-04-android-maven-publishing.md](./plans/SD-04-android-maven-publishing.md) | SD-04 | Ready  |
| [plans/SD-05-ios-spm-publishing.md](./plans/SD-05-ios-spm-publishing.md)             | SD-05 | Ready  |
| [plans/SD-06-kmp-remote-publishing.md](./plans/SD-06-kmp-remote-publishing.md)       | SD-06 | Blocked |
| [plans/SD-07-decommission-vendored-kmp-sdk.md](./plans/SD-07-decommission-vendored-kmp-sdk.md) | SD-07 | Blocked (draft) |

## Completion Checklist

- [ ] Backlog reflects reality
- [ ] Active plan links are current
- [ ] Done items are marked done
- [ ] Cross-workstream dependencies updated

## Key Design Decisions

| Decision           | Choice                                          | Rationale                                                        |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| Hosting domain     | `https://verify.self.xyz/v1/`                   | User-facing, version-namespaced, HTTPS-only                      |
| Versioning model   | Auto-update (hosted page updates independently) | `/v1/` path changes only for breaking changes to bridge protocol |
| Config delivery    | `webAppUrl` field with default                  | Simple, overridable, does not leak config into query params      |
| Hosting            | Internal infrastructure                         | SD-03 describes requirements only                                |
| Bundle script fate | Retained for local dev                          | Developers need `devServerUrl` alternative for offline work      |

## Related Specs

| Spec                                                | Relationship                                                |
| --------------------------------------------------- | ----------------------------------------------------------- |
| [SDK Overview](../../OVERVIEW.md)                   | Parent architecture                                         |
| [Native Shells Lite](../native-shells-lite/SPEC.md) | Upstream — shells must exist before distribution changes    |
| [Build Pipeline](../build-pipeline/SPEC.md)         | Sibling — bundle script retained for local dev only         |
| [WebView Spec](../webview/SPEC.md)                  | Upstream — produces the web app being hosted                |
| [SDK Core Spec](../sdk-core/SPEC.md)                | Sibling — engine consumed by hosted web app                 |
| [KMP Revival](../kmp-revival/SPEC.md)               | Upstream — KR-03 validates artifacts before SD-06 publishes |
