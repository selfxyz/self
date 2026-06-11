# AUD-08 — Analytics & observability correctness audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (pre-drafted in sequence after AUD-07; two placeholders — AUD-01 NFC fire-site
> map and AUD-03 launch-routing map — filled at the recon refresh)
> Priority: Low
> Depends on: AUD-01 (NFC scan fire-sites; its scan state machine is where NFC funnel events
> fire), AUD-03 (launch/routing — screen-view and onboarding events fire on the nav transitions
> AUD-03 mapped). Informational, but both maps sharpen Q2's duplicate-fire analysis; see
> placeholders Q2.4 and Q2.5.
> Time box: 3 working days of investigation + 1 day for report and review gate. Question-list
> items still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests (PII-redaction and dev-guard
> assertions). Target <500 LOC of test code.

## Context

You are auditing whether the app's **telemetry tells the truth and leaks nothing**. Two failure
classes: **correctness** — funnel events that double-fire, miss their terminal pair, or fire from
test/dev runs and pollute production analytics; and **privacy** — passport/MRZ/name/DOB data,
secrets, addresses, or proof payloads reaching Segment properties, Mixpanel, Sentry
contexts/breadcrumbs, or the Loki log stream. The app ships four telemetry channels —
Segment (`SEGMENT_KEY`), Mixpanel for NFC (`MIXPANEL_NFC_PROJECT_TOKEN`), Sentry (`SENTRY_DSN`),
and in-app Grafana Loki log shipping (`GRAFANA_LOKI_URL/USERNAME/PASSWORD`) — each with its own
dev-guard and sanitization story, and they are not consistent with each other. That inconsistency
is the audit's spine.

Reconnaissance (2026-06-11) verified the stack inline in the question list and found a real
asymmetry to chase: Segment's `track` returns early under `__DEV__` (`analytics.ts:204-209`), but
Mixpanel `trackNfcEvent` has **no `__DEV__` guard** — it gates only on the token being set
(`analytics.ts:388`) — so a dev or E2E build with `MIXPANEL_NFC_PROJECT_TOKEN` present ships real
NFC events. Treat every "suspected" item as unverified: confirm or refute each with a trace or a
reproduction, per the workstream's evidence standard.

A privacy finding here is asymmetric in cost — a leaked passport number in a telemetry pipeline is
a Critical that the workstream fast-path exists for. So Q3 (PII) is the highest-severity question
and the test code this audit writes is concentrated there: redaction tests that assert the
sensitive-key set is scrubbed on **every** channel, constructed from concrete payloads, not
inspection.

## Scope

### In scope (the complete file inventory)

| Area | Files | LOC |
| --- | --- | --- |
| Analytics core | `app/src/services/analytics.ts` | 495 |
| Segment client | `app/src/config/segment.ts` (write key from `@env`; `DisableTrackingPlugin` strips device/ad IDs) | 74 |
| Event-name contract | `packages/mobile-sdk-alpha/src/constants/analytics.ts` (~180 event names, 17 groups; `KNOWN_EVENT_NAMES` allowlist built at `analytics.ts:34-48`) | 259 |
| Sentry config | `app/src/config/sentry.ts` (`beforeSend:266-272` deletes `user.ip_address`/`user.id`, calls `redactSensitiveFields`; tracesSampleRate 1.0) | 375 |
| Redaction logic | `app/src/observability/onboardingContext.ts` (`SENSITIVE_KEY_PATTERN`, redacts breadcrumbs/contexts/extra/user/request) **and its SDK twin** `packages/mobile-sdk-alpha/src/observability/onboardingContext.ts` | — |
| Loki shipping | `app/src/services/logging/logger/lokiTransport.ts` (in-app POST to `/loki/api/v1/push`; batches 100/5s), `app/src/services/logging/index.ts` (`enabled: !__DEV__` :24; `interceptConsole` :69), `app/src/services/logging/logger/consoleInterceptor.ts`, `app/src/services/logging/logger/nativeLoggerBridge.ts` (119) | — |
| SDK/WebView analytics boundary | `packages/webview-bridge/src/adapters/analytics.ts` (42; fires over bridge), `packages/mobile-sdk-alpha/src/adapters/browser/analytics.ts` (55; standalone POST, swallows failures) | — |
| SDK proof events | `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` (`PROOF_STARTED:492`, `PROOF_SUCCEEDED:528`) | trace only |
| Existing tests | `app/tests/src/services/analytics.test.ts` (416), `app/tests/src/config/sentry.test.ts` (175), `packages/webview-bridge/src/__tests__/analytics-web.test.ts` (65), `packages/mobile-sdk-alpha/tests/adapters/browser/analytics.test.ts` | — |

### Out of scope

- **Analytics destination config / dashboards** (Segment sources, Mixpanel project setup, Sentry
  org, Loki/Grafana provisioning) — backend/ops, not app code. CI secret *plumbing* is AUD-07.
- **The funnel's product semantics** — whether the right events exist for a given metric is a
  product question. This audit judges only correctness (fires once, has its terminal pair, fires
  only in prod) and privacy (leaks nothing).
- **NFC scan-flow correctness and the Google USAT eligibility policy** — AUD-01 and AUD-03/product
  own those. This audit consumes AUD-01's fire-site map and audits the *events*, not the scan.
- **Native logger internals** below the bridge (the iOS/Android log emitters) — trace to the
  `nativeLoggerBridge` boundary and stop; native correctness is AUD-01/AUD-02 territory.
- **Fixing anything** — redaction gaps, missing guards, and duplicate fires are remediation PRs.
  The workstream invariant is read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q3 — PII leakage across all four channels (highest severity; worked first)

1. **Q3.1 (suspected Critical if confirmed).** Enumerate every field that can reach each channel
   and prove the redaction is complete or find a leak. `SENSITIVE_KEY_PATTERN`
   (`onboardingContext.ts`) matches `passport|mrz|dg\d|chip|aadhaar|…name…|dob|birth|photo|email`.
   Construct concrete payloads — a Sentry event, a Segment `track` property bag, a Mixpanel NFC
   event, a Loki log line — each carrying realistic document fields under realistic key names
   (`passport_number`, `mrzLine2`, `dg1`, `givenName`, `dateOfBirth`, `nationality`, plus
   non-obvious ones: `documentNumber`, `holderName`, `personalNumber`, `optionalData`), and
   assert the channel's sanitizer scrubs each. **Find the keys the pattern misses**: `nationality`,
   `documentNumber`, `personalNumber`, and `address`/`wallet`/`mnemonic` are not obviously in the
   regex — confirm each. A confirmed leak of document data or key material is Critical and triggers
   the fast-path the moment it is found.
2. **Q3.2 (suspected Major).** Redaction logic is **duplicated** — `app/src/observability/` and
   `packages/mobile-sdk-alpha/src/observability/onboardingContext.ts`. Diff the two
   `SENSITIVE_KEY_PATTERN`s and redaction bodies: if they have drifted, one channel scrubs a key
   the other leaks. Establish which channels route through which copy (app Sentry vs SDK/WebView
   telemetry) and whether the WebView/bridge analytics path (`adapters/analytics.ts`) applies any
   redaction at all before events reach the host app.
3. **Q3.3 (suspected Medium).** Sentry `beforeSend` deletes `event.user.id` (`sentry.ts:268-269`),
   but `logEvent` sets a `user_id` into context/data before capture. Trace whether `user_id` (and
   `support_uuid`) survives in `contexts`/`extra`/`tags` after `redactSensitiveFields` runs —
   `user.id` deletion does not cover a `user_id` key elsewhere in the event. Same question for
   Loki: `support_uuid` ships only when `supportUuidEnabled` (`lokiTransport.ts:207,214-217`) —
   confirm the gate and whether it is the intended privacy boundary.
4. **Q3.4 (suspected Medium).** The console→Loki interceptor (`index.ts:69`, `consoleInterceptor`)
   routes **all** `console.*` into the Loki stream in production. ~378 `console.*` sites exist in
   `app/src`. Sample the highest-risk modules (NFC parsing, keychain/mnemonic, passport data
   provider, proving) and establish whether any logs a sensitive value that then ships to Loki
   un-redacted — the interceptor's redaction (if any) is the only thing standing between a
   `console.log(documentData)` and Grafana. Confirm whether the interceptor applies
   `SENSITIVE_KEY_PATTERN` or ships raw strings (a regex on object keys cannot scrub a value
   interpolated into a message string — call that out if so).

### Q1 — Dev/test/E2E pollution of production telemetry

1. **Q1.1 (suspected Major — verified asymmetry).** Segment `track` returns early under `__DEV__`
   (`analytics.ts:204-209`); Mixpanel `trackNfcEvent` has **no `__DEV__` guard**, gating only on
   `MIXPANEL_NFC_PROJECT_TOKEN` being set (`analytics.ts:388`). Establish whether the NFC token is
   present in any non-production build (dev, the Maestro E2E builds, the
   `register-mock-passport.android` flow that drives a real NFC-shaped path). If a test build can
   ship real Mixpanel events, that pollutes production NFC funnels — Major. Confirm Sentry's guard
   (`isSentryDisabled = !SENTRY_DSN`) and Loki's (`enabled: !__DEV__`) and produce a four-channel ×
   {dev, E2E, prod} guard matrix.
2. **Q1.2 (suspected Medium).** Mock-passport handling: `lokiTransport` skips Loki for detected
   mock data (flag wired at `:135-140`, skip applied at `:178-180`). Trace whether the Segment/Mixpanel/Sentry channels have an equivalent
   mock-data exclusion, or whether mock-passport registration (reachable in production via the
   deep-link dev screen AUD-03 Q3.4 flagged) fires real funnel events. A mock registration counted
   as a real one is a correctness finding.

### Q2 — Funnel correctness: double-fire and missing terminals

1. **Q2.1 (suspected Medium).** `BackupEvents.ACCOUNT_RECOVERY_COMPLETED` fires from two screens —
   `AccountRecoveryChoiceScreen.tsx:160` and `RecoverWithPhraseScreen.tsx:164` — with no shared
   guard. Trace the navigation paths: can a single recovery traverse both screens (cloud →
   phrase fallback, or a nav bounce) and fire the completion twice? Establish the started/completed
   pairing and whether `ACCOUNT_RECOVERY_STARTED` (`AccountRecoveryScreen.tsx:53`) can fire without
   a terminal, or vice versa.
2. **Q2.2 (suspected Medium).** `SCAN_STARTED` fires from five sites (`DocumentCameraScreen.tsx:73`,
   `LogoConfirmationScreen.tsx:96`, `AadhaarUploadScreen.tsx:66`, `useKycLauncher.ts:157`,
   `selfClientProvider.tsx:373-375` — `DocumentNFCScanScreen.tsx:297` fires `NFC_STARTED`, a
   different event, covered by Q2.4). The code references "branch funnel" discipline. Establish whether the
   branch logic guarantees exactly one `SCAN_STARTED` per scan attempt across document types, or
   whether two entry points can both fire for one user action. Map each `*_STARTED` to its
   `*_SUCCEEDED`/`*_FAILED` terminals and list any started-event with a reachable path that emits
   no terminal (a stuck funnel reads as abandonment in the data).
3. **Q2.3.** The `KNOWN_EVENT_NAMES` allowlist (`analytics.ts:34-48`) warns on unknown events in
   dev only (`:185`) and otherwise lets them through. Confirm that an event-name typo ships
   silently in production (no drop, no error) — a Low correctness/observability gap — and that the
   ~180-name constant set has no duplicate string values across its 17 groups (a duplicated string
   collapses two funnels into one).
4. **Q2.4 [PLACEHOLDER — AUD-01 NFC fire-site map].** Fold AUD-01's confirmed NFC scan-flow
   fire-site map into Q2.2's NFC funnel analysis at the recon refresh: AUD-01 establishes where in
   the scan state machine each NFC event actually fires and which retry/fallback paths exist —
   that determines whether `NFC_STARTED`/`NFC_SUCCEEDED`/`NFC_SCAN_FAILED`
   (`DocumentNFCScanScreen.tsx:297,398,332,475`) can double-fire on retry.
5. **Q2.5 [PLACEHOLDER — AUD-03 launch-routing map].** Fold AUD-03's startup/routing map in: screen-view
   and `Onboarding` lifecycle events fire on nav transitions, and AUD-03 Q3/Q4 established the
   imperative-navigation races at launch (Splash reset, deep-link `safeNavigate`, the two startup
   hooks). Determine whether a launch-time double-navigation emits duplicate screen-view or
   onboarding events.

### Q4 — SDK/WebView analytics boundary

1. **Q4.1.** `webview-bridge/src/adapters/analytics.ts` fires WebView events over the bridge to the
   host's `trackEvent`/`trackNfcEvent`/`logNFCEvent` with **no allowlist or validation in the
   adapter** — validation happens only at the host's `KNOWN_EVENT_NAMES`. Confirm WebView content
   cannot inject arbitrary event names or PII-laden properties that bypass host redaction (ties to
   AUD-05's bridge-trust questions and Q3.2's "does the WebView path redact at all"). Establish the
   trust model: is the WebView analytics input trusted because only first-party bundle code runs in
   the frame (AUD-05 Q1.3's assumption)?
2. **Q4.2.** `packages/mobile-sdk-alpha/src/adapters/browser/analytics.ts` is a **standalone**
   client that POSTs directly to a remote endpoint and silently swallows network failures
   (`:36-38`). Establish where this adapter is wired (SDK-demo? webview-app? a shipped path?) and
   whether it can ship events outside the host app's redaction and dev-guards entirely — a second,
   unsanitized analytics channel would be a Major privacy gap. If it is test/demo-only, record that
   and hand the bundling check to AUD-06.

### Q5 — Existing-coverage characterization

1. **Q5.1.** `analytics.test.ts` (416 LOC, 56 cases) covers Segment wiring and event transforms but
   **not** Mixpanel NFC, the dev-guard asymmetry (Q1.1), or PII filtering; `sentry.test.ts` (175)
   tests `redactSensitiveFields` against a fixed key set (`passport_number`, `mrz_line2`, `dg1_hash`,
   `chip_uid`, `aadhaar_qr`, `date_of_birth`, `name_first`) but not the keys Q3.1 suspects are
   missed, and not the duplicated SDK copy (Q3.2). Map every Q1–Q4 question to
   `covered / partially covered / uncovered`; AUD-04 executes **before** this audit (backlog
   order), so the map lands in this report and is cross-linked into AUD-04's gap-register
   remediation issues, not into its plan. The redaction test gap is the acceptance-criteria
   anchor for the Q3 characterization tests.

## Method

1. Work the questions in order Q3 → Q1 → Q2 → Q4 → Q5 (privacy first — it carries the only
   Critical and the fast-path; then pollution and funnel correctness; coverage last).
2. For each question: trace the full path with `path:line` citations across the four channels and
   both redaction copies, then classify per the workstream severity rubric. Suspected severities
   are priors, not conclusions.
3. The Q3 redaction claim is answered by **constructing concrete payloads and asserting the
   sanitized output contains no sensitive value** — per channel, per copy — not by reading the
   regex. This is the load-bearing privacy claim; characterization tests live in
   `app/tests/src/config/sentry.test.ts` (extend) and a new
   `app/tests/src/observability/redaction.test.ts` (the cross-channel key matrix), plus
   `app/tests/src/services/analytics.test.ts` for the Q1.1 dev-guard asymmetry. Jest constraints
   from `feedback_test_memory_oom` apply: no nested `require('react-native')` in `jest.mock`
   factories, hoisted `Mock*` aliases, tests under `app/tests/`, `node scripts/check-test-requires.cjs`
   green.
4. Pollution questions (Q1) that depend on whether a token is present in a specific build go to
   `Needs investigation` with a named manual-test procedure (build variant, env file, observed
   network calls) if they cannot be established from source.
5. A confirmed Critical (Q3.1 document-data or key-material leak into any shipped telemetry
   channel) triggers the workstream fast-path immediately: confidential Linear issue with the full
   payload-and-channel detail the same day; the report carries a redacted reference. **Do not paste
   a real leaked value into the public report or a non-confidential issue.**

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-analytics-observability-audit.md` with the
   workstream's required sections: header block, summary, severity-bucketed findings with
   per-finding acceptance criteria, `Needs investigation` leads with dispositions, follow-up
   issues grouped into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification
   log, what works well (the `DisableTrackingPlugin` device-ID stripping and the existing Sentry
   redaction are candidates), validation.
2. **Channel × sanitizer matrix** (Q3) — for each sensitive key class, whether each of the four
   channels (and both redaction copies) scrubs it. The privacy decision's evidence base.
3. **Dev/E2E/prod guard matrix** (Q1) — four channels × three build contexts.
4. **Funnel register** (Q2) — each tracked funnel event, its fire-sites, its terminal pairing, and
   double-fire/missing-terminal disposition.
5. **Characterization tests** — redaction tests (cross-channel key matrix) and the Q1.1 dev-guard
   asymmetry test, merged in the audit PR.
6. **Coverage map** (Q5.1) — included in the report; cross-linked into AUD-04's gap-register
   remediation issues (AUD-04 completes before this audit runs).

## Files you will NOT modify

- Anything under `app/src/`, `packages/mobile-sdk-alpha/src/`, `packages/webview-bridge/src/` —
  the audit is read-only. Redaction gaps and missing guards are remediation issues with the fix
  described in acceptance criteria, not applied here.
- `app/jest.config.cjs`, `app/jest.setup.js`, existing mocks — if a new test needs a mock the
  setup lacks, add a scoped mock under `app/tests/__setup__/mocks/`.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-08 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd app
yarn jest:run tests/src/services/analytics.test.ts tests/src/config/sentry.test.ts tests/src/observability
yarn types
node scripts/check-test-requires.cjs

cd ../packages/webview-bridge && yarn test
cd ../mobile-sdk-alpha && yarn test
```

Must pass with the new characterization tests in place. The report's Validation section records
these commands and their output.

## Definition of done

1. Q2.4 and Q2.5 placeholders filled with the AUD-01 and AUD-03 maps at the recon refresh.
2. Every Q1–Q5 sub-question answered with citations, or explicitly moved to `Needs investigation`
   with a disposition (workstream Stage 4 rules).
3. Findings report merged in `docs/reviews/` with all required sections, the channel × sanitizer
   matrix, the guard matrix, and the funnel register.
4. Characterization tests merged and green: cross-channel redaction key matrix and the dev-guard
   asymmetry test at minimum.
5. Any confirmed Critical privacy leak fast-pathed at discovery (confidential issue exists, report
   redacted; no real leaked value in public artifacts).
6. Adversarial review gate passed; owner status set.
7. Linear issues created for accepted Critical/Major findings; AUD-08 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Plan pre-drafted in sequence after AUD-07 per the workstream rule. Two placeholders
  (Q2.4 NFC fire-site map from AUD-01, Q2.5 launch-routing map from AUD-03) filled at the recon
  refresh; all other questions drafted from direct reconnaissance verified at the cited lines.
- 2026-06-11 — Recon corrections vs the initial sweep: `onboardingContext.ts` (redaction) lives in
  `app/src/observability/`, not under analytics, and is **duplicated** in
  `packages/mobile-sdk-alpha/src/observability/` — promoted to Q3.2 as a redaction-drift question;
  `trackNfcEvent`'s guard is the Mixpanel token, not `__DEV__` (the verified asymmetry behind
  Q1.1); event constants live in the SDK (`mobile-sdk-alpha/src/constants/analytics.ts`), so the
  funnel-correctness and allowlist questions cross the app/SDK boundary.
- 2026-06-11 — Review-pass corrections: the fifth `SCAN_STARTED` site is
  `selfClientProvider.tsx:373-375`, not `DocumentNFCScanScreen.tsx:297` (that line fires
  `NFC_STARTED`); the Loki mock-data skip executes at `lokiTransport.ts:178-180` (`:135-140`
  only wires the flag); `console.*` count updated to ~378; Q5.1/deliverable 6 reworded — AUD-04
  completes before this audit, so the coverage map cross-links into its remediation issues
  rather than "feeding" its plan.
