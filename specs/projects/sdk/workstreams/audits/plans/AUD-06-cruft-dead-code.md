# AUD-06 — Cruft & dead code audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (pre-drafted in sequence after AUD-04; requires recon refresh + owner re-review at activation)
> Priority: Medium
> Depends on: — (informational inputs: AUD-03 Q3.5 and AUD-05 Q6.2 recorded leads for this audit;
> fold their accepted-report dispositions in at the recon refresh)
> Time box: 3 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + inventory tables only. Characterization here is mostly
> divergence/consumer tables, not tests; target <200 LOC of test code, likely zero.

## Context

You are auditing **accumulated structural debt**: the live `common`/`new-common` package split the
workstream's Why names explicitly, disabled-but-shipped feature code, two coexisting patch
systems, committed build artifacts, and the repo's posture toward detecting dead code at all.
Cruft is a correctness risk here, not just hygiene: the split means the same parsing/crypto module
names exist in two packages with no canonical owner, and the patch pipeline guards security
behavior (keychain, passport reader) behind an install step that can fail silently.

Reconnaissance (2026-06-11) verified the headline facts inline in the question list: both packages
are **live** — `@selfxyz/common` v0.0.9 (100 files, 16,603 LOC) serves app/SDK while
`@selfxyz/new-common` v0.0.1 (110 files, 12,993 LOC) serves circuits/contracts — with **37
identically-named source files** (unique basenames under each `src/`, tests excluded) in both
trees and no migration doc; `app/package.json:42` runs
patch-package with `|| true`; ~74 LOC of Turnkey backup/restore flows are commented out while the
`@turnkey/core` dependency and its data-loss-guarding patch remain installed; and
`app/docs/MOBILE_DEPLOYMENT.md` contradicts both `mobile-deploy.yml` and itself. Treat every
"suspected" item as unverified: confirm or refute each with a trace or a reproduction, per the
workstream's evidence standard.

A note on evidence for this audit: a "dead code" claim is a claim of **absence**, so each finding
must name the search that produced it (tool, pattern, scope) precisely enough for a reviewer to
re-run it — that is what makes an absence claim falsifiable at the Stage 4 gate.

## Scope

### In scope (the complete inventory)

| Area                         | Files / dirs                                                                                                                                                                                                                                                                                                                       | Notes                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The package split            | `common/` (100 files, 16,603 LOC), `new-common/` (110 files, 12,993 LOC)                                                                                                                                                                                                                                                           | 37 same-named files; consumer map per Q1                                            |
| Patch systems                | `patches/` (4 patch-package patches + README), `.yarn/patches/` (ws-8.18.0), `scripts/run-patch-package.cjs`, `app/package.json:42`, root `package.json:34`                                                                                                                                                                        | two mechanisms, two failure modes                                                   |
| Disabled Turnkey integration | `app/src/screens/account/settings/CloudBackupScreen.tsx:229-261`, `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx:186-213`, `app/src/navigation/deeplinks.ts:416-441`, `@turnkey/core` dep + `patches/@turnkey+core+1.7.0.patch`                                                                                 | remove-or-complete decision                                                         |
| Committed artifacts          | `packages/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar` (1.2 MB tracked); embedded WebView bundles (`packages/native-shell-android/src/main/assets/self-wallet/` ~99 MB / 64 files incl. 7 `.js.map`, `packages/native-shell-ios/Resources/self-sdk-web/` ~53 MB / 55 files incl. 3 `.js.map` — 10 sourcemaps total) | bundle _policy_ is AUD-05 Q2.4; staleness/sourcemaps are here                       |
| Dead-code tooling            | `knip.config.ts`, knip 5.63.1 (devDep, **not run in any workflow**), `scripts/audit/tech-debt-baseline.mjs` → `docs/maintenance/tech-debt-baseline.{json,md}` (last committed 2026-04-08)                                                                                                                                          | posture + adoption question                                                         |
| Commented-out code           | sweep of `app/src/` and `packages/*/src/` for 10+-line code-shaped comment blocks                                                                                                                                                                                                                                                  | known: `IDSelectionScreen.tsx:93-102`, `DocumentNFCMethodSelectionScreen.tsx:82-91` |
| Stale docs                   | `app/docs/MOBILE_DEPLOYMENT.md` vs `.github/workflows/mobile-deploy.yml`; post-rename `OpenPassport` leftovers (rename finished in c2347312b)                                                                                                                                                                                      | —                                                                                   |
| Workspace orphans            | all `workspaces` globs (root `package.json`): `app`, `circuits`, `common`, `contracts`, `new-common`, `packages/*`, `prover/tests`, `scripts/tests`, `sdk/*`; on-disk leftovers (`sdk/tests` has no tracked files)                                                                                                                 | inventory-level                                                                     |

### Out of scope

- **Tool-config sprawl and disabled CI workflow steps** — AUD-07 owns those (the
  `workspace-ci.yml` `if: false` jobs are already AUD-04 Q2.1 / AUD-07 territory). Config-sprawl
  observations made in passing are recorded and handed to AUD-07's plan, not investigated here.
- **Deciding the `common`/`new-common` end-state.** This audit produces the consumer map,
  divergence table, and a recommendation; the convergence decision and migration are owner +
  remediation work.
- **Dev-screen production reachability** — AUD-03 Q5 owns the security question. This audit may
  cite `devTools.tsx` only as a cross-reference.
- **Embedded-bundle hosting policy** — AUD-05 Q2.4 owns remote-vs-embedded. Only staleness,
  sourcemap shipping, and regeneration provenance are in scope here.
- **Deleting anything.** The workstream invariant is read-only; every deletion is a remediation
  PR scoped by this audit's dispositions.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — The `common`/`new-common` split

1. **Q1.1.** Build the authoritative consumer map. Recon priors: `@selfxyz/common` ←
   `app`, `sdk/core`, `packages/mobile-sdk-alpha`, `packages/mobile-sdk-demo` (~55 import
   sites); `@selfxyz/new-common` ← `circuits`, `contracts` (imports concentrated in
   `circuits/tests/`). Verify and complete the map: every consumer, import-site count, and which
   subpath exports are actually used from each package.
2. **Q1.2 (suspected Major on crypto/parsing rows).** For each of the 37 identically-named files
   present in both trees, classify: `identical copy / diverged / same-name-different-purpose`.
   For the security-relevant subset — certificate parsing (`parseCertificateSimple.ts`,
   `parseDscCertificateData.ts`, `csca.ts`), `poseidon.ts`, `passport.ts`, `ofac.ts`,
   `signature.ts`, `crypto.ts` — establish whether divergence is behavior-affecting: same input,
   different output on any path a consumer exercises. A confirmed behavioral divergence in
   parsing/crypto between the two packages is the workstream's founding "no canonical owner"
   concern made concrete, and routes to the owning workstream as Major.
3. **Q1.3.** Dependency drift between the packages: `poseidon-lite` ^0.2.0 vs ^0.3.0, `uuid`
   ^11 vs ^13, `node-forge` custom fork vs upstream ^1.3.1. For each drift, determine whether the
   two versions can produce different results on a security path (poseidon hashing and forge
   certificate handling are the candidates to check first).
4. **Q1.4.** No migration or ownership doc exists for the split. The report must force an owner
   decision with a recommendation: converge (which direction, in what order, who owns it) or
   declare the split deliberate with documented ownership boundaries. The Q1.1–Q1.3 tables are
   the decision's evidence base.

### Q2 — Patch systems and install-time integrity

1. **Q2.1 (suspected Major).** `app/package.json:42` runs
   `npx patch-package --patch-dir ../patches || true` — the `|| true` means an install where the
   `react-native-keychain+10.0.0` or `react-native-passport-reader+1.0.3` patch fails to apply
   still succeeds, **unpatched**. Per `patches/README.md`, the keychain patch controls Android
   StrongBox opt-out on writes and the passport-reader patch forwards CAN-mode inputs — both sit
   on AUD-02/AUD-01 surfaces. Trace every install path (local dev, each CI workflow, EAS/release
   builds): which run the root postinstall (`scripts/run-patch-package.cjs`, which skips on
   Vercel and detects CI) vs the app-level `|| true` variant, and prove or refute that a release
   build can be produced from an unpatched `node_modules`. Read `run-patch-package.cjs` end to
   end — recon read only the first 40 lines; its CI-vs-local failure behavior is unverified.
2. **Q2.2.** Patches pin exact versions while the deps use ranges: patch targets
   `react-native-keychain@10.0.0` but `app/package.json` declares `^10.0.0` (same for
   `react-native-date-picker` ^5.0.13). Establish what patch-package does on a minor-version
   resolution drift under each install path from Q2.1, and whether the lockfile currently pins
   the exact patched versions.
3. **Q2.3.** Two patch mechanisms coexist: Yarn-native (`.yarn/patches/ws-npm-8.18.0`) and
   patch-package (`patches/`). Establish why `ws` uses the Yarn mechanism while RN packages use
   patch-package, whether consolidation is possible, and verify each patch's documented
   drop-when condition against current upstream state (`patches/README.md` documents all four —
   this is the standard; the audit checks the conditions are still accurate, not that they
   exist).
4. **Q2.4 (cross-reference, record only).** The `@turnkey/core` patch exists because unpatched
   `TurnkeyClient.clearSession` can enumerate and **delete app-owned keychain entries** (per
   `patches/README.md`). Hand this to AUD-02's recon refresh as a confirmed keychain-deletion
   vector guarded only by a patch — AUD-02 owns the keychain surface; this audit owns the
   "patched dep for a disabled feature" disposition (Q3.1).

### Q3 — Disabled Turnkey integration

1. **Q3.1.** ~74 LOC of Turnkey backup/restore is commented out — `CloudBackupScreen.tsx:229-261`
   ("DISABLED FOR NOW"), `AccountRecoveryChoiceScreen.tsx:186-213`, the OAuth deep-link
   short-circuit `deeplinks.ts:416-441` (AUD-03 Q3.5 confirms the live `code || id_token` branch
   no-ops) — while `@turnkey/core` 1.7.0 stays installed **and initialized** with a patch whose
   reason is preventing it from deleting app keychain data (Q2.4). Establish the integration's
   actual status (abandoned vs awaiting upstream), enumerate every reachable UI element, dep,
   patch, and settings entry that exists only for the disabled flows, and produce a single
   **remove-or-complete decision item** covering all of it. While the dep is installed and
   initialized, its blast radius is live even though the feature is not — say so explicitly in
   the finding.

### Q4 — Committed artifacts

1. **Q4.1.** `packages/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar` (1.2 MB) is
   tracked. CLAUDE.md forbids committing generated artifacts unless the build requires them for
   runtime/distribution. Establish what (if anything) consumes the tracked AAR — Gradle includes,
   docs, downstream packages — and whether it is current with the source it was built from. A
   stale tracked binary that something consumes is worse than an unused one; classify
   accordingly.
2. **Q4.2.** The embedded WebView bundles (~152 MB, 119 tracked files across both native shells)
   are required by the embedded-bundle posture — the policy is AUD-05 Q2.4's. This audit answers
   three narrower questions: (a) are the 10 committed `.js.map` sourcemaps intended to ship
   inside release artifacts, and do they; (b) what regenerates the bundles from `webview-app`
   source and is there any staleness check (can bundle and source drift silently); (c) is the
   regeneration provenance documented (who built the committed bundle, from what commit).
3. **Q4.3.** Sweep `git ls-files` for other tracked generated output (`.tsbuildinfo`, stray
   `dist/`, codegen) and on-disk leftovers with no tracked files (`sdk/tests` is the known case);
   disposition each.

### Q5 — Dead-code detection posture

1. **Q5.1.** `knip.config.ts` is comprehensively configured and knip 5.63.1 is a devDependency,
   but **no CI workflow runs it** (recon grep of `.github/workflows/`, zero hits). Run knip,
   triage its output into true-dead / config-gap / false-positive per workspace, and report
   counts with the top findings as evidence. The report forces an owner decision on enforcement
   (CI gate, scheduled run, or deliberate non-enforcement); the CI wiring itself is AUD-07
   remediation territory — cross-reference, don't fix.
2. **Q5.2.** `scripts/audit/tech-debt-baseline.mjs` writes
   `docs/maintenance/tech-debt-baseline.{json,md}`, last committed 2026-04-08. Establish what it
   measures, rerun it, diff against the committed baseline, and decide its relationship to this
   workstream: adopt it as a recurring instrument, fold its metrics into this audit's report, or
   retire it. Two competing debt registers is itself cruft — the report picks one.
3. **Q5.3.** Fresh sweep for 10+-line commented-out code blocks beyond the Turnkey set (known:
   `packages/webview-app/src/screens/onboarding/IDSelectionScreen.tsx:93-102`,
   `app/src/screens/documents/scanning/DocumentNFCMethodSelectionScreen.tsx:82-91`). Disposition
   each: delete (remediation issue) or keep with a `TODO:` naming an owner and exit condition.

### Q6 — Stale documentation

1. **Q6.1 (verified contradictory at recon).** `app/docs/MOBILE_DEPLOYMENT.md` states merges to
   `dev` → internal testing and `main` → production (`:11-12`, branch table `:50-51`), while
   `mobile-deploy.yml` auto-deploys on PR merges to **staging**, builds from staging, and opens a
   version-bump PR to dev (workflow header comments, lines 1-27) — and the doc's own line 59
   says staging, contradicting its own lines 11-12. Inventory every doc that describes the
   deploy flow, and write one finding whose acceptance criteria are the corrected flow
   description.
2. **Q6.2.** The OpenPassport → Self rename finished in c2347312b. Sweep for leftover
   `OpenPassport` references (code, docs, bundle IDs, strings) as a rename-completeness check,
   and more generally for docs referencing removed features or pre-RN-0.83 instructions.
   Per-file Low findings batch into one issue.

## Method

1. Work the questions in order Q2 → Q1 → Q3 → Q4 → Q5 → Q6 (install-integrity first — it is the
   only candidate with direct security impact — then the split, then the decision items; the time
   box truncates docs, not the head).
2. For every dead/unused/stale claim, record the exact search or tool invocation (pattern, scope,
   flags) in the finding so the Stage 4 reviewer can re-run it. Knip and grep output are evidence;
   "I didn't find references" without the search is not.
3. Characterization for this audit is tabular, not test code: the Q1.2 divergence table, the Q2
   patch register, and the Q4 artifact inventory pin current state. Only if Q1.2 confirms a
   behavioral divergence on a security path does test code enter: a minimal same-input/two-outputs
   repro script, attached to the escalated finding, not merged as a suite.
4. Running knip, the tech-debt script, and installs in a scratch checkout is allowed; modifying
   tracked files is not. Patch-failure traces (Q2.1/Q2.2) run against a disposable
   `node_modules`, never against a tree you then build from.
5. A confirmed Critical (per rubric: a release build shipping unpatched keychain/passport-reader
   behavior, Q2.1) triggers the workstream fast-path immediately: confidential Linear issue the
   same day; the report carries a redacted reference.
6. Hand AUD-07 its inputs at the end regardless of time-box state: config-sprawl observations,
   the knip-enforcement decision, and any CI-step findings recorded in passing.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-cruft-dead-code-audit.md` with the
   workstream's required sections: header block, summary, severity-bucketed findings with
   per-finding acceptance criteria, `Needs investigation` leads with dispositions, follow-up
   issues grouped into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification
   log, what works well (the patches README and knip config are candidates), validation.
2. **Split decision package** (Q1) — consumer map, 43-file divergence table, dependency-drift
   table, and a recommended convergence direction.
3. **Patch register** (Q2) — patch × target version × resolved version × install-path failure
   behavior × drop-when status.
4. **Cruft inventory with dispositions** (Q3–Q6) — every item marked delete / keep-with-owner /
   complete, bucketed for `/gaps-to-issues`.
5. **AUD-07 handoff** — config-sprawl and CI observations recorded in passing, appended to
   AUD-07's plan at its recon refresh.

## Files you will NOT modify

- Everything — this audit merges a report and tables only. No deletions, no patch edits, no
  config changes, no doc fixes (the MOBILE_DEPLOYMENT.md correction is a remediation issue with
  the corrected text in its acceptance criteria).
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-06 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

The audit's claims are reproducible searches and tool runs; the report's Validation section
records each invocation and its output. Core set:

```bash
yarn knip                                          # Q5.1 — triage output per workspace
node scripts/audit/tech-debt-baseline.mjs          # Q5.2 — diff against committed baseline
git ls-files | grep -E '\.aar$|\.jsbundle$|\.js\.map$|(^|/)dist/'   # Q4 inventory
grep -rn "OpenPassport" --include='*' -l .         # Q6.2 sweep (excluding .git)
```

Plus the Q1 import-site and Q2 install-path traces, recorded verbatim in the report.

## Definition of done

1. Every Q1–Q6 sub-question answered with citations (or the named search proving absence), or
   explicitly moved to `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections, the split decision
   package, and the patch register.
3. Every inventory item dispositioned: delete / keep-with-owner / complete — none left bare.
4. Any confirmed Critical fast-pathed at discovery (confidential issue exists, report redacted);
   the Q2.4 keychain-deletion vector handed to AUD-02's recon refresh regardless of severity
   here.
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-06 backlog row updated;
   AUD-07 handoff appended to its plan; any invariant this audit invalidates flagged in the
   owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Plan pre-drafted in sequence after AUD-04 per the workstream rule. No placeholder
  inputs: AUD-06 has no hard dependencies; the AUD-03 Q3.5 / AUD-05 Q6.2 leads were folded in at
  draft time and their accepted-report dispositions get re-checked at the recon refresh.
- 2026-06-11 — Recon corrections vs the initial sweep: the `patches/` patch-package directory (4
  patches including keychain and passport-reader) was missed by the first pass and found on
  verification — the `app/package.json:42` `|| true` swallow is now Q2.1's prior; the
  "new-common has zero imports" claim was wrong (circuits tests import it heavily — Q1.1
  corrected); `MOBILE_DEPLOYMENT.md` staleness was confirmed against the workflow file after the
  first pass wrongly cleared it (Q6.1); `patches/README.md` documents why + drop-when for all
  four patches, so Q2.3 verifies conditions rather than demanding their existence.
- 2026-06-11 — Review-pass corrections: the same-named-file count is 37 unique basenames (the 43
  figure double-counted; method now stated inline so the recon refresh can re-run it); the 10
  committed `.js.map` sourcemaps split 7 Android / 3 iOS, not 10 in the iOS bundle alone.
