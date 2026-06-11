# AUD-04 — Test coverage & test quality audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (structural pre-draft, owner-authorized 2026-06-11; Q3.1 is a named placeholder —
> this plan cannot pass activation review until the AUD-01/02/03/05 coverage maps land and the
> recon refresh fills it)
> Priority: Medium
> Depends on: AUD-01 (Q8.1 coverage map), AUD-02 (Q9 map), AUD-03 (Q6.1 map), AUD-05 (Q7.1 map) —
> **hard** dependency, unlike other rows: Q3 cannot be answered without these artifacts
> Time box: 4 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report only, plus at most a small set of characterization tests
> pinning the current state of broken-but-unrun suites (Method §3). Target <400 LOC of test code.

## Context

You are auditing the **verification layer itself** — not what the code does, but whether anything
would notice if it stopped doing it. Prior audits (AUD-01/02/03/05) audited code surfaces and each
produced a coverage map for its scope; this audit merges those maps, extends them repo-wide, and
judges the test estate on three axes: **coverage** (what is tested, what enforces that), **CI
execution** (which suites actually run, gate, and on what triggers), and **quality** (whether the
tests that exist assert behavior or merely mock wiring — the CLAUDE.md standard is "Test behavior,
not mock wiring").

Reconnaissance (2026-06-11) verified the headline facts inline in the question list: **no
`coverageThreshold` exists in any jest or vitest config repo-wide and no workflow uploads
coverage**; the workspace-level test job is disabled in CI (`workspace-ci.yml:174`, `if: false`);
the app suite (102 files, 24,877 LOC) carries 806 `toHaveBeenCalled*` assertions atop a 1,614-LOC
global mock factory (`app/jest.setup.js`); and security-critical modules (`authProvider.tsx`,
`SplashScreen.tsx`, `crypto/mnemonic.ts`) have no direct unit tests. Treat every "suspected" item
as unverified: confirm or refute each with a trace or a reproduction, per the workstream's
evidence standard.

**Scope decision (owner, 2026-06-11): `sdk/` is inventoried for the CI-execution and
coverage-enforcement questions (Q1, Q2) but excluded from file-level quality review (Q4).** It is
a separate SDK surface with its own consumers. Review correction (2026-06-11): the original
451-file / 78,348-LOC figure counted `node_modules`; the tracked `sdk/` test estate is **2 TS test
files (21 LOC, `sdk/core/tests/`) plus 1 Go test (`sdk/sdk-go/test/`)** — so the time-box concern
is moot, and the near-empty estate is itself a Q3.2 register candidate (an SDK surface with ~zero
tests), not a deferred review.

## Scope

### In scope (the complete file inventory)

| Area                    | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | LOC / notes                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| App jest config + setup | `app/jest.config.cjs` (88), `app/jest.setup.js` (1,614), `app/tests/__setup__/` (5 mock files, ~535)                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 26-entry moduleNameMapper at `jest.config.cjs:32-79`            |
| OOM guard               | `app/scripts/check-test-requires.cjs` (145); CI hook `mobile-ci.yml:188`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | nested-require guard                                            |
| Vitest configs          | `common/vitest.config.ts` (10), `packages/mobile-sdk-alpha/vitest.config.ts` (21), `packages/rn-sdk/vitest.config.ts` (13)                                                                                                                                                                                                                                                                                                                                                                                                                                 | no coverage settings in any                                     |
| Native test harnesses   | `packages/native-shell-android/build.gradle.kts:50-53` (JUnit/Robolectric), `packages/native-shell-ios/Package.swift:24-28` (XCTest target)                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                               |
| CI workflows            | `.github/workflows/{mobile-ci,common-ci,mobile-sdk-ci,webview-bridge-ci,core-sdk-ci,native-shells-ci,kmp-ci,rn-sdk-test-app-ci,workspace-ci,mobile-e2e,circuits}.yml`                                                                                                                                                                                                                                                                                                                                                                                      | the Q2 matrix inputs                                            |
| Test suites (inventory) | `app/tests/` (102 / 24,877), `common/` (9 / 1,220 — 6 in `common/tests/`, 3 in `common/src/`), `packages/mobile-sdk-alpha/tests/` (47 / 9,229), `packages/rn-sdk/src/__tests__/` (15 / 1,920), `packages/webview-bridge/src/__tests__/` (5 / 991), `packages/native-shell-android/src/test/` (13 / 1,385), `packages/native-shell-ios/Tests/` (11 / 1,461), `new-common/` (0 test files — `test: vitest run` script with no tests), `packages/webview-app` (26 / 4,492), `packages/mobile-sdk-demo/tests/` (17 / 1,839), `sdk/` (2 TS + 1 Go — Q1/Q2 only) | counts re-verified 2026-06-11 review pass; re-verify at refresh |
| E2E                     | `app/tests/e2e/*.flow.yaml` (5 Maestro flows + `subflows/`), `mobile-e2e.yml`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Namespace self-hosted runners                                   |
| Upstream coverage maps  | AUD-01 Q8.1, AUD-02 Q9, AUD-03 Q6.1, AUD-05 Q7.1 tables (in their accepted reports)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **placeholder — copy in at recon refresh**                      |

### Out of scope

- **Writing new feature tests or raising coverage.** That is remediation; this audit produces the
  risk-ranked register that scopes it.
- **Re-auditing code surfaces from AUD-01/02/03/05.** You consume their coverage maps verbatim;
  disagreements with an upstream map go to `Needs investigation`, not re-investigation.
- **`noir/` and circuit test quality** — specialist review, excluded at workstream level.
- **E2E infrastructure re-architecture and runner capacity.** Q6 judges flow coverage and gating
  posture only; Namespace concurrency limits are recorded as context, not findings.
- **`sdk/` file-level test quality** — see the scope decision above.
- **Fixing anything.** Re-enabling the disabled workspace-test job, adding thresholds, or
  deleting bad tests are remediation PRs. The workstream invariant is read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Coverage measurement and enforcement

1. **Q1.1 (verified at recon; classify and force decision).** No `coverageThreshold` or
   `collectCoverage` exists in any jest or vitest config repo-wide (recon grep 2026-06-11, zero
   hits), and no workflow uploads coverage to any service. `app/package.json` defines
   `test:coverage` and `test:coverage:ci` (LCOV + JSON reporters) — establish whether anything
   (CI, scripts, dashboards, docs) consumes their output. The report must force an owner
   decision: adopt thresholds (which surfaces, what number, fixed vs ratchet) or record the
   no-threshold posture as deliberate. Severity is Medium per rubric unless Q3 shows a Tier-1
   module regressed to zero coverage silently.
2. **Q1.2.** Produce the baseline numbers: run coverage once per surface that supports it (app
   jest, common/mobile-sdk-alpha/rn-sdk/webview-bridge vitest) and record per-module line/branch
   coverage for every module in the Q3 register. Surfaces without working coverage tooling
   (native shells, KMP) are recorded as `unmeasured` — explicitly, not omitted.

### Q2 — CI execution matrix

1. **Q2.1 (suspected Major).** The workspace-level test job is disabled (`workspace-ci.yml:174`,
   `if: false`; the format check at `:133` likewise). Build the full **suite × workflow matrix**:
   for every suite in the inventory, which workflow runs it, on what trigger, and whether it
   gates merge. Recon confirmed per-package workflows exist for app, common, mobile-sdk-alpha,
   webview-bridge, core-sdk, native shells (`native-shells-ci.yml:44-105`), and KMP
   (`kmp-ci.yml`) — but found **no workflow naming `new-common`** (which defines `test: vitest
run` yet carries zero test files, so the gap there is a missing suite, not an unrun one), and
   could not confirm that
   `packages/rn-sdk`'s own vitest suite (as opposed to `rn-sdk-test-app-ci.yml`'s test app) runs
   anywhere. A suite that exists but never runs in CI rots silently — Major candidate. Git-blame
   the `if: false` lines and record when and why they were disabled.
2. **Q2.2 (suspected Medium).** Every per-package workflow is path-filtered (e.g.
   `native-shells-ci.yml:10-19`, `rn-sdk-test-app-ci.yml:10`). Trace whether a change to a shared
   dependency (`common`, `mobile-sdk-alpha`, `webview-bridge`) triggers the suites of its
   downstream consumers, or whether cross-package breakage lands green and surfaces only on the
   consumer's next in-package change. Cite each workflow's path filters; the disabled
   workspace-test job (Q2.1) is the missing backstop — say so if confirmed.
3. **Q2.3.** Establish whether any test failure can pass CI: audit all test workflows for
   `continue-on-error`, allowed-failure patterns, retry-on-flake steps, and result-upload-only
   jobs (e.g. `native-shells-ci.yml:67-70` uploads reports — confirm the job still fails on test
   failure). Confirm `mobile-ci.yml` ordering: require-guard (`:188`) before `yarn test:ci`
   (`:207`) under `NODE_OPTIONS: --max-old-space-size=4096` (`:193`).

### Q3 — Risk-ranked gap register (the audit's canonical artifact)

1. **Q3.1 [PLACEHOLDER — fill at recon refresh; blocks activation].** Merge the four upstream
   coverage maps — AUD-01 Q8.1, AUD-02 Q9, AUD-03 Q6.1, AUD-05 Q7.1 — into one register:
   module × risk tier × current coverage (Q1.2) × `covered / partially covered / uncovered` ×
   owning workstream. The upstream maps are authoritative for their scopes.
2. **Q3.2.** Extend the register beyond those audit scopes with recon-confirmed absences:
   `app/src/providers/authProvider.tsx` has no test file; `app/src/utils/crypto/mnemonic.ts` has
   no direct unit test (only hook-level coverage via `app/tests/src/hooks/useMnemonic.test.ts`);
   `app/src/screens/app/SplashScreen.tsx` is untested (AUD-03 Q6.1 also records this). Enumerate
   any remaining Tier-1 module — key material, registration, secure storage, proof flows — with
   zero direct tests.
3. **Q3.3.** Apply the dedup rule: a gap already carried as an acceptance criterion on an
   AUD-01/02/03/05 remediation issue is **cross-linked, not re-filed**. The register's
   disposition column says which issue owns it.

### Q4 — Test quality: mock wiring vs behavior

1. **Q4.1 (suspected Medium; fixed sample).** Assertion mix is mock-heavy: recon counts 806
   `toHaveBeenCalled*` in `app/tests/`, 239 in `mobile-sdk-alpha`, 55 in `rn-sdk`, 25 in
   `webview-bridge`. The sample is fixed by rule, not judgment: rank app test files by
   `toHaveBeenCalled*` per 100 LOC and review the top 10, plus the top 5 each in
   `mobile-sdk-alpha` and `rn-sdk`. Classify each sampled file `behavior-asserting / mixed /
mock-wiring-only`. A security-critical module whose only tests are mock-wiring-only is
   recorded as `uncovered` in the Q3 register regardless of its file count.
2. **Q4.2 (suspected Medium).** `app/jest.setup.js` is a 1,614-LOC global mock factory: 70+ RN
   module mocks (`:73-172`), SDK component mocks (`:614-732`), analytics constants (`:897-1120`),
   keychain (`:1126-1154`), passport reader (`:1252-1273`). Assess **mock drift** on the three
   security-relevant mocks (keychain, passport reader, SDK NFC components): diff each mock's
   surface against the real module's current API and establish whether any test passes against a
   shape the real module no longer has.
3. **Q4.3.** Recon found zero `.snap` files repo-wide. Confirm, and record the no-snapshot
   posture in "what works well" (it is a posture, not a gap).

### Q5 — Test-infrastructure fragility

1. **Q5.1.** `check-test-requires.cjs` (145 LOC) guards against nested
   `require('react')`/`require('react-native')` in `jest.mock` factories — a known CI OOM cause.
   Verify exactly which directories it scans, confirm every jest-run test root is covered, and
   confirm vitest packages genuinely don't need an equivalent. Confirm the guard runs before
   tests in CI (`mobile-ci.yml:188`).
2. **Q5.2.** The 4 GB heap (`mobile-ci.yml:193`), the virtual-mock workaround
   (`jest.setup.js:309`, "avoid nested requireActual to prevent OOM"), and the 31-entry
   moduleNameMapper (`jest.config.cjs:32-79`) mitigate the same underlying OOM. Document the root
   cause chain and the invariant a contributor must preserve — the institutional knowledge exists
   outside the repo but no in-repo doc carries it (documentation-gap finding, Low).
3. **Q5.3.** Verify every documented test command actually runs: the CLAUDE.md validation block
   (AUD-05's review already found `yarn kmp:test` stale) and each per-package `AGENTS.md`. Stale
   commands are Low findings but break agent workflows; list each with its working replacement.

### Q6 — E2E coverage posture

1. **Q6.1.** Five Maestro flows exist (`launch.android`, `launch.ios`,
   `register-mock-passport.android`, `disclose-via-playground.android`,
   `webview-host-rn-sdk.android`, plus `subflows/`), run by `mobile-e2e.yml` on self-hosted
   Namespace runners. Map the flows against the Q3 register's Tier-1 user journeys and record
   which have no e2e at all — note iOS has launch only. Establish whether e2e gates merges or is
   informational, and what the flake-handling policy is (reruns, quarantine, none).

### Q7 — Disposition and handoff

1. **Q7.1.** For every register row, set a disposition per workstream Stage 5: new Linear issue,
   fold into an existing AUD-0x remediation issue (Q3.3 cross-link), or accept-as-is with a
   stated reason. Coverage gaps on surfaces with an owning workstream route to that workstream's
   `SPEC.md` per the workstream scope rule.

## Method

1. Work the questions in order Q2 → Q3 → Q1 → Q4 → Q6 → Q5 → Q7 (highest candidate severity
   first — unrun suites beat unmeasured coverage — and Q3 early because it anchors Q1.2's
   measurement targets and Q4's risk weighting; Q7 is mandatory and cheap, it survives any time
   box).
2. For each question: cite `path:line` (or workflow file + line) for every claim, then classify
   per the workstream severity rubric. Recon-verified facts above are priors with evidence — the
   activation recon refresh re-verifies counts and line numbers before investigation starts.
3. Characterization tests in this audit take one form only: if Q2 confirms a suite that exists
   but never runs in CI, run it locally and **pin its current pass/fail state in the report**
   (the failure list is the characterization). Write new test code only where pinning requires a
   harness fix-free reproduction; stay under the 400-LOC target.
4. Running suites and coverage locally (including `test:coverage`) is allowed and expected;
   modifying any test, config, or workflow is not. Side effects stay in local build artifacts.
5. CI-history questions (when/why `if: false` landed, whether e2e gates merges) are answered from
   git blame and workflow run history (`gh run list`), not recollection.
6. A confirmed Critical (per rubric: build/release breakage — e.g., a merge-gating suite that is
   silently green due to misconfiguration) triggers the workstream fast-path immediately:
   confidential Linear issue the same day; the report carries a redacted reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-test-coverage-quality-audit.md` with the
   workstream's required sections: header block (noting the `sdk/` scope decision), summary,
   severity-bucketed findings with per-finding acceptance criteria, `Needs investigation` leads
   with dispositions, follow-up issues grouped into PR-sized buckets (the `/gaps-to-issues`
   input), adversarial verification log, what works well, validation.
2. **Risk-ranked gap register** (Q3) — the canonical table: module × risk tier × coverage ×
   status × disposition. Included in the report.
3. **CI execution matrix** (Q2) — suite × workflow × trigger paths × gating. Included in the
   report.
4. **Mock-wiring sample table** (Q4.1) — the 20 sampled files with classifications.
5. **Owner-decision items** — coverage-threshold posture (Q1.1), workspace-test job fate (Q2.1),
   e2e gating posture (Q6.1). Each framed as a decision with a recommendation, not options.

## Files you will NOT modify

- Every test file, jest/vitest config, mock, and `.github/workflows/` file — the audit is
  read-only, and unlike prior audits this one merges little to no test code.
- `app/package.json` and package scripts — stale-command findings (Q5.3) are reported, not fixed.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-04 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

The audit runs every suite it inventories; a documented command that does not run is itself a
Q5.3 finding, so this list is the candidate set, with actual commands and output recorded in the
report's Validation section:

```bash
cd app && node scripts/check-test-requires.cjs && yarn test:ci
yarn workspace @selfxyz/common test
cd packages/mobile-sdk-alpha && yarn test
cd packages/webview-bridge && yarn test
cd packages/rn-sdk && yarn test
cd packages/native-shell-android && ./gradlew testDebugUnitTest
cd packages/native-shell-ios && swift test
```

If a toolchain is unavailable locally (iOS Swift, Android Gradle), record the suite's CI status
from its most recent workflow run instead, and note the substitution explicitly.

## Definition of done

1. Q3.1's placeholder filled with all four upstream coverage maps at the recon refresh — this
   plan does not activate without them.
2. Every Q1–Q7 sub-question answered with citations, or explicitly moved to
   `Needs investigation` with a disposition (workstream Stage 4 rules).
3. Findings report merged in `docs/reviews/` with all required sections, the gap register, and
   the CI matrix.
4. Every register row dispositioned (Q7.1); no gap left without an owning issue, cross-link, or
   stated acceptance.
5. Any confirmed Critical fast-pathed at discovery (confidential issue exists, report redacted).
6. Adversarial review gate passed; owner status set.
7. Linear issues created for accepted Critical/Major findings; AUD-04 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Structural pre-draft authorized by owner, amending the workstream rule that
  output-dependent plans cannot be pre-drafted (SPEC updated same day to permit structural
  pre-drafts with named placeholders). Q3.1 is the only placeholder; all other questions were
  drafted from direct reconnaissance with configs, workflows, and inventories verified at the
  cited lines and counts.
- 2026-06-11 — Recon corrections folded in during drafting: native-shell and KMP suites **do**
  have CI workflows (`native-shells-ci.yml`, `kmp-ci.yml`) — the open Q2.1 questions are
  `new-common`, `packages/rn-sdk`'s own suite, and path-filter blind spots; `mnemonic.ts` has
  hook-level coverage only (not zero); the Maestro flow count is 5, not 7. AUD-05 added as a
  fourth dependency (its Q7.1 coverage map was already promised to this plan) and the SPEC
  backlog row updated to match.
- 2026-06-11 — Review-pass corrections (counts re-verified against the worktree): the `sdk/`
  test-estate figure (451 / 78,348) had counted `node_modules` — actual tracked estate is 2 TS
  test files (21 LOC) + 1 Go test, and the scope-decision rationale was rewritten accordingly;
  suite inventory corrected (`common` 9/1,220 not 56/7,440; `mobile-sdk-alpha` 47/9,229 not
  26/~3.5k; `rn-sdk` 15 files not 22; `new-common` 0 test files not 11 — it has a `test` script
  with no tests; `webview-app` 26/4,492 not 1; `mobile-sdk-demo` 17 not 4); moduleNameMapper is
  26 entries, not 31; `toHaveBeenCalled*` counts corrected to 55 (`rn-sdk`) and 25
  (`webview-bridge`).
