# SDK Project

Last updated: March 20, 2026
Status: Active (WebView-first + native keychain/crypto)

## Start Here

1. [SDK Overview](./OVERVIEW.md) — current scope, active architecture, paused-work policy
2. Open the relevant active workstream `SPEC.md` — read `Backlog` and `Active Plans` first
3. Open the linked `plans/<BACKLOG-ID>-<slug>.md` file — execute from that file
4. If you are reviving native/KMP/RN work, open [Paused Work](./paused/INDEX.md) before touching any native spec

## Active Workstreams

| Workstream | Spec | Focus |
| ---------- | ---- | ----- |
| WebView UI | [WebView Spec](./workstreams/webview/SPEC.md) | Sumsub Web SDK integration, KYC result flow |
| SDK Core | [SDK Core Spec](./workstreams/sdk-core/SPEC.md) | Browser-portable engine |
| Native Shells (Lite) | [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) | Plain Kotlin + Swift for keychain/crypto only |
| Build Pipeline | [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md) | Bundle webview-app into native shells |

## Paused Workstreams

| Workstream                    | Spec                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| Native Shells                 | [Native Shells Spec](./paused/native-shells/SPEC.md)               |
| Native Consolidation          | [Native Consolidation Spec](./paused/native-consolidation/SPEC.md) |
| RN SDK                        | [RN SDK Spec](./paused/rn-sdk/SPEC.md)                             |
| Integrations / MiniPay Sample | [MiniPay Sample Spec](./paused/integrations/SPEC.md)               |

## Related

- [Paused Work Index](./paused/INDEX.md) — retained native/KMP/RN tracks for future reuse
