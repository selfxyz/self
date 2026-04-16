# Dynamic Proof Request Items

> Last updated: 2026-03-10
> Status: Done

- Workstream: webview
- Backlog IDs: WV-01
- Owner: WebView UI + Bridge
- Branch: TBD
- PR: TBD

## Why

- The main remaining WebView follow-up is that `ProvingScreen` still hardcodes proof request items.
- This is already called out in the project overview and should have a dedicated pickup file.

## Scope

- Source proving items from the verification request context instead of hardcoded UI data.
- Align screen rendering with the canonical request contract.

## Out of Scope

- new bridge domains
- unrelated screen redesign

## Files to Modify

- `packages/webview-app/**`
- possibly `packages/mobile-sdk-alpha/**` if request context needs exposure
- `specs/projects/sdk/workstreams/webview/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**`
- `packages/rn-sdk/**`

## Preconditions

- Canonical verification request contract remains defined in SDK-level specs.

## Validation

```bash
cd packages/webview-app && npx vite build
cd packages/mobile-sdk-alpha && npx vitest run
```

## Definition of Done

- [x] Proof request items are no longer hardcoded
- [x] Request-context rendering is validated
- [x] Backlog row updated

## Status Log

- 2026-03-10: Created during spec cleanup.
- 2026-03-11: Implemented. Created `VerificationRequestProvider` to parse URL params into a typed `VerificationRequest` context. Refactored `ProvingScreen` to consume the context instead of hardcoding `DEFAULT_PROOF_ITEMS`. Both validation commands pass.
