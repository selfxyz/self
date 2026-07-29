# SDK Project

Last updated: June 11, 2026
Status: Active (WebView-first; Self app adopts WebView as host via `webview-in-app`)

## Start Here

1. [SDK Overview](./OVERVIEW.md) — current scope, active architecture, paused-work policy
2. Open the relevant active workstream `INDEX.md` or `SPEC.md`
3. Open the linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from that file
4. If you are reviving native/KMP/RN work, open [Paused Work](./paused/INDEX.md) before touching any native spec

## Active Workstreams

| Workstream           | Entry                                                               | Focus                                                   |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| WebView UI           | [WebView Index](./workstreams/webview/INDEX.md)                     | Euclid screen migration, mocked flows, route coverage   |
| WebView-in-App       | [WebView-in-App Spec](./workstreams/webview-in-app/SPEC.html)       | Self app RN app adopts WebView as its host              |
| SDK Core             | [SDK Core Spec](./workstreams/sdk-core/SPEC.md)                     | Browser-portable engine                                 |
| Native Shells (Lite) | [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) | Kotlin + Swift shells for external SDK consumers        |
| Build Pipeline       | [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md)         | Bundle webview-app into native shells                   |
| SDK Distribution     | [SDK Distribution Spec](./workstreams/sdk-distribution/SPEC.md)     | Hosted URL loading + native shell publishing            |
| RN SDK Packaging     | [RN SDK Packaging Spec](./workstreams/rn-sdk-packaging/SPEC.md)     | Optional NFC/MRZ native modules + capabilities handshake |
| Analytics            | [Analytics Spec](./workstreams/analytics/SPEC.md)                   | Canonical onboarding funnel events + Mixpanel dashboard |
| Monorepo Tooling     | [Monorepo Tooling Spec](./workstreams/monorepo-tooling/SPEC.md)     | pnpm follow-ups, Turborepo, blur dependency swap        |
| Codebase Audits      | [Audits Spec](./workstreams/audits/SPEC.md)                         | Sequential surface audits: findings → issues → fixes    |
| Chrome Extension     | [Chrome Extension Spec](./workstreams/chrome-extension/SPEC.html)     | Spike record: account transfer + browser disclosure proofs |
| Browser Extension v1 | [PRD](./workstreams/chrome-extension/SPEC-PRD.html), [Production Spec](./workstreams/chrome-extension/SPEC-PRODUCTION.html), [UX Spec](./workstreams/chrome-extension/SPEC-UX.html), [User Journey](./workstreams/chrome-extension/SPEC-JOURNEY.html) | Production scoping: store CI, custody, relayer, Euclid UX |

## Paused Workstreams

| Workstream                    | Spec                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Native Shells                 | [Native Shells Spec](./paused/native-shells/SPEC.md)               |
| Native Consolidation          | [Native Consolidation Spec](./paused/native-consolidation/SPEC.md) |
| Integrations / MiniPay Sample | [MiniPay Sample Spec](./paused/integrations/SPEC.md)               |

## Related

- [Paused Work Index](./paused/INDEX.md) — retained native/KMP/RN tracks for future reuse
