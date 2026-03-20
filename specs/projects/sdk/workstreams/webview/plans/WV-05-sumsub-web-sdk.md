## Sumsub Web SDK Integration

> Last updated: 2026-03-21
> Status: In Progress (code complete, needs testing)

- Workstream: webview
- Backlog IDs: WV-05
- Owner: TBD
- Branch: feat/webview-sdk
- PR: TBD

### Why

- The `ProviderLaunchScreen` is currently a placeholder. The WebView flow needs real KYC capture via Sumsub's Web SDK.
- The RN app already has Sumsub integration (`app/src/integrations/sumsub/sumsubService.ts`) — this is the WebView equivalent using Sumsub's browser-compatible Web SDK instead of the native mobile SDK.
- The KYC provider contract (WV-02) is already spec'd — this implements the Sumsub-specific side.

### Scope

- Add `@sumsub/websdk` dependency to webview-app
- Create `packages/webview-app/src/services/sumsub/` with: `sumsubWebService.ts`, `mapSumsubResult.ts`, `types.ts`, `index.ts`
- Rewrite `ProviderLaunchScreen.tsx` to use Sumsub Web SDK
- Parse `teeUrl` from URL query params in `VerificationRequestProvider`

### Out of Scope

- Native Sumsub SDK integration (we use the Web SDK in the WebView)
- KYC result → proving pipeline wiring (WV-06)
- Native shell changes
- Changes to `mobile-sdk-alpha` or `webview-bridge`

### Files to Modify

- `packages/webview-app/package.json` — add `@sumsub/websdk`
- `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx` — replace placeholder
- `packages/webview-app/src/providers/VerificationRequestProvider.tsx` — parse `teeUrl` query param

### Files Not to Modify

- `packages/mobile-sdk-alpha/` — upstream engine
- `packages/webview-bridge/` — upstream bridge
- `app/src/integrations/sumsub/` — RN app reference only

### Preconditions

- WV-02 (KYC provider contract) is done — `KycProviderResult` type and normalization rules are defined in the WebView SPEC
- `VerificationRequestProvider` already parses `window.location.search` for request params

### Implementation Notes

- `fetchAccessToken(teeUrl: string)`: POST to `${teeUrl}/access-token`, same endpoint as `app/src/integrations/sumsub/sumsubService.ts:44`. Returns `{ token: string, userId: string }`.
- `launchSumsubWebSdk(config)`: creates Sumsub Web SDK instance via `@sumsub/websdk`, mounts into a container DOM element, returns a Promise that resolves with a `KycProviderResult` when the user completes/cancels.
- `mapSumsubResult.ts`: normalizes Sumsub Web SDK status events into `KycProviderResult` per the WV-02 contract at `specs/projects/sdk/workstreams/webview/SPEC.md:126-152`:
  - Sumsub `applicantReviewStatus === 'completed'` with attestation → `status: 'success'`
  - Sumsub pending/review states → `status: 'partial'`
  - User closes/cancels → `status: 'cancel'`, `error.code: 'provider_cancelled'`
  - SDK error/timeout → `status: 'error'`, appropriate error code
- `ProviderLaunchScreen`: on mount, fetch token → render Sumsub SDK container → on completion, normalize result → navigate forward. Accept `countryCode` and `documentType` from `location.state` for document pre-selection (same pattern as RN version at `sumsubService.ts:124-142`).
- Config delivery: native shell passes `teeUrl` as URL query param. `VerificationRequestProvider` parses it and exposes via context.

### Validation

```bash
yarn workspace @selfxyz/webview-app build
```

### Definition of Done

- [ ] `@sumsub/websdk` added to webview-app dependencies
- [ ] `ProviderLaunchScreen` mounts Sumsub Web SDK and handles completion/cancel/error
- [ ] Sumsub result normalized into `KycProviderResult` per WV-02 contract
- [ ] `teeUrl` parsed from URL query params
- [ ] `yarn workspace @selfxyz/webview-app build` passes
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-20: Plan created.
- 2026-03-21: Code complete on `feat/webview-sdk` (commit `67e5220`). ProviderLaunchScreen rewritten with Sumsub Web SDK, ProviderResultScreen added, KYC types defined. Needs integration testing with live Sumsub access token.
