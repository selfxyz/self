# AUD-07 — Config & CI consolidation audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (pre-drafted in sequence after AUD-06; one placeholder — the AUD-06 handoff —
> filled at the recon refresh)
> Priority: Low
> Depends on: AUD-06 (informational — its config-sprawl and CI observations append to this plan
> at the recon refresh; see Q3.3 placeholder)
> Time box: 2 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + registers only. No test code expected.

## Context

You are auditing the **build/CI estate and tool-config sprawl**: 26 workflows (7,072 YAML lines),
19 composite actions, 26 tsconfig variants across 16 workspaces with no shared base, 13 prettier
configs, 8 eslint configs with no root config — and a set of disabled CI steps whose most serious
member is **contract tests that never run** (`contracts.yml:99`, `if: false`, comment "skip until
they get fixed"). Config debt is mostly Low-severity by rubric, but disabled gates are not: a
green check that verifies nothing is a silent failure on a release boundary.

Reconnaissance (2026-06-11) verified the headline facts inline in the question list. Two recon
false alarms were already run down and cleared — fastlane `.env.secrets` is **not** tracked (only
`.env.secrets.example` is; ignored at `app/.gitignore:62`), and npm/npx is absent from workflows —
so do not re-raise them without new evidence. Treat every "suspected" item as unverified: confirm
or refute each with a trace, per the workstream's evidence standard.

**Boundary with AUD-04:** AUD-04 owns the test-suite × workflow execution matrix and the
investigation of the disabled `workspace-test` job. This audit owns the **repo-wide disabled-step
register** (test and non-test alike) and the config estate. Where a disabled step is a test suite
outside AUD-04's inventory (contracts is the known case), the finding lands here and is
cross-referenced into AUD-04's matrix at its recon refresh.

## Scope

### In scope (the complete inventory)

| Area                 | Files / facts                                                                                                                                                                                                                                                                                                                                                                                                | Notes            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Disabled CI          | `workspace-ci.yml:133` (format check, `if: false`), `:174` (workspace-test, `if: false`), `:204-227` (version-consistency job, commented, no rationale); `contracts.yml:97-100` (`yarn test` disabled, "skip until they get fixed"); `web.yml:17` (entire `web-build` job `if: false`); `mobile-e2e.yml:309`, `mobile-deploy.yml:484` (documented/benign — verify)                                           | the register, Q1 |
| Tool configs         | tsconfig ×26 (16 workspaces, no root base; extends chains exist per-workspace), prettier ×13 (root exists; `common/.prettierrc` diverges: printWidth 100, trailingComma es5, arrowParens always), eslint ×8 (no root config), babel ×6 (root `babel.config.js`; app alone has `.babelrc` + `babel.config.cjs` + `babel.config.test.cjs`), metro ×3, `.editorconfig` ×2, `.nvmrc` (22.22.0), `.gitleaks.toml` | Q2               |
| Workflows            | all 26 under `.github/workflows/`; runner mix: ubuntu-latest, ubuntu-slim, macos-latest-large, self-hosted (`selfxyz-org`, ubuntu-24-04), `namespace-profile-apple-silicon-6cpu` ×11                                                                                                                                                                                                                         | Q3, Q4           |
| Composite actions    | 19 under `.github/actions/` (`yarn-install` ~50 uses, `cache-yarn` ~26, `mobile-setup` ×6, token/version/push helpers)                                                                                                                                                                                                                                                                                       | Q3.2             |
| Action/version drift | `actions/checkout` 69× v6 vs 13× v4; `setup-node` uniformly hash-pinned (v6.4.0); `corepack prepare yarn@4.12.0` duplicated 10×                                                                                                                                                                                                                                                                              | Q3.1             |
| Timeouts/concurrency | 14 workflows with no `timeout-minutes` (360-min default), incl. `kmp-ci.yml` (9 jobs) and `mobile-bundle-analysis.yml`; 6 workflows define concurrency groups; self-hosted jobs `circuits.yml:45-48`, `mobile-e2e.yml:66-69` (runs-on labels)                                                                                                                                                                | Q4               |
| Install/hooks        | `--immutable` enforced inside the shared `yarn-install` action (`action.yml:37`, wrapped in `nick-fields/retry`) + 2 direct uses (`mobile-e2e.yml`, `mobile-sdk-demo-e2e.yml`); `.husky/pre-commit` with no `HUSKY=0` anywhere in CI                                                                                                                                                                         | Q5               |
| Secrets              | 33 distinct `secrets.*` names; no `pull_request_target`; fork-guarded token generation at `mobile-e2e.yml:101-111`                                                                                                                                                                                                                                                                                           | Q6               |

### Out of scope

- **Test-suite gating and the suite × workflow matrix** — AUD-04 Q2 owns it (cross-reference
  only, except the contracts case which lands here per the boundary note).
- **Test configs as test infrastructure** (jest/vitest internals, mocks, OOM guard) — AUD-04
  Q5 owns them. They appear here only as line items in the config count.
- **Contract test content** and smart-contract correctness — external-audit territory per the
  workstream scope. Here, only the fact that the CI step is disabled.
- **The deploy pipeline's product behavior** (tracks, versioning policy) — only its workflow
  hygiene (timeouts, disabled steps, secrets) is in scope; MOBILE_DEPLOYMENT.md staleness is
  AUD-06 Q6.1.
- **Analytics/monitoring secret usage correctness** (SENTRY_DSN, SEGMENT_KEY semantics) —
  AUD-08; here they are inventory rows only.
- **Fixing anything** — no workflow edits, no config merges. The workstream invariant is
  read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Disabled and dead CI (the gate register)

1. **Q1.1 (suspected Major for contracts).** Build the disabled-CI register: for every `if: false`
   step/job and commented-out job across all 26 workflows — verified set:
   `workspace-ci.yml:133`, `:174`, `:204-227` (version-consistency, zero rationale);
   `contracts.yml:97-100` (contract `yarn test` skipped "until they get fixed" — **contract
   tests run nowhere in CI**); `web.yml:15-17` (whole job); `mobile-e2e.yml:309` and
   `mobile-deploy.yml:484` (commented as deliberate — verify the stated reasons hold) — record
   the disabling commit (git blame), date, author-stated reason, and a disposition:
   re-enable / delete / keep-with-exit-condition. A disabled gate with no exit condition is the
   CI analogue of an undocumented patch — the AUD-06 patches README is the standard to point at.
2. **Q1.2 (suspected Major).** Green no-ops: `web.yml` still fires on its path triggers with its
   only job disabled, and the disabled `workspace-ci` jobs may still appear as checks. Pull the
   branch-protection required-check lists for `dev`, `staging`, `main` (`gh api`) and establish
   whether **any required check is satisfied by a job that verifies nothing**. A green required
   check backed by a no-op is a silent failure on the merge boundary; classify per rubric
   accordingly.
3. **Q1.3.** Version-consistency (`workspace-ci.yml:204-227`) was a cross-workspace dependency
   version check before it was commented out. Establish what it checked, whether the
   inconsistency class it guarded is present today (sample: the AUD-06 Q1.3 drift rows), and
   fold the answer into the disposition.

### Q2 — Tool-config sprawl

1. **Q2.1.** For each tool, produce the inventory and a convergence recommendation:
   **tsconfig** (26 variants, no monorepo base — which compiler options actually differ and
   which variants are copy-paste), **eslint** (8 configs, no root — the 5 BUSL-header configs
   are near-identical candidates for one shared config), **prettier** (13 configs; root exists
   but `common/.prettierrc` diverges on printWidth/trailingComma/arrowParens — `common` is the
   most-consumed workspace, so its format drift propagates into every PR that touches shared
   code). The report recommends per tool: shared base + `extends`, or a documented exception —
   not a menu of options.
2. **Q2.2.** App has three babel files: `.babelrc` (legacy format), `babel.config.cjs`, and
   `babel.config.test.cjs`. Establish which tools read which file under RN 0.83 and whether
   `.babelrc` is dead (silently shadowed config is worse than sprawl — it looks load-bearing).
3. **Q2.3.** Singleton oddities: a second `.editorconfig` in `packages/kmp-sdk-test-app/`;
   `.nvmrc` 22.22.0 as the single node-version source — confirm every workflow that sets up
   node resolves it from `.nvmrc` (recon saw both `node-version-file` usage and explicit bash
   reads, `mobile-ci.yml:46-58`) and none hardcode a different version.

### Q3 — Workflow duplication and drift

1. **Q3.1.** Action pinning is split two ways: `actions/checkout` 69× `@v6` vs 13× `@v4`
   (tag-pinned), while `setup-node` is hash-pinned everywhere. Decide one pinning convention
   (hash-pinned is the security-conservative default for a repo handling signing secrets) and
   register every drifted action; `corepack prepare yarn@4.12.0` is duplicated 10× across four
   workflows — find the single-source alternative (the `yarn-install` composite action already
   exists; the question is why bare copies persist).
2. **Q3.2.** The 19 composite actions are the estate's good news — verify none are unused or
   near-duplicates (`cache-built-deps` / `cache-core-sdk-build` / `cache-mobile-sdk-build` /
   `cache-sdk-build` is a suspicious family of four), and whether cache keys across them are
   consistent enough to actually hit.
3. **Q3.3 [PLACEHOLDER — AUD-06 handoff lands here at recon refresh].** The per-package CI
   workflows are structural near-clones (~10 of the 26 follow checkout→node→yarn→build→test on
   path filters). Evaluate consolidation into a reusable `workflow_call` workflow parameterized
   per package: what the clones share, what genuinely differs, and a recommendation with the
   migration cost stated. Fold in whatever config-sprawl observations AUD-06 recorded in
   passing.

### Q4 — Timeouts, concurrency, and runner cost

1. **Q4.1.** 14 workflows have no `timeout-minutes` and inherit the 360-minute default —
   including `kmp-ci.yml` (9 jobs) and self-hosted-adjacent workflows. Produce the
   timeout/concurrency table: per workflow, timeout presence, concurrency group,
   `cancel-in-progress`, runner class. Self-hosted and Namespace runners have tight org-level
   concurrency (stale queued runs have starved the queue before — see
   `reference_namespace_runners`); `mobile-e2e.yml` cancels superseded runs
   (`concurrency` at `:62-64`, `cancel-in-progress: true`) but **`circuits.yml` defines no
   concurrency block at all** — its self-hosted `run_circuit_tests` job (`:42-48`) can queue
   superseded runs; confirm and disposition. Verify `mobile-deploy.yml`'s
   `cancel-in-progress: false` (`:101-107`) is the deliberate exception its comment says it is.

### Q5 — Install and hook integrity

1. **Q5.1.** `yarn install --immutable` is enforced inside the shared `yarn-install` composite
   action (`action.yml:37`, already wrapped in `nick-fields/retry`); only 2 workflows pass the
   flag directly (`mobile-e2e.yml`, `mobile-sdk-demo-e2e.yml`). Identify every install that
   bypasses the action, and whether any of those can silently update `yarn.lock` (a
   non-immutable CI install masks lockfile drift) or runs without the retry wrapper — bare
   installs should migrate to the action; record each.
2. **Q5.2.** No workflow sets `HUSKY=0`. Establish whether the husky pre-commit hook can
   actually fire in CI under Yarn 4 (postinstall behavior) — if it can't, the absence is fine
   and gets recorded as verified; if it can, any workflow that commits (release-calendar,
   version-bump PRs via `create-version-bump-pr`/`push-changes` actions) is running local hooks
   on a runner, which is fragile.

### Q6 — Secrets and trigger security

1. **Q6.1.** 33 distinct secrets are referenced across workflows. Build the secret × workflow
   matrix and verify the trigger posture systematically: no `pull_request_target` exists
   (verified at recon); confirm every secrets-consuming workflow is unreachable from fork PRs —
   the fork-guard pattern at `mobile-e2e.yml:101-111` is the model; find any workflow that
   consumes secrets on a plain `pull_request` trigger without it. Signing-key secrets
   (`ANDROID_KEYSTORE*`, `IOS_DIST_CERT*`) get a least-privilege check: which workflows can
   read them vs which need to.

## Method

1. Work the questions in order Q1 → Q6 → Q4 → Q5 → Q2 → Q3 (gates and secrets first — the only
   candidates above Low; config consolidation last, it's important but never urgent; the time
   box truncates consolidation analysis, not the gate register).
2. Every claim cites a workflow `path:line` or a reproducible command (`gh api` for branch
   protection, `git blame` for disabling commits); counts come from recorded grep invocations a
   reviewer can re-run.
3. No test code. The characterization artifacts are the registers: disabled-CI register
   (Q1), config inventory (Q2), drift register (Q3), timeout/concurrency table (Q4),
   secret × workflow matrix (Q6).
4. Branch-protection and workflow-run history come from the GitHub API (`gh api`, `gh run
list`), read-only. If API access is unavailable mid-audit, the affected sub-questions move
   to `Needs investigation` with the exact command documented.
5. A confirmed Critical (per rubric: release breakage — e.g., Q1.2 finding a required check on
   `main` satisfied by a no-op while gating production deploys) triggers the workstream
   fast-path immediately: confidential Linear issue the same day; the report carries a redacted
   reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-config-ci-audit.md` with the workstream's
   required sections: header block, summary, severity-bucketed findings with per-finding
   acceptance criteria, `Needs investigation` leads with dispositions, follow-up issues grouped
   into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification log, what
   works well (the composite-action estate and fork-guard pattern are candidates), validation.
2. **Disabled-CI register** (Q1) — step × disabling commit × reason × required-check status ×
   disposition.
3. **Config inventory + convergence recommendations** (Q2) — per tool: count, divergence, one
   recommendation each.
4. **Drift and duplication registers** (Q3) — action versions, unfactored boilerplate,
   clone-workflow consolidation recommendation.
5. **Timeout/concurrency table** (Q4) and **secret × workflow matrix** (Q6).

## Files you will NOT modify

- Everything — this audit merges a report and registers only. No workflow edits, no config
  merges, no re-enabling disabled steps (each is a remediation issue with its disposition as
  acceptance criteria).
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-07 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

The audit's claims are reproducible commands, recorded with output in the report:

```bash
grep -rn "if: false" .github/workflows/                                   # Q1 register seed
grep -rh "uses: actions/checkout@" .github/workflows/ | sort | uniq -c    # Q3.1 drift
gh api "repos/{owner}/{repo}/branches/dev/protection/required_status_checks"      # Q1.2
gh api "repos/{owner}/{repo}/branches/main/protection/required_status_checks"     # Q1.2
grep -rn "immutable" .github/workflows/ .github/actions/                  # Q5.1
grep -roh "secrets\.[A-Z_0-9]*" .github/workflows/ | sort -u              # Q6.1
```

## Definition of done

1. Every Q1–Q6 sub-question answered with citations or reproducible-command evidence, or
   explicitly moved to `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections and all five registers.
3. Every disabled step dispositioned (re-enable / delete / keep-with-exit-condition) — none
   left bare; the contracts finding cross-referenced into AUD-04's matrix.
4. Any confirmed Critical fast-pathed at discovery (confidential issue exists, report
   redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-07 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Plan pre-drafted in sequence after AUD-06 per the workstream rule. One
  placeholder: Q3.3 receives AUD-06's config-sprawl handoff at the recon refresh; all other
  questions drafted from direct reconnaissance verified at the cited lines and counts.
- 2026-06-11 — Recon corrections vs the initial sweep: fastlane `.env.secrets` is **not**
  git-tracked (only the `.example`; ignored at `app/.gitignore:62`) — false alarm cleared and
  recorded so the audit doesn't re-chase it; composite-action count corrected to 19 (sweep
  claimed 43); checkout split verified at 69× v6 / 13× v4; `contracts.yml:99` disabled contract
  tests verified directly with surrounding context, promoted to Q1.1's lead finding and flagged
  for AUD-04's matrix.
- 2026-06-11 — Review-pass corrections: babel configs ×6, not ×8; `corepack prepare` duplicated
  10×, not ~20×; `kmp-ci.yml` has 9 jobs, not 65; `--immutable` lives in the shared
  `yarn-install` action (2 direct workflow uses), not "13 workflows" — Q5.1 reframed to hunt
  installs that bypass the action; `circuits.yml` has no concurrency block (the cited `:45-48`
  is its runs-on labels), `mobile-e2e.yml` concurrency is at `:62-64`, and `mobile-deploy.yml`'s
  is at `:101-107`.
