# SDK Project

Last updated: March 25, 2026
Status: Active (WebView-first, current pass is mock-first UI migration)

## Start Here

1. [SDK Overview](./OVERVIEW.md) — current scope, active architecture, paused-work policy
2. Open the relevant active workstream `INDEX.md` or `SPEC.md`
3. Open the linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from that file
4. If you are reviving native/KMP/RN work, open [Paused Work](./paused/INDEX.md) before touching any native spec

## Active Workstreams

| Workstream           | Entry                                                               | Focus                                                 |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| WebView UI           | [WebView Index](./workstreams/webview/INDEX.md)                     | Euclid screen migration, mocked flows, route coverage |
| SDK Core             | [SDK Core Spec](./workstreams/sdk-core/SPEC.md)                     | Browser-portable engine                               |
| Native Shells (Lite) | [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) | Future Kotlin + Swift shell follow-up                 |
| Build Pipeline       | [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md)         | Bundle webview-app into native shells                 |
| SDK Distribution     | [SDK Distribution Spec](./workstreams/sdk-distribution/SPEC.md)     | Hosted URL loading + native shell publishing          |
| Analytics            | [Analytics Spec](./workstreams/analytics/SPEC.md)                   | Canonical onboarding funnel events + Mixpanel dashboard |

## Paused Workstreams

| Workstream                    | Spec                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Native Shells                 | [Native Shells Spec](./paused/native-shells/SPEC.md)               |
| Native Consolidation          | [Native Consolidation Spec](./paused/native-consolidation/SPEC.md) |
| RN SDK                        | [RN SDK Spec](./paused/rn-sdk/SPEC.md)                             |
| Integrations / MiniPay Sample | [MiniPay Sample Spec](./paused/integrations/SPEC.md)               |

## Related

- [Paused Work Index](./paused/INDEX.md) — retained native/KMP/RN tracks for future reuse
