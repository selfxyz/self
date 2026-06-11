# Codebase Audits Workstream Change Review

> Snapshot date: 2026-06-11
> Scope: staged changes under `specs/projects/sdk/workstreams/audits/` on `chore/fable-5-audit-specs`

Two review passes are recorded here. Pass 1 covered the AUD-03/AUD-05 plans and the AUD-04
structural pre-draft. Pass 2 (this update) covered the full staged set — `SPEC.md` plus plans
AUD-04, AUD-06, AUD-07, AUD-08, AUD-09 — by re-verifying every load-bearing factual claim
(paths, line numbers, counts, commands, cross-plan references) against the worktree, with one
verification agent per plan plus direct ground-truth commands for contested counts. Gaps found
were fixed in place; each fixed plan's status log carries a dated review-pass entry.

## Pass 2 — full staged set (2026-06-11)

### Gaps fixed

**`plans/AUD-04-test-coverage-quality.md`** (largest correction load — its inventory is the
audit's foundation):

- **The `sdk/` scope decision was premised on a phantom number.** The plan claimed `sdk/` holds
  451 test files / 78,348 LOC and excluded file-level review because it "would consume the
  entire time box." That figure counted `node_modules`; the tracked `sdk/` test estate is **2 TS
  test files (21 LOC) plus 1 Go test**. Rationale rewritten: exclusion stands on
  separate-surface grounds, and the near-empty estate is now flagged as a Q3.2 register
  candidate. **Owner re-confirmed (2026-06-11): the exclusion stands.** Owner also ruled that
  inventory counts across all plans are scoping aids, not load-bearing claims — refined at each
  audit's recon refresh and during execution, not re-litigated in review (now stated in
  `SPEC.md`'s protocol section). Review precision stays focused on the `path:line` citations
  behind suspected findings.
- Suite inventory corrected: `common` 9 files / 1,220 LOC (was 56 / 7,440);
  `mobile-sdk-alpha/tests` 47 / 9,229 (was 26 / ~3.5k); `rn-sdk` 15 files (was 22);
  `webview-app` 26 / 4,492 (was "1"); `mobile-sdk-demo/tests` 17 (was 4); `new-common` **0 test
  files** (was 11 / 1,095) — it defines `test: vitest run` with no tests, which sharpens Q2.1:
  the gap there is a missing suite, not an unrun one.
- `jest.config.cjs` moduleNameMapper is 26 entries, not 31.
- `toHaveBeenCalled*` counts: 55 in `rn-sdk` (was 77), 25 in `webview-bridge` (was 47); the app
  (806) and `mobile-sdk-alpha` (239) counts verified as written.

**`plans/AUD-06-cruft-dead-code.md`:**

- Same-named-file count across `common`/`new-common` is **37 unique basenames**, not 43; the
  counting method (unique basenames under each `src/`, tests excluded) is now stated inline so
  the Stage 4 reviewer can re-run it — which the plan itself demands for absence claims.
- The 10 committed `.js.map` sourcemaps split 7 Android / 3 iOS; the plan had all 10 in the iOS
  bundle.

**`plans/AUD-07-config-ci-consolidation.md`:**

- Babel configs: ×6 (incl. root `babel.config.js`), not ×8.
- `corepack prepare yarn@4.12.0` duplicated 10× across four workflows, not ~20×.
- `kmp-ci.yml` has 9 jobs, not 65.
- **Q5.1's premise was inverted.** `--immutable` is not "passed by 13 workflows" — it is
  enforced inside the shared `yarn-install` composite action (`action.yml:37`, already wrapped
  in `nick-fields/retry`), with only 2 direct workflow uses. Q5.1 reframed to hunt installs that
  bypass the action.
- Concurrency citations corrected: `mobile-e2e.yml` concurrency is at `:62-64` (not `:67-69`,
  which is its runs-on block); `mobile-deploy.yml`'s at `:101-107` (not `:105-110`); and
  **`circuits.yml` has no concurrency block at all** — its cited `:45-48` is runs-on labels.
  That absence is itself the Q4.1 lead for the self-hosted queue-starvation concern, and Q4.1
  now says so.

**`plans/AUD-08-analytics-observability.md`:**

- The fifth `SCAN_STARTED` fire-site is `selfClientProvider.tsx:373-375`;
  `DocumentNFCScanScreen.tsx:297` fires `NFC_STARTED` (a different event, already covered by
  Q2.4's NFC list). The Q2.2 funnel analysis would have chased the wrong event at that site.
- Loki mock-data skip: the flag is wired at `lokiTransport.ts:135-140` but the skip executes at
  `:178-180`; Q1.2 now cites both.
- `console.*` site count updated to ~378 (was 365).
- **Ordering contradiction fixed:** Q5.1 and deliverable 6 said the coverage map is "copied to
  AUD-04's plan", but AUD-04 executes before AUD-08 in the backlog order. Reworded: the map
  lands in AUD-08's report and cross-links into AUD-04's gap-register remediation issues.

**`plans/AUD-09-webview-app-surface.md`:**

- **Phantom placeholder removed:** Q7.1 and deliverable 4 claimed to fill "AUD-04's
  `[AUD-09 coverage map]` placeholder" — AUD-04 carries no such placeholder and completes
  before AUD-09 runs. Same fix as AUD-08: cross-link into AUD-04's remediation issues.
- Settings "Developer tools" section spans `SettingsScreen.tsx:104-137`, not `:104-115`.
- Everything else held up: the Q1.1 headline (mock-ID generator with OFAC toggle, mode-gated
  only, no DEV gate), all secret-handling and KYC-chain citations, the build/SRI claims, and
  the test-estate counts (26 files / 4,492 LOC) verified at the cited lines.

### Verified, no change needed

- `SPEC.md` staged changes (structural pre-draft rule, AUD-04 hard-dependency wording,
  fresh-session-per-stage execution model, all six new plan links) are internally consistent
  with the plans; backlog dependencies and execution order check out against each plan's
  Depends-on header. 193 lines — at the edge of the 100–200 target; future protocol additions
  should displace, not append.
- Cross-plan question references all resolve: AUD-03 Q3.4/Q3.5/Q5/Q6.1, AUD-05
  Q1.3/Q1.4/Q2.4/Q5/Q6.2/Q7.1, AUD-01 Q8.1, AUD-02 Q9 exist in their plans and match the
  claimed subjects.
- AUD-07's cleared false alarms (fastlane `.env.secrets` untracked, no `pull_request_target`,
  no npm/npx) re-confirmed; secrets count (33), workflow count (26), composite-action count
  (19), tsconfig (26) / prettier (13) / eslint (8) counts, checkout 69×v6 / 13×v4 split, and
  all disabled-CI line citations (`workspace-ci.yml:133/:174/:204-227`, `contracts.yml:99`,
  `web.yml:17`, `mobile-e2e.yml:309`, `mobile-deploy.yml:484`) verified.
- AUD-06's patch-system, Turnkey, artifact-size, knip, tech-debt-baseline, and
  MOBILE_DEPLOYMENT.md-contradiction claims all verified at the cited lines.
- AUD-08's headline dev-guard asymmetry (Segment `__DEV__` early-return vs Mixpanel
  token-only gate) and the duplicated `SENSITIVE_KEY_PATTERN` (app + SDK copies; neither
  matches `nationality`/`documentNumber`/`personalNumber`/`wallet`/`mnemonic`) verified.

### Known-imprecise, deliberately not changed (within ±3-line / ±5% tolerance)

Recorded so the activation recon refresh doesn't re-litigate them: `analytics.ts` `__DEV__`
block is `:204-210` (plan says `:204-209`); `sentry.test.ts` is 174 LOC (plan: 175);
`nativeLoggerBridge.ts` 118 (plan: 119); `jest.setup.js` RN mock factory opens at `:76`
(plan: `:73-172`, lines 73–75 are its comment header); `EmbedKycWrapper.tsx` gate at `:37`,
Navigate at `:38-44` (plan: `:37-45`).

## Pass 1 — AUD-03 / AUD-05 fix pass (2026-06-11, retained from the earlier snapshot)

**`plans/AUD-03-startup-nav-routing.md`:** corrected out-of-scope routing for document
storage/migration internals (not AUD-01 scope; storage findings route to the owning workstream);
clarified AUD-05 owns bridge protocol while AUD-09 owns the WebView app surface; corrected
Q3.3's `selfApp` failure order (malformed JSON routes to `QRCodeTrouble` before the Google USAT
gate; valid JSON reaches the gate before `setSelfApp`); split the validation command into
working-directory-safe steps.

**`plans/AUD-05-bridge-protocol-surface.md`:** added the omitted `packages/rn-sdk` bridge
surface (router, KMP transport, handlers, `SelfVerification.tsx`, `SelfBridgeModule.kt`, tests)
as in scope; corrected native-shell paths to include the `packages/` prefix; corrected the TS
adapter LOC (633 → 621); reframed hosts (native shells remote-default, RN SDK embedded-file);
expanded Q1/Q2/Q7, deliverables, parity table, and DoD to cover all four bridge hosts; replaced
the stale `yarn kmp:test` validation command with package-local commands. Owner should confirm
AUD-05 is intended to audit every shipped bridge host, not only the native shells.

**`SPEC.md` (same pass):** AUD-05/AUD-04 backlog rows updated; structural pre-draft rule added
to permit AUD-04's placeholder-carrying draft; fresh-session-per-stage execution model added.
