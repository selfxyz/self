# AUD-09 — WebView app surface audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (structural pre-draft; carries named placeholders for AUD-05 outputs; requires recon refresh + owner re-review at activation)
> Priority: High
> Depends on: AUD-05 (adapter coupling-seam map, origin-trust findings, hosting-posture decision — see Placeholders)
> Time box: 4 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests only. Target <1k LOC of test code
> (Vitest, under `packages/webview-app/tests/`).

## Context

You are auditing the **WebView app** (`packages/webview-app`, ~10k LOC of TS/TSX) — the Vite/React
SPA that is the WebView engine's UI. It is the consumer side of the bridge AUD-05 audits: it parses
verification requests from URL params, decides its operating mode from host config, drives
onboarding/KYC/proving/recovery flows, holds the mnemonic in JS during reveal and recovery, and
delivers verification results back over `lifecycle.setResult`. One build ships to **two hosts**:
remotely deployed (`https://self-app-alpha.vercel.app`, Vercel SPA rewrites) and embedded into
`packages/rn-sdk` via `copy-assets` (which **strips SRI** from the embedded copy). Every finding
must state which host(s) it applies to — the threat models differ.

The CLAUDE.md invariants this audit measures against: **keychain is native-managed, no web fallback
for secure storage**; **fail closed on security boundaries**; **the bridge protocol is the only
coupling** (the app must not know which shell it runs in). The app-specific risk concentration is
different from AUD-05's: here the dominant pattern is **dev/preview affordances adjacent to
production flows** — a mock-ID generator reachable from Settings, `?mock=` URL params that skip
KYC, a debug screen that can wipe the keychain — where the only thing separating them from
production users is a build-time flag, a mode check, or (in one confirmed case) nothing at all.

Reconnaissance (2026-06-11) read the routing/provider layer, secret-handling files, KYC and proving
flows, and build/observability config at the cited lines and produced the suspected-issue list
embedded in the question list. Treat every "suspected" item as unverified: confirm or refute each
with a trace or a reproduction, per the workstream's evidence standard.

## Placeholders (filled at activation recon refresh — plan cannot pass activation review until all are filled)

- **[AUD-05:Q5 coupling-seam map]** — which `webview-bridge` adapters the app legitimately
  imports and the validated response shapes at the seam. Feeds Q2 and Q3 (what the app may trust
  from a bridge response).
- **[AUD-05:Q1 origin-trust findings]** — host-side conclusions on who can drive the bridge
  (esp. AUD-05 Q1.3 global `_handleResponse` injectability and Q1.4 `BrowserHostTransport`
  wildcard-origin reachability). Feeds Q2.1's "can a non-host satisfy `getConfig`" question.
- **[AUD-05:Q2.4 hosting-posture decision]** — the owner decision on remote-vs-embedded loading
  posture. Feeds Q6.1 (which integrity/CSP story each host needs).

## Scope

### In scope (the complete file inventory; LOC verified 2026-06-11)

| Area                                      | Files                                                                                                                                                                                                                                                  | LOC    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| App shell & routing                       | `src/App.tsx` (309), `src/main.tsx` (39), `src/components/{BootDecision,decideBootRoute,InitialRouteRedirect,ModeRoute,modeDispatch}.{ts,tsx}`                                                                                                         | 609    |
| Providers                                 | `src/providers/{BridgeProvider,OperatingModeProvider,SelfClientProvider,VerificationRequestProvider}.tsx`                                                                                                                                              | 324    |
| Dev/preview/mocking surfaces              | `src/components/{DevRouteMenu,MockRegistrationFailureButton,PasswordGate}.tsx`, `src/screens/debug/KeychainDebugScreen.tsx`, `src/screens/account/DevModeScreen.tsx`, `src/utils/{mockDocumentStore,mockOnboardingFlow}.ts`                            | 1,189  |
| Secret handling                           | `src/utils/secretManager.ts` (180), `src/screens/recovery/*.tsx` (951), `src/screens/account/SecurityScreen.tsx` (84)                                                                                                                                  | 1,215  |
| Verification request & proving            | `src/utils/{verificationRequest,provingUtils,selfAppContext}.ts` (361), `src/screens/proving/*.tsx` (700), `src/utils/{clusterClose,clusterCloseRegistry}.ts` (152), `src/types/navState.ts` (55)                                                      | 1,268  |
| KYC provider chain                        | `src/utils/{kycProvider,kycAttestation,buildKycDocument}.ts` (273), `src/types/kycProvider.ts` (38), `src/screens/onboarding/{ProviderLaunchScreen,ProviderResultScreen,KycFailureScreen}.tsx` (562)                                                   | 873    |
| Embed flows                               | `src/screens/embed/*.tsx`                                                                                                                                                                                                                              | 956    |
| Remaining onboarding/home/account screens | `src/screens/onboarding/**` (rest), `src/screens/home/*`, `src/screens/account/{SettingsScreen,NotificationPreferencesScreen}.tsx`, `src/screens/points/*`                                                                                             | ~1,900 |
| Observability & build                     | `src/config/sentry.ts` (80), `src/observability/*` (70), `src/utils/assetPathShim.ts` (62), `vite.config.ts`, `index.html`, `vercel.json`, `packages/rn-sdk/scripts/strip-embedded-sri.cjs` + `copy-assets` script (`packages/rn-sdk/package.json:27`) | ~400   |
| Existing tests                            | `src/test/sri.test.ts` (70), `src/utils/{verificationRequest,provingUtils}.test.ts` (347), `tests/**` (23 files, 4,075)                                                                                                                                | 4,492  |

### Out of scope

- The **bridge itself** — transport, schema, version gating, escape correctness, native handlers.
  That is AUD-05. You consume its coupling-seam map and origin-trust findings via the placeholders;
  where a question here reaches the bridge boundary (e.g. "can a forged `getConfig` response..."),
  you cite the AUD-05 finding and stop at the adapter interface.
- `@selfxyz/mobile-sdk-alpha` internals (proving state machine, `generateMockDocument`,
  `storePassportData`, `redactSensitiveFields` implementations). You audit how the app **calls**
  them and what it trusts in return; SDK-internal correctness findings route to the SDK
  workstream as `Needs investigation` leads.
- The Didit Web SDK's internals and the KYC TEE server. You audit the app-side trust assumptions
  (what statuses it accepts, what it does with unauthenticated attestation payloads), not the
  third-party code.
- The Euclid component library (rendering/sanitization internals) — but Q3.1 traces what
  app-controlled strings reach Euclid props, and an unsanitized sink found there becomes a
  `Needs investigation` lead for the owning repo.
- The mobile app's WIA host screen (`app/src/...`) — AUD-03/AUD-05 territory.
- Fixing anything. The workstream invariant is read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Dev surfaces reachable in production (the headline question)

1. **Q1.1 (suspected Critical).** The mock-ID generator has **no DEV gate at all**. The route is
   mode-gated only (`App.tsx:258` — `ModeRoute({ mode: 'self-app', path: '/settings/dev-mode' })`),
   the Settings screen renders an unconditional "Developer tools" section linking to it
   (`SettingsScreen.tsx:104-137`, "Manage mock IDs, simulate proofs"), and `DevModeScreen.tsx:70-85`
   calls `generateMockDocument({ ..., isInOfacList: !ofacCheck, ... })` — an **OFAC toggle** — then
   persists via `storePassportData(client, mockDoc)`. Establish: (a) is this screen reachable in the
   shipped production self-app build on both hosts; (b) can a mock document generated here register
   on-chain or produce accepted proofs, or does it fail server/registry-side verification; (c) what
   marks a mock document as mock downstream. If (a) and (b) both hold this is the fast-path
   scenario; if (b) fails closed server-side, classify by what the user can still do with it.
2. **Q1.2 (suspected Major).** Everything else dev is gated on `import.meta.env.DEV` — a build-time
   constant. Prove a shipped artifact cannot carry `DEV=true`: trace the only two build paths
   (`vercel.json` `buildCommand` → `yarn workspace @selfxyz/webview-app run build` = `tsc --noEmit
&& vite build`, `package.json:7`; and `packages/rn-sdk` `copy-assets` which copies
   `../webview-app/dist/.`, `packages/rn-sdk/package.json:27`), check nothing passes
   `--mode development`, and **inspect the built `dist/` bundle** for the DEV-gated strings.
   Enumerate the blast radius if the gate ever fails — this list is the DEV-surface inventory
   deliverable: `/dev/keychain` route (`App.tsx:290`) whose screen offers "Dump All Keys" and
   "Clear Entire Keychain" (`KeychainDebugScreen.tsx:281-286`, dump logic `:164-191`); `?mock=`
   KYC bypass (`EmbedKycWrapper.tsx:37-45` navigates to `/disclose/kyc-success` with a fabricated
   `providerResult`; `mockOnboardingFlow.ts:19` `MOCKS_ENABLED = import.meta.env.DEV`); wildcard
   bridge `targetOrigin` default (`BridgeProvider.tsx:25-32` — `?? (isDev ? '*' : undefined)` and
   `allowWildcard: isDev`); `DEV_FAKE_MNEMONIC`, a valid 24-word BIP39 phrase in source
   (`RecoveryPhraseScreen.tsx:49-50`); `MockRegistrationFailureButton` rendered on 11 onboarding
   screens (gate at `MockRegistrationFailureButton.tsx:15`); the `/disclose/kyc-pending` dev-only
   embed variant (`App.tsx:231-235`).
3. **Q1.3 (suspected Medium).** `PasswordGate` wraps the whole app (`App.tsx:308`) but is a
   preview gate, not a security boundary: the password is a build-time env var compiled into the
   bundle (`PasswordGate.tsx:11`), the unlock flag is plain `sessionStorage`
   (`PasswordGate.tsx:21` — settable from any console), and an unset password means no gate
   (`:13`). Confirm nothing security-relevant assumes this gate holds, and that the preview
   password env var is not set on production deploys (where it would leak in the bundle).
4. **Q1.4 (suspected Low).** `DevRouteMenu` (252 LOC) is referenced only from tests
   (`tests/screens/home/homeSupportScreens.test.tsx:11`) — apparently dead in the app tree.
   Confirm and record as a cruft lead for AUD-06; its route list also documents the intended dev
   surface, useful for the Q1.2 inventory.

### Q2 — Host-config and operating-mode trust

1. **Q2.1.** The app's mode, `verificationRequest`, and `referenceId` come from a single
   `bridge.request('lifecycle', 'getConfig', {}, 800ms)` (`OperatingModeProvider.tsx:55-80`). The
   failure path defaults to `self-app` with a null request — verify that is the fail-closed
   direction (embed requires explicit host signaling). Then, using
   **[AUD-05:Q1 origin-trust findings]**, establish whether any non-host code path (browser-host
   transport, injected global handlers) can satisfy `getConfig` and force embed mode with an
   attacker-supplied `verificationRequest`/`referenceId` — and what that attacker gains
   (embed-only routes, result delivery to a wrong recipient).
2. **Q2.2.** Boot and mode enforcement: `decideBootRoute.ts:36-56` fail-closes invalid embed
   requests to `/embed/error`; `hasValidVerificationRequest` (`OperatingModeProvider.tsx:107-114`)
   requires only non-empty `userId` and `scope`. Confirm that minimal validation is sufficient for
   every consumer of the request object, and that `ModeRoute` cross-mode access (self-app route in
   embed mode and vice versa) denies rather than degrades (tests exist:
   `tests/components/ModeRoute.test.tsx`).
3. **Q2.3.** `referenceId` falls back to a URL param (`OperatingModeProvider.tsx`,
   `referenceIdFromUrl()`) and flows into Sentry tags (`sentry.ts:68-74`) and the support-reference
   UI. Confirm `sanitizeTagValue` is applied on every path and that an attacker-chosen
   `referenceId` cannot poison support triage or cross-link another user's session.

### Q3 — Verification-request parsing and result delivery

1. **Q3.1 (suspected Medium).** Pass-through URL params with no content validation: trace each to
   its sink and classify. `userDefinedData`/`selfDefinedData` (`verificationRequest.ts:70-71` →
   `selfAppContext.ts:72-73` → SDK `SelfApp`); `appName` (`verificationRequest.ts:76`, default
   `'Verification'` → rendered in Euclid result-screen props, e.g. `DiscloseResultScreen.tsx:94`);
   `verificationId` (`verificationRequest.ts:81` → `ProviderLaunchScreen.tsx:43` → KYC session
   config and the returned result object); `excludedCountries` (`verificationRequest.ts:168-172`,
   no ISO-code check); `minimumAge` (`selfAppContext.ts:29-32`, unbounded `parseInt`). A string
   that reaches an HTML, log, or native sink unsanitized is a finding; one the SDK validates
   downstream is a documented assumption.
2. **Q3.2.** `appEndpoint` normalization (`verificationRequest.ts:108-129`) allows https, localhost
   with port, or `0x` contract addresses; `normalizeTargetOrigin` (`:131-140`) rejects `'*'`
   unless `allowWildcard`. Confirm no scheme/userinfo/encoding bypass survives normalization, and
   reconcile the celo/`endpointType` consistency rules (`:111-127`) with `selfAppContext.ts:41-49`
   inference.
3. **Q3.3.** Result integrity: success/failure results are built from `location.state` (in-memory
   router state) with `resultType` hardcoded, not URL-driven — `DiscloseResultScreen.tsx:32-57`,
   `EmbedResultScreen.tsx:42-112`, `VerificationResultScreen.tsx:21-48`. Confirm **no** production
   route lets URL params fabricate a delivered success (`?mock=` paths are Q1.2's contingency),
   that `lifecycle.setResult` + `dismiss` ordering cannot double-deliver or deliver-then-continue,
   and that `ProofGenerationRouteScreen.tsx:106-115` (navigates with `success: true` keyed on SDK
   state `'completed'`) cannot fire on a stale or replayed state transition.
4. **Q3.4 (suspected Low).** Cluster close infers the close target from the pathname
   (`clusterCloseRegistry.ts:85-91`; `clusterClose.ts:42-48` sends `{ success: false, error }` via
   `setResult` in embed mode). Trace whether a mismatched inference can send the wrong error code
   (or a dismiss without a result) to the host on a real path.

### Q4 — KYC provider and attestation trust chain

1. **Q4.1 (suspected Major).** Didit status mapping fails **open** on unknown statuses: in the
   `onComplete` callback, `'Declined'` → error, but everything else completes as
   `status === 'Approved' ? 'success' : 'partial'` (`kycProvider.ts:95-118`) — a `'Pending'`,
   `'In Review'`, or never-seen status becomes `'partial'`, and `ProviderLaunchScreen.tsx:60-95`
   treats both `'success'` and `'partial'` as eligible to await the attestation. Enumerate Didit's
   actual status vocabulary, trace exactly what `'partial'` unlocks end-to-end, and determine
   whether an unexpected status should default-deny.
2. **Q4.2 (suspected Major).** The attestation channel is an unauthenticated Socket.IO connection:
   `waitForKycAttestation` connects to `KYC_TEE_URL`, emits `subscribe` with only the `sessionId`,
   and accepts a `success` payload `{ signature, applicantInfo, pubkey }` with **no validation**
   (`kycAttestation.ts:26-56`) before `buildKycDocument` (`buildKycDocument.ts:30-42`, fixed
   byte-offset parsing `:17-24`) and `storePassportData` (`ProviderLaunchScreen.tsx:69`). Establish:
   (a) sessionId entropy and issuance (`createKycSession`, `kycProvider.ts:36-71` — the response
   body is type-coerced without validation, `:56-60`); (b) where, if anywhere, the attestation
   signature/pubkey is verified before the document is stored — at store time or only later at
   registration; (c) what a forged or malformed attestation does (store-then-fail vs reject). The
   fail-closed invariant says verification belongs before persistence.
3. **Q4.3.** `session.url` from the TEE response is handed to the Didit SDK unvalidated
   (`kycProvider.ts:141-146`). `KYC_TEE_URL` is env-pinned, so this is a trusted-server assumption
   — document it explicitly, including what a compromised/MITM'd TEE response could load.
4. **Q4.4.** `ProviderResultScreen` and the embed KYC screens consume `providerResult` from
   navigation state. Confirm the only producers are the real provider callback and the Q1.2
   mock path — i.e., no production route fabricates a provider result.

### Q5 — Secret handling vs the keychain-native invariant

1. **Q5.1.** Recon found **no web-storage fallback for secrets**: all persistence goes through the
   bridge storage adapter (`secretManager.ts`, keys `self_private_key`/`self_mnemonic` at
   `:15-18`); `sessionStorage` is used only for mock documents (`mockDocumentStore.ts:25,34`) and
   the preview-gate flag. Re-verify by exhaustive grep (`localStorage|sessionStorage|indexedDB`)
   and pin the invariant with a guard test (mirroring the existing
   `tests/guards/sentryImportBoundary.test.ts` pattern) if none exists.
2. **Q5.2.** Mnemonic residency in JS: held in React state during reveal with **no unmount
   cleanup** (`RecoveryPhraseScreen.tsx:192`, `:249`); recovery input clears state in a `finally`
   (`SecretPhraseInputScreen.tsx:76`, `:283-285`); full phrase copied to the OS clipboard on user
   action (`RecoveryPhraseScreen.tsx:220`, `:277`). Classify against a stated threat model (WebView
   memory inspection, Sentry replay, clipboard managers) — JS cannot zero strings, so findings here
   are about _unnecessary_ retention/exposure, not the impossible. Verify the `PrivacyMask`
   wrapping actually covers every mnemonic-rendering element (ties to Q6.3).
3. **Q5.3.** `DEV_FAKE_MNEMONIC` (`RecoveryPhraseScreen.tsx:49-50`) is a valid BIP39 phrase in
   source. Confirm it is tree-shaken out of the production `dist/` bundle (part of the Q1.2 bundle
   inspection) and assess whether anything could ever derive/fund an identity from it.
4. **Q5.4.** `KeychainDebugScreen` dumps the first 20 chars of the private key and offers a
   one-tap full keychain wipe (`KeychainDebugScreen.tsx:164-191`, `:281-286`). Severity is
   contingent on Q1.2's gate proof; even DEV-only, assess whether the partial-key dump should be
   redacted (screenshots/screen-recording of dev sessions).
5. **Q5.5.** `secretManager` maintains mnemonic/private-key pairing atomically with a rollback
   path that clears both keys on rollback failure (`secretManager.ts:147`); tests exist
   (`tests/utils/secretManager.test.ts`, 324 LOC). Verify the rollback cannot strand a user with
   cleared keys but a registered identity (permanent loss scenario), and that
   `SelfClientProvider.tsx:91`'s boot-time `ensureSecret()` failure path (`:92`, log-and-continue)
   leaves the app in a safe state rather than a half-initialized one.

### Q6 — Build integrity and observability

1. **Q6.1 (suspected Major).** Integrity story is asymmetric and incomplete: the Vite SRI plugin
   hashes the remote bundle (`vite.config.ts:18-57`, pinned by `src/test/sri.test.ts`) but there is
   **no CSP** anywhere (`vercel.json` has rewrites only, no `headers`; `index.html` has no CSP
   meta) — SRI without CSP does not constrain injected scripts; and the embedded copy **strips**
   `integrity`/`crossorigin` entirely (`packages/rn-sdk/scripts/strip-embedded-sri.cjs` — required
   because WKWebView fails SRI over `file://`) with no replacement (no manifest hash, no signature
   beyond platform app signing). Using **[AUD-05:Q2.4 hosting-posture decision]**, state what
   integrity each host actually needs and what is missing. The report must force an owner decision
   on CSP headers for the Vercel deployment.
2. **Q6.2.** `sourcemap: true` (`vite.config.ts:86`) ships full sourcemaps in `dist/` — to the
   public Vercel deployment and into the embedded RN asset. Confirm intent (Sentry symbolication?)
   and whether maps should upload to Sentry instead of shipping publicly.
3. **Q6.3.** Sentry/analytics PII posture: DSN-gated init (`sentry.ts:10-12`); replay at 0.1/1.0
   with `maskAllText`/`maskAllInputs`/`blockAllMedia` (`:17-37`); console/DOM breadcrumbs dropped
   (`:29-35`); `redactSensitiveFields` on `beforeSend` (`:41-43`); cohort tags via
   `withCohortTags` (`observedAnalytics.ts:36-44`). Verify the `PrivacyMask` inventory is
   **complete**: tests pin only `IDDataScreen`, `RecoveryPhraseScreen`, `SecretPhraseInputScreen`
   (`tests/flows/observability.test.tsx:58-76`) — enumerate every other screen rendering document
   data, names, DOBs, or proof contents (`ConfirmIdentificationScreen`, proving/result screens,
   `ProofHistoryScreen`, embed receipts) and confirm each is masked or demonstrably non-PII.
4. **Q6.4.** `assetPathShim` monkey-patches `XMLHttpRequest.open` and `window.fetch` when running
   under `file://` (`assetPathShim.ts`). Confirm the rewrite predicate cannot redirect a
   non-asset request, and that the bundle-root derivation (`:15-23`) cannot be influenced by
   document content.

### Q7 — Existing-coverage characterization

1. **Q7.1.** For the 26 existing test files (4,492 LOC: `tests/**` 4,075 + in-`src` suites 417),
   record what each actually asserts versus mock wiring, and map every Q1–Q6 question to
   `covered / partially covered / uncovered`. Recon already indicates: boot/mode/password-gate and
   secretManager concurrency are well covered; **uncovered** are the DEV-gate inventory (nothing
   pins that dev surfaces are absent from prod builds), mode spoofing via forged host config, KYC
   status-mapping fail-open, attestation-payload validation, and PrivacyMask completeness beyond
   three screens. This table anchors the report's test-gap acceptance criteria; AUD-04 executes
   **before** this audit (backlog order), so the map is cross-linked into AUD-04's gap-register
   remediation issues, not into its plan.

## Method

1. Work the questions in order Q1 → Q4 → Q2 → Q3 → Q5 → Q6 → Q7 (highest candidate severity
   first, so the time box truncates the tail, not the head). Q1.1 is first because it is the one
   suspected finding with **no** gate in front of it.
2. For each question: trace the full path with `path:line` citations, then classify per the
   workstream severity rubric. Suspected severities are priors, not conclusions. Every finding
   states which host it applies to: remote (Vercel), embedded (rn-sdk asset), or both.
3. Bundle-inspection questions (Q1.2, Q5.3) are answered against a freshly built artifact:
   `yarn build` in the package, then search `dist/assets/*.js` for the gated strings
   (`dev/keychain`, `DEV_FAKE_MNEMONIC` words, `mock=`, `Clear Entire Keychain`). Building `dist/`
   locally is read-only with respect to the repo; do not commit it.
4. Server-side behavior you cannot establish from this repo (Q1.1b mock-document registrability,
   Q4.1 Didit status vocabulary, Q4.2 sessionId issuance and TEE-side attestation verification)
   goes to `Needs investigation` with a named owner/system and a concrete verification procedure —
   not a guess. These are expected to be the audit's main `Needs investigation` load; budget for
   it.
5. Reproduce every confirmed Critical/Major as a Vitest characterization test pinning **current**
   behavior under `packages/webview-app/tests/`, named so the finding is obvious
   (`describe('AUD-09 Q4.1: unknown Didit status maps to partial', ...)`). The Q1.2/Q5.3 bundle
   assertions become a guard test alongside `src/test/sri.test.ts` if practical (build-dependent
   tests must skip cleanly when `dist/` is absent, matching the SRI test's pattern).
6. A confirmed Critical (Q1.1 mock documents registrable from a shipped build, Q4.2 forged
   attestation accepted and stored, Q1.2 DEV surface in a shipped artifact) triggers the
   workstream fast-path immediately: confidential Linear issue with full detail the same day; the
   report carries a redacted reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-webview-app-audit.md` with the workstream's
   required sections: header block, summary, severity-bucketed findings with per-finding
   acceptance criteria and host applicability, `Needs investigation` leads with dispositions,
   follow-up issues grouped into PR-sized buckets (the `/gaps-to-issues` input), adversarial
   verification log, what works well, validation.
2. **DEV-surface inventory table** — every dev/preview/mock affordance × its gate (none /
   `import.meta.env.DEV` / mode / password) × host × prod-reachability verdict. Included in the
   report; this is the artifact the Q1 questions produce.
3. **Characterization tests** — merged in the audit PR, one per confirmed Critical/Major finding,
   plus the Q5.1 no-web-storage guard test if absent.
4. **Coverage map** (Q7.1 table) — included in the report; cross-linked into AUD-04's
   gap-register remediation issues (AUD-04 completes before this audit runs and carries no
   AUD-09 placeholder).
5. **Cruft leads for AUD-06** — confirmed-dead dev surfaces (Q1.4 `DevRouteMenu`, anything else
   found unreferenced).

## Files you will NOT modify

- Anything under `packages/webview-app/src/`, `packages/webview-app/public/`,
  `packages/rn-sdk/` — the audit is read-only. New tests go under `packages/webview-app/tests/`
  (or alongside the existing in-`src` suites only if the harness requires it).
- `vite.config.ts`, `vercel.json`, `index.html`, `package.json` — config findings are findings,
  not fixes.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-09 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd packages/webview-app
yarn build
yarn test
yarn types
```

All suites must pass with the new characterization tests in place; `yarn build` must succeed so
the bundle-inspection assertions (Q1.2, Q5.3) and the existing SRI test run against a real
artifact. The report's Validation section records these commands and their output.

## Definition of done

1. Every Q1–Q7 sub-question answered with citations, or explicitly moved to
   `Needs investigation` with a disposition (workstream Stage 4 rules); every placeholder filled
   at activation.
2. Findings report merged in `docs/reviews/` with all required sections, the DEV-surface
   inventory, and per-finding host applicability.
3. Characterization tests merged and green for every confirmed Critical/Major finding;
   `Needs investigation` items that depend on server-side systems carry named verification
   procedures.
4. Any confirmed Critical fast-pathed at discovery (confidential issue exists, report redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-09 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`; the coverage
   map cross-linked into AUD-04's remediation issues and AUD-06's cruft leads handed off.

## Status log

- 2026-06-11 — Plan structurally pre-drafted from reconnaissance of the routing/provider layer,
  secret-handling files, KYC/proving flows, and build/observability config, read at the cited
  lines. Carries three named placeholders for AUD-05 outputs (coupling-seam map, origin-trust
  findings, hosting-posture decision); cannot pass activation review until filled. Drafted in
  sequence after AUD-08 per the sequential pre-drafting rule; requires recon refresh + owner
  re-review at activation.
- 2026-06-11 — Recon's highest-priority suspected finding recorded as Q1.1: the
  `/settings/dev-mode` mock-ID generator (with OFAC toggle) is reachable with no
  `import.meta.env.DEV` gate — only a mode check — and is linked from an unconditional
  "Developer tools" section in Settings. Q1.1 ordered first in the method for that reason.
- 2026-06-11 — Review-pass corrections: the Settings "Developer tools" section spans
  `SettingsScreen.tsx:104-137` (not `:104-115`); Q7.1/deliverable 4 reworded — AUD-04 carries no
  `[AUD-09 coverage map]` placeholder and completes before this audit, so the coverage map
  cross-links into AUD-04's remediation issues instead. All other cited paths/lines and the test
  estate counts (26 files / 4,492 LOC) verified against the worktree.
