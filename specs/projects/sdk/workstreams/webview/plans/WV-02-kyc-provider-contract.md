# KYC Provider Contract

> Last updated: 2026-03-11
> Status: Done

- Workstream: webview
- Backlog IDs: WV-02
- Owner: WebView / Product Platform
- Branch: `justin/kmp-wv-02`
- PR: n/a (spec-only)

## Why

- The active SDK scope now delegates document capture, MRZ extraction, liveness, and related KYC steps to a web-capable provider instead of Self-owned native modules.
- `WV-03` depends on this contract. Active screens and copy should not be rewritten until the provider boundary is explicit.
- `WV-04` should build on this plan so host callback work only defines the remaining WebView-host delta, not a second source of truth for provider return data.

## Scope

- Define the provider-facing contract for launching capture/KYC from the WebView flow.
- Define the minimum request payload Self sends to the provider flow.
- Define the normalized result payload Self expects back from the provider flow.
- Define failure, cancellation, timeout, and partial-completion semantics.
- Record where provider-owned MRZ/liveness data enters the Self proof flow and what fields are required downstream.
- Update the active WebView spec so provider ownership is explicit wherever native scanning used to be assumed.

## Out of Scope

- Implementing a specific vendor SDK or hosted flow
- New native modules, bridge handlers, or KMP/RN shell work
- Final host callback transport details beyond the provider-result payload needed by `WV-04`

## Files to Modify

- `specs/projects/sdk/workstreams/webview/SPEC.md`
- `specs/projects/sdk/OVERVIEW.md`
- optional follow-up references in active specs if the provider contract changes terminology

## Files Not to Modify

- `specs/projects/sdk/paused/**`
- `packages/kmp-sdk/**`
- `packages/rn-sdk/**`
- native MRZ/NFC implementation files

## Preconditions

- Current client scope remains WebView-only with no custom native modules.
- Existing `SdkInitialConfig`, `VerificationRequest`, and `VERIFICATION_COMPLETE` surfaces remain the baseline callback primitives; this plan defines the provider contract that feeds them.

## Questions to Resolve

- **Is the active spec provider-agnostic, or do we name a specific provider?** Keep the contract provider-agnostic. The current provider is Didit, but the contract should not be Didit-specific.
- **Does the provider return directly into the same WebView route, a hosted callback URL, or a parent-frame/host postMessage handoff?** The provider must return control to a Self-owned route/callback inside the same WebView/browser verification session. Self normalizes that payload inside the web flow before any host callback. Direct provider-to-host handoff is not part of WV-02.
- **Which provider outputs are required for downstream Self proof steps versus stored only as KYC evidence?** Self proof steps only require the provider attestation payload that can be stored as `KycData`: `serializedApplicantInfo`, `signature`, and `pubkey`. Correlation fields such as `verificationId`, `providerSessionId`, and `providerApplicantId` are required for lifecycle/support handling but are not proof inputs. Raw capture artifacts such as MRZ text, photos, liveness media, review traces, and OCR diagnostics remain provider evidence and are not part of the proof contract.
- **What is the canonical cancellation/error mapping from provider outcomes into Self result semantics?** Provider outcomes normalize to four Self statuses: `success` when the attestation payload is complete, `partial` when the provider flow ends without the required proof payload or remains pending review, `cancel` for explicit user/provider cancellation, and `error` for timeout, transport, protocol, or provider failures. Implementation must distinguish `partial` states that are still review-pending from `partial` states caused by missing required attestation data, because only the former may resolve without a new provider session.

## Validation

```bash
rg -n "NFC|MRZ|native scan|camera" specs/projects/sdk/workstreams/webview/SPEC.md specs/projects/sdk/OVERVIEW.md
```

Expected result:

- provider-owned capture language is explicit
- active specs no longer imply Self-managed native capture for the current client path

## Definition of Done

- [x] Provider launch/request contract is documented
- [x] Provider result/cancel/error contract is documented
- [x] Downstream fields required by the Self flow are identified
- [x] `WV-03` has enough information to remove stale native-scan assumptions
- [x] WebView spec backlog and notes align with the resulting contract

## Status Log

- 2026-03-11: Created after scope reset review identified it as the critical blocker for `WV-03`.
- 2026-03-11: Resolved the provider-agnostic launch/result contract, defined the required KYC attestation payload for downstream proof work, and aligned active WebView/overview specs with provider-owned capture.
