# SDK Project

Last updated: August 6, 2026
Status: Active (WebView-first target; the Self app on `dev` is still the legacy RN architecture)

## Start Here

1. [SDK Overview](./OVERVIEW.md) — how the SDK is put together today, where new code goes, validation commands
2. [Decisions Log](./DECISIONS.md) — why it is that way, and when it changed
3. Open the relevant active workstream `INDEX.md` or `SPEC.md`
4. Open the linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from that file
5. If you are reviving native/KMP/RN work, open [Paused Work](./paused/INDEX.md) before touching any native spec

## Active Workstreams

| Workstream           | Entry                                                                      | Focus                                                       |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| WebView UI           | [WebView Index](./workstreams/webview/INDEX.md)                            | Euclid screen migration, mocked flows, route coverage       |
| WebView-in-App       | [WebView-in-App Spec](./workstreams/webview-in-app/SPEC.html)              | Self app RN app adopts WebView as its host                  |
| Nav Hygiene          | [Nav-Hygiene Spec](./workstreams/nav-hygiene/SPEC.html)                    | Navigation invariants and branch model (WIA sub-workstream) |
| Native Hardware      | [Native Hardware Handlers](./workstreams/native-hardware-handlers/SPEC.md) | Spike: NFC/MRZ/camera as bridge handlers (SELF-2614)        |
| SDK Core             | [SDK Core Spec](./workstreams/sdk-core/SPEC.md)                            | Browser-portable engine                                     |
| Native Shells (Lite) | [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md)        | Kotlin + Swift shells for external SDK consumers            |
| Build Pipeline       | [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md)                | Bundle webview-app into native shells                       |
| SDK Distribution     | [SDK Distribution Spec](./workstreams/sdk-distribution/SPEC.md)            | Hosted URL loading + native shell publishing                |
| RN SDK Packaging     | [RN SDK Packaging Spec](./workstreams/rn-sdk-packaging/SPEC.md)            | Optional NFC/MRZ native modules + capabilities handshake    |
| Analytics            | [Analytics Spec](./workstreams/analytics/SPEC.md)                          | Canonical onboarding funnel events + Mixpanel dashboard     |
| Monorepo Tooling     | [Monorepo Tooling Spec](./workstreams/monorepo-tooling/SPEC.md)            | pnpm/Turbo hardening; cutover and Turbo foundation done     |
| KMP Revival          | [KMP Revival Spec](./workstreams/kmp-revival/SPEC.md)                      | KMP Android/iOS to 3-domain native shell parity             |
| Codebase Audits      | [Audits Spec](./workstreams/audits/SPEC.md)                                | Sequential surface audits: findings → issues → fixes        |

## Paused Workstreams

| Workstream                    | Spec                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Native Shells                 | [Native Shells Spec](./paused/native-shells/SPEC.md)               |
| Native Consolidation          | [Native Consolidation Spec](./paused/native-consolidation/SPEC.md) |
| Integrations / MiniPay Sample | [MiniPay Sample Spec](./paused/integrations/SPEC.md)               |
| Embed Mode (WIA)              | [Embed Mode Spec](./paused/embed-mode/SPEC.md)                     |

## Related

- [Paused Work Index](./paused/INDEX.md) — retained native/KMP/RN tracks for future reuse
- [MRZ preview diagnosis](./workstreams/webview-in-app/SPEC-MRZ-PREVIEW.md) — parked debugging record
