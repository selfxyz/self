## KYC Provider SDK Integration

> Last updated: 2026-03-25
> Status: In Progress (code complete on prior branch, needs rework for Didit)

- Workstream: webview
- Backlog IDs: WV-05
- Owner: TBD
- Branch: TBD (prior Sumsub branch `feat/webview-sdk` is stale)
- PR: TBD

### Current Pass Note

This spec is **not active** in the current design-migration pass. The current
pass mocks the provider handoff. This spec is preserved as future implementation
context for when real KYC provider integration is picked up.

The prior implementation targeted Sumsub (`@sumsub/websdk`). The project has
since migrated to Didit as the KYC provider (see PR #1860). This spec needs
rework to target Didit's Web SDK before implementation resumes.

### Why

- The `ProviderLaunchScreen` is currently a placeholder. The WebView flow needs
  real KYC capture via the provider's Web SDK.
- The KYC provider contract (WV-02) is already spec'd — this implements the
  provider-specific side.
- Didit provides its own capture UI, so there are no Euclid screens to migrate
  for the provider handoff portion of the flow.

### Scope

- Add the Didit Web SDK dependency to webview-app
- Create `packages/webview-app/src/services/kyc/` with provider service,
  result mapper, types, and barrel export
- Rewrite `ProviderLaunchScreen.tsx` to launch the Didit SDK
- Map Didit result to `KycProviderResult` per the WV-02 contract

### Out of Scope

- Native KYC SDK integration (we use the Web SDK in the WebView)
- KYC result → proving pipeline wiring (WV-06)
- Native shell changes
- Changes to `mobile-sdk-alpha` or `webview-bridge`

### Files to Modify

- `packages/webview-app/package.json` — add Didit Web SDK dependency
- `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx` — replace placeholder with real SDK launch
- `packages/webview-app/src/providers/VerificationRequestProvider.tsx` — parse provider config from query params

### Files Not to Modify

- `packages/mobile-sdk-alpha/` — upstream engine
- `packages/webview-bridge/` — upstream bridge

### Preconditions

- WV-02 (KYC provider contract) is done — `KycProviderResult` type and
  normalization rules are defined in the WebView SPEC
- `VerificationRequestProvider` already parses `window.location.search` for
  request params

### Implementation Notes

These notes reflect the general pattern. Specific Didit SDK API details need
to be confirmed against the current Didit Web SDK documentation.

- `ProviderLaunchScreen`: on mount, initialize Didit SDK → render provider
  capture UI → on completion, normalize result → navigate forward. Accept
  `countryCode` and `documentType` from `location.state` for document
  pre-selection.
- Result mapping: normalize Didit terminal states into `KycProviderResult` per
  the WV-02 contract:
  - Provider completed with attestation → `status: 'success'`
  - Provider pending/review states → `status: 'partial'`
  - User closes/cancels → `status: 'cancel'`, `error.code: 'provider_cancelled'`
  - SDK error/timeout → `status: 'error'`, appropriate error code

### Validation

```bash
yarn workspace @selfxyz/webview-app build
```

### Definition of Done

- [ ] Didit Web SDK added to webview-app dependencies
- [ ] `ProviderLaunchScreen` launches Didit SDK and handles completion/cancel/error
- [ ] Didit result normalized into `KycProviderResult` per WV-02 contract
- [ ] Provider config parsed from URL query params
- [ ] `yarn workspace @selfxyz/webview-app build` passes
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-20: Plan created (originally targeting Sumsub).
- 2026-03-21: Sumsub implementation code complete on `feat/webview-sdk`
  (commit `67e5220`). That branch is now stale.
- 2026-03-25: Reframed for Didit migration. Prior Sumsub work is obsolete.
  Spec marked as future logic pass, not part of current design-migration.
