# Codebase Audits — Workstream Spec

> Last updated: 2026-06-11
> Owner: Mobile / Justin Hernandez
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Why

The app's highest-risk surfaces — key material, NFC chip reading, startup routing — have grown
through rapid iteration and now carry known structural debt: duplicated parsing logic with no
canonical owner, silent failure paths on security-critical migrations, zero test coverage on
seed-phrase and keychain code, and a live `common`/`new-common` package split. None of this is
tracked as a coherent body of work; it surfaces piecemeal in PR reviews and incident response.

This workstream runs **planned, scoped audits** of one surface at a time. Each audit produces a
findings document with severity-ranked, evidence-backed findings and per-finding acceptance
criteria, which then flow into Linear issues and remediation specs through the existing pipeline.
The goal is not a one-time cleanup but a repeatable protocol: audit → verified findings → issues →
remediation specs → fixes with regression coverage.

## Scope

- **In:** read-only investigation of existing code, configuration, CI, and tests; findings
  documents; characterization tests that pin current behavior; remediation backlog creation.
- **In:** all repo surfaces — `app/`, `packages/`, `common/`, `sdk/`, CI workflows — not only SDK
  packages. The workstream lives here because the protocol and pipeline are SDK-project assets.
- **Out:** the remediation work itself. Fixes are separate PRs under their own backlog IDs, owned
  by whichever workstream the finding belongs to (audits of SDK surfaces route findings to the
  owning workstream's `SPEC.md`; app-only findings stay in this backlog as `AUD-NN` follow-ups).
- **Out:** external/third-party security audits, circuit (Noir/Circom) soundness review, and
  smart-contract audits. Those need specialist scoping and are tracked separately.
- **Out:** product/UX review. Audits judge correctness, security, and maintainability — not design.

## Audit & Review Protocol

Every audit follows the same five stages. One audit is active at a time; the next does not start
until the current one passes Stage 4. Plans may be drafted ahead of execution, but only in
sequence — each draft absorbs the previous drafts' review lessons; never in parallel. A
pre-drafted plan is a snapshot, not a commitment: before its audit activates, it gets a **recon
refresh** — every cited `path:line` re-verified, findings from completed audits and any protocol
revisions folded in — and an owner re-review. Plans whose question lists depend on earlier audit
outputs (see Backlog dependencies) cannot be pre-drafted.

### Stage 1 — Scope plan

Each audit gets a Linear tracking issue first (per the planning protocol in
[SDK Contributing](../../CONTRIBUTING.md)), then an execution plan (`plans/AUD-NN-<slug>.md`)
**before** any investigation starts. The plan is attached to the tracking issue as a Linear
document copy. The plan is agent-executable: second person, exact file paths and line numbers,
explicit in/out boundaries, named validation commands, and a definition of done. The plan fixes
the question list — the specific failure modes and invariants to check — so the audit cannot
drift into an unbounded code tour, and states a **time box**; when it expires, remaining
question-list items split into a new `AUD-NN` backlog row instead of extending the audit. Plans
are reviewed by the owner before execution.

### Stage 2 — Investigation

- **Evidence standard.** Every finding must cite the exact code (`path:line`), the concrete
  failure scenario (what sequence of states triggers it), and the observed-vs-expected behavior.
  "This looks fragile" is not a finding; "X fails silently when Y because Z" is.
- **Reproduce or trace.** Each Critical/Major finding is either reproduced (test, script, manual
  steps) or traced end-to-end through the code with the full call path documented. Findings that
  cannot be reproduced or traced are downgraded to `Needs investigation` and listed separately.
- **Critical fast-path.** A Critical security finding escalates the moment it is found: notify
  the owner directly and open a confidential Linear issue carrying the full trigger scenario the
  same day — it does not wait for the report, the review gate, or Stage 5, and the
  one-active-audit rule does not delay its remediation. The committed report references the
  finding by issue link with exploit details redacted; un-redaction lands as a follow-up note
  once disclosure is safe (a shipped fix alone does not qualify), never as an edit to the
  accepted report.
- **Characterization tests.** For Critical/Major findings on security-critical paths, the audit
  writes tests that pin **current** behavior (including current bugs) before any fix lands. These
  merge with the audit, not with the remediation.

### Stage 3 — Findings document

The report lands in `docs/reviews/` as `YYYY-MM-DD-<slug>-audit.md`, following the format of the
existing Euclid settings-tunnel audit. Required sections: header block (date, scope, auditor,
status), summary, severity-bucketed findings each with acceptance criteria, `Needs investigation`
leads with disposition, a **follow-up issues section grouping findings into PR-sized buckets** (the
structure `/gaps-to-issues` consumes — without it the Stage 5 handoff breaks), an adversarial
verification log, what works well, and validation (commands run, tests written). Severity rubric:

| Severity     | Meaning                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| **Critical** | Exploitable security flaw, permanent data/key loss, or build/release breakage    |
| **Major**    | Incorrect behavior on a real user path; silent failure on a security boundary    |
| **Medium**   | Latent bug needing unusual conditions; missing coverage on a critical module     |
| **Low**      | Maintainability debt, dead code, config sprawl, documentation gaps               |

### Stage 4 — Adversarial review gate

Before the report is final, every Critical/Major finding is independently re-verified by a
reviewer (or review agent) instructed to **refute** it: confirm the cited code exists at the cited
lines, the trigger scenario is reachable, and the claimed impact follows. Findings that fail
refutation are removed or downgraded with a note — they do not silently disappear. The gate also
dispositions every `Needs investigation` item from Stage 2: re-queue it into a named later
audit's question list, convert it to an investigation Linear issue, or drop it with a stated
reason in the report — none are left without a disposition. The owner then reviews the full
report and sets its status: `Ship as-is` (findings accepted), `Revise`, or `Rejected`. The report
records reviewer/agent, method, result, and downgrade/removal note for each Critical/Major
finding. Only accepted reports proceed to Stage 5.

### Stage 5 — Remediation handoff

Accepted findings flow through the existing pipeline: `/gaps-to-issues` creates one Linear issue
per finding bucket (Critical/Major findings always get issues; Medium/Low may be batched), then
`/spec-from-audit` produces remediation specs for issues that need more than a trivial fix.
Remediation specs route to the owning workstream where one exists. The audit's backlog row moves
to `Done` only when issues exist for every accepted Critical/Major finding and every
`Needs investigation` lead has a disposition — not when fixes ship.

### Definition of done (per audit)

1. Linear tracking issue exists; execution plan reviewed, merged, and attached to it before
   investigation began.
2. Findings doc in `docs/reviews/` with every finding evidence-cited and acceptance-criteria'd,
   including the follow-up-issues bucket section.
3. Every Critical/Major finding adversarially verified and either reproduced or traced; any
   Critical security finding escalated via the fast-path at discovery, not at handoff.
4. Characterization tests merged for Critical/Major findings on security paths.
5. Linear issues created for all accepted Critical/Major findings, linked from the report; every
   `Needs investigation` item dispositioned.
6. This file's backlog row updated; any invariant the audit invalidated flagged in the owning
   workstream's `SPEC.md`.

## Invariants

- **Audits are read-only.** An audit PR may add tests, docs, and specs — never behavior changes.
  Fixes, however small, go in remediation PRs. (Tempting one-line fixes get a finding instead.)
- **One active audit at a time.** Depth over breadth; each plan incorporates prior findings.
- **Critical security findings interrupt the normal lane.** Private escalation beats protocol
  sequencing; public docs redact exploit detail until disclosure is safe.
- **No unverified Critical/Major findings in an accepted report.** The adversarial gate is
  mandatory, not advisory.
- **Findings are falsifiable.** Each one names the code, the trigger, and the impact, so a
  reviewer can independently confirm or refute it.
- **IDs are never reused**; cancelled audits move to the Cancelled section.

## Backlog

| ID     | Title                                                                     | Status | Priority | Depends on             | Plan |
| ------ | ------------------------------------------------------------------------- | ------ | -------- | ---------------------- | ---- |
| AUD-02 | Key material & keychain lifecycle (mnemonic, migration, backup, biometrics) | Ready  | High     | —                      | [plan](./plans/AUD-02-key-material-keychain-lifecycle.md) |
| AUD-01 | NFC chip-reading flow (native auth fallbacks, parser duplication, timeouts) | Ready  | High     | AUD-02                 | —    |
| AUD-03 | Onboarding & startup routing (state matrix, recovery, deep links, KYC resume) | Ready  | High     | AUD-02                 | —    |
| AUD-05 | Bridge protocol surface (adapter fail-closed review, session lifecycle)     | Ready  | High     | —                      | —    |
| AUD-04 | Test coverage & test quality (risk-ranked gaps, mock-wiring tests, thresholds) | Ready  | Medium   | AUD-01, AUD-02, AUD-03 | —    |
| AUD-06 | Cruft & dead code (common/new-common split, dead routes, artifacts, patches) | Ready  | Medium   | —                      | —    |
| AUD-07 | Config & CI consolidation (tool-config sprawl, disabled workflow steps)     | Ready  | Low      | AUD-06                 | —    |
| AUD-08 | Analytics & observability correctness (funnel fire-sites, Sentry sanitization) | Ready  | Low      | AUD-01, AUD-03         | —    |

Allowed statuses: `Ready`, `Planned` (plan merged, investigation not started), `In Progress`,
`In Review` (report at Stage 4), `Blocked`, `Done`.

Execution order is the table order. AUD-02 is the **pilot**: it exercises every protocol stage on
the smallest high-risk surface, and the protocol above gets revised from its lessons before AUD-01
starts. Dependencies are informational (findings feed later scopes), not hard blockers — except
AUD-04, which needs the critical-path maps the first three audits produce.

## Execution Model

- This file owns the protocol, severity rubric, and backlog. Per-audit question lists, file
  inventories, and validation commands live in `plans/`.
- Plan files freeze when their audit moves to `In Progress` — after the activation recon refresh,
  for pre-drafted plans. Protocol changes discovered mid-audit update this file, with the delta
  noted in the active plan's status log.
- Findings documents in `docs/reviews/` are immutable once accepted; corrections happen via
  follow-up notes, never edits to accepted findings.

## Future Concerns (not tracked specs)

- **Recurring audit cadence.** Once the backlog completes, decide whether Tier-1 surfaces get
  re-audited on a schedule (e.g., post-major-RN-upgrade). Trigger: AUD-08 completion.
- **External security audit prep.** The findings corpus doubles as a scoping document for a
  third-party audit of key handling and NFC. Trigger: external audit scheduled.
- **Circuit and contract audits.** Out of scope here; need specialist protocol. Trigger: owner
  decision.

## Cancelled

IDs are not reused. (None yet.)
