# PR Audit — feat/euclid-settings-screens-rd2

> Date: 2026-03-23
> Branch: `feat/euclid-settings-screens-rd2`
> Base: `dev`
> PR: #1858
> Reviewers: Claude Code, Codex
> Status: Ship as-is with follow-up issues for known gaps

## Follow-up Issues

| Issue                                                        | Priority | Title                                                                          |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| [SELF-2357](https://linear.app/selfprotocol/issue/SELF-2357) | Urgent   | Euclid migration — complete euclid-web → euclid and validate API compatibility |
| [SELF-2358](https://linear.app/selfprotocol/issue/SELF-2358) | High     | Sumsub / WV-05 contract compliance                                             |
| [SELF-2359](https://linear.app/selfprotocol/issue/SELF-2359) | High     | Tunnel + proving flow data propagation and UI contract fixes                   |
| [SELF-2360](https://linear.app/selfprotocol/issue/SELF-2360) | Medium   | Settings persistence, test coverage, and doc/spec cleanup                      |

Each issue has a spec attached as a Linear document.

## Summary

This PR adds Euclid 3.0 settings sub-screens (Security, Notifications, Dev Mode), a PoC tunnel flow, the `euclid-web` → `euclid` migration, and a Sumsub Web SDK integration in the provider launch flow. It ships with known gaps that are tracked as follow-up issues.

## Merged Findings

Findings from both Claude Code and Codex reviews, deduplicated and grouped by follow-up issue.

### Issue 1: Euclid migration — complete `euclid-web` → `euclid` and validate exports

**Severity:** Critical (build-breaking)

- 3 settings screen components (`SecurityScreen`, `NotificationPreferencesScreen`, `DevModeScreen`) are imported from `@selfxyz/euclid` but not yet exported from the package
- `LaunchTour1Screen`–`LaunchTour4Screen` don't exist — Euclid only exports a single `TourScreen`
- `ProofGenerationScreen` doesn't exist — only a `ProofGeneration` component (not a screen wrapper)
- ~~`ProviderResultScreen` still imports from `@selfxyz/euclid-web`~~ — **fixed** (migrated to `@selfxyz/euclid`)
- ~~`ProviderLaunchScreen` still imports from `@selfxyz/euclid-web`~~ — **fixed** (migrated to `@selfxyz/euclid`, removed unused `BodyText`)
- Multiple screens migrated from `euclid-web` to `euclid` — blast radius is package-wide, not just settings
- `euclid-web` is being retired; all imports should use `@selfxyz/euclid`
- Settings handover doc (`docs/superpowers/plans/2026-03-22-settings-handover.md (legacy location)`) says the app still imports `euclid-web` — stale

**Acceptance criteria:**

- All imports use `@selfxyz/euclid`, zero references to `euclid-web`
- All imported screen components exist in Euclid's exports
- `yarn workspace @selfxyz/webview-app build` passes

### Issue 2: Sumsub / WV-05 contract compliance

**Severity:** High (incorrect behavior)

- `normalizeSumsubStatus()` marks `reviewAnswer === 'GREEN'` as `status: 'success'` without requiring `attestation` — breaks the KYC contract
- `onApplicantSubmitted` emits `status: 'partial'` through the `onComplete` callback (not `onError`), so `ProviderResultScreen` treats it as success and routes to `/proving`
- `emitOnce` guard means if `onApplicantSubmitted` fires before `applicantReviewComplete`, the actual terminal status is silently dropped
- `ProvingScreen` fabricates a successful `VerificationResult` without consuming any provider attestation payload
- `teeUrl` not parsed from launch URL/query params — `fetchSumsubAccessToken()` uses `VITE_SUMSUB_TEE_URL` or hardcoded default
- `fetchSumsubAccessToken` signature doesn't accept `teeUrl` as a parameter — even after parsing, plumbing is missing
- Token refresh callback in `launchSumsubWebSdk` (line 167) also calls `fetchSumsubAccessToken()` with no args — refresh hits hardcoded URL too
- `sumsub-websdk.d.ts` custom type declaration added — unclear if it matches actual SDK API or is a stub
- WV-05 plan says "code complete, needs testing" but `teeUrl` isn't parsed, service file structure wasn't created, and normalization doesn't match the contract
- Invalid step value: `TunnelProvingScreen` passes `step="generatingProof"` — valid values are `"registeringId" | "generatingProof1" | "awaitingVerification" | "finishingUp"`

**Acceptance criteria:**

- `normalizeSumsubStatus` requires attestation for `success`
- `partial` status blocked from entering proving flow
- `teeUrl` parsed from query params, threaded into token fetch and refresh
- WV-05 plan status downgraded to "partial implementation"

### Issue 3: Tunnel flow correctness and state propagation

**Severity:** High (data loss / broken UX)

- Selected ID type discarded in `TunnelIDTypeScreen.onIDTypeSelect` — ignores the param, always navigates to `/tunnel/proof/receipt`
- State passed via `location.state` is fragile — lost on refresh or direct navigation, no fallback or route guard
- `TunnelProofReceiptScreen` passes invalid `documentType="passport"` prop to `ProofRequestScreen` (not a valid prop)
- `TunnelProofReceiptScreen` mock items lack icons and `onInfoPress` callbacks
- `KycMockScreen` is raw HTML divs with inline styles instead of Euclid components
- `TunnelResultScreen` missing `animationSource` (Lottie) — uses icon only
- `Date.now()` in `TunnelProofReceiptScreen` creates new timestamp on every render
- Main proving flow (`ProvingScreen.tsx`) hardcodes `documentType='passport'` — affects primary flow, not just tunnel

**Acceptance criteria:**

- ID type selection persisted and forwarded through the tunnel chain
- Screens handle missing state gracefully (redirect or error)
- Correct Euclid component props used throughout

### Issue 4: Settings persistence and bridge-backed actions

**Severity:** Medium (non-functional features)

- `SecurityScreen` backup state is hardcoded `false` — should query actual state from bridge/storage
- `SecurityScreen` handlers for backup, recovery phrase, restore all navigate to `/coming-soon`
- `NotificationPreferencesScreen` toggles are local `useState` — lost on reload, never persisted
- `DevModeScreen` mock config is local state — lost on reload
- `DevModeScreen` "Generate mock document" fires analytics but doesn't create or store anything
- `SettingsScreen` "Manage Documents", "Get support", "Share Self" all navigate to `/coming-soon`

**Acceptance criteria:**

- Settings state backed by bridge/storage where applicable
- Placeholder routes documented as intentional

### Issue 5: Test coverage

**Severity:** Medium

- No tests for Sumsub normalization/result mapping (`normalizeSumsubStatus`, `buildProviderResult`)
- No route tests for tunnel flow progression
- No smoke tests for settings wrapper navigation and action wiring
- No tests for provider launch/result flow

**Acceptance criteria:**

- Unit tests for Sumsub normalization logic
- Route/navigation tests for tunnel flow
- Smoke tests for settings screens

### Issue 6: Doc/spec drift

**Severity:** Low

- Settings handover doc (`docs/superpowers/plans/2026-03-22-settings-handover.md (legacy location)`) is stale — references `euclid-web`, understates scope
- Settings integration plan (`docs/superpowers/plans/2026-03-22-settings-screen-integration.md (legacy location)`) scoped to settings only but branch includes tunnel/provider/migration
- WV-05 plan status overstated
- Orphaned route: `/onboarding/confirm` defined in App.tsx but never navigated to

**Acceptance criteria:**

- Docs reflect actual branch state
- WV-05 status corrected
- Orphaned route removed or documented

## Actionable PR feedback (CodeRabbit + Codex connector)

Extracted from PR #1858 inline comments. Items already covered above are not repeated.

### Build-breaking (addressed in this branch)

- **`@selfxyz/euclid-web` removed from `package.json` but still imported** — `ProviderLaunchScreen` and `ProviderResultScreen` still referenced it. Both migrated to `@selfxyz/euclid` in this branch. (CodeRabbit P1, Codex connector P1)

### Actionable (not yet addressed)

- **`TunnelIDTypeScreen`: pass selected `idType` to next screen** — `onIDTypeSelect` ignores the param. Suggested fix: `navigate('/tunnel/proof/receipt', { state: { documentType: idType.id } })`. (CodeRabbit, mapped to Issue 3)
- **`TunnelProofReceiptScreen`: read document type from route state** — Currently hardcodes `documentType="passport"`. Should read from `location.state` with fallback. (CodeRabbit, mapped to Issue 3)
- **`NotificationPreferencesScreen`: persist toggles** — Use `storage` adapter from `useSelfClient()` to save/load preferences. (CodeRabbit, mapped to Issue 4)
- **`DevModeScreen`: mock document generation is a no-op** — Should either persist the mock or show a toast indicating the feature isn't functional yet. (CodeRabbit, mapped to Issue 4)

### Nitpicks (low priority)

- **`NotificationPreferencesScreen`: memoize toggle handlers** — `toggles` array recreated every render. `useMemo` with `toggleValues` as dependency would be cleaner.

## What works well

- Route wiring is clean — every route has a file, every `navigate()` targets a defined route
- Settings menu restructure (App settings / Support & feedback / Developer tools) is well-organized
- Sumsub SDK lifecycle management (mount/destroy/abort) is properly handled
- Analytics events are consistently tracked across all screens
- `emitOnce` pattern prevents duplicate callbacks (though it has the silenced-review-status side effect)
