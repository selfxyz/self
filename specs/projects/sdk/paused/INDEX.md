# SDK Paused Work

Last updated: March 11, 2026
Status: Paused

## Why This Exists

On March 11, 2026 the active SDK delivery scope changed to **WebView only, with no custom native modules**. The native/KMP/RN tracks below are not deleted; they are parked here so the team can revive or reuse them later, especially for Self app or other mobile-first work.

Current active scope lives in:

1. [SDK Overview](../OVERVIEW.md)
2. [WebView Spec](../workstreams/webview/SPEC.md)
3. [SDK Core Spec](../workstreams/sdk-core/SPEC.md)

## Paused Workstreams

| Workstream                    | Why Paused                                                         | Reuse Signal                                                   | Spec                                                        |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Native Shells                 | Current client does not want custom native modules or KMP delivery | Likely candidate for future Self app or mobile-native reuse    | [Native Shells Spec](./native-shells/SPEC.md)               |
| Native Consolidation          | MRZ/NFC/native wrapper cleanup is no longer on the critical path   | Useful if native capture work resumes                          | [Native Consolidation Spec](./native-consolidation/SPEC.md) |
| RN SDK (superseded)           | Revived 2026-05-19 under `webview-in-app` workstream               | See [webview-in-app](../workstreams/webview-in-app/SPEC.html)  | [Historical RN SDK Spec](./rn-sdk/SPEC.md)                  |
| Integrations / MiniPay Sample | Depends on the paused KMP shell                                    | Can resume if Kotlin sample integrations become relevant again | [MiniPay Sample Spec](./integrations/SPEC.md)               |

## Usage Rule

Do not execute against paused specs by default. Only reopen them when product scope explicitly returns to native-shell delivery or when you are reusing the work for Self app/mobile-native efforts.
