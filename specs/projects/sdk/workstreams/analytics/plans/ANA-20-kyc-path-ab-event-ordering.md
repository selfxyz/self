# ANA-20 — KYC Path A / Path B event-ordering audit

> Linear: TBD
> Workstream: [Onboarding Analytics & Funnel](../SPEC.md)
> Depends on: ANA-12 (defines the Path C ordering invariant and shared events)
> Status: Ready
> Priority: Medium
> PR target: <300 LOC.

## Context

Re-homed from the archived RN upgrade follow-up doc
(`specs/archive/rn-upgrade/RN-UPGRADE-FOLLOWUPS.md`, item 2), which
identified this while reviewing the RN 0.83 upgrade PR but had no
workstream to file it under. It is analytics work, not RN work.

ANA-12 establishes this ordering for **Path C**: `SCAN_STARTED` must fire
before any KYC branch event because that entry can lack an active funnel
attempt. Path C was fixed in `app/src/providers/selfClientProvider.tsx`,
where the ordering is explicit and carries a comment at `:377`. ANA-20
extends that ordering to Paths A and B as a new decision so every KYC
entry has the same observable start boundary.

**Paths A and B still have the original bug — verified 2026-08-09:**

| Path | Site                                                                                | `SESSION_REQUESTED` | `SCAN_STARTED` |
| ---- | ----------------------------------------------------------------------------------- | ------------------- | -------------- |
| A    | `app/src/hooks/useKycLauncher.ts` (biometric fallback)                              | `:150`              | `:157`         |
| B    | `app/src/screens/documents/selection/LogoConfirmationScreen.tsx` ("no chip" branch) | `:83`               | `:96`          |

In both, the branch event is emitted first. Path A normally has an attempt
from earlier MRZ/NFC steps, while Path B normally has one from document
selection. That makes the branch event land in the common flow, but the
ordering depends on earlier navigation and drops the event for direct or
partially restored entries. ANA-20 removes that dependency.

## Decision

Reorder both sites so `SCAN_STARTED` precedes `SESSION_REQUESTED`, and
consolidate all three KYC emission sites onto one shared helper. ANA-12
flags this consolidation as a follow-up; this is the spec that does it.

Consolidate rather than reorder-in-place. Three hand-ordered copies of
the same two-event sequence is what produced a bug in two of three
copies; a helper makes the ordering unrepresentable-wrong. Do not leave
the reorder as the whole fix.

### Failure semantics — this reorder does change counts

Today Paths A and B emit `SCAN_STARTED` only **after** `createKycSession`
resolves (`useKycLauncher.ts:157`, `LogoConfirmationScreen.tsx:96`). A
session-creation failure therefore emits `SESSION_REQUESTED` and no
`SCAN_STARTED`, and Path B reports that failure from the `pre_start`
stage (`scanStarted` is still `false` at
`LogoConfirmationScreen.tsx:170`).

**Decision: `SCAN_STARTED` marks the user committing to the KYC scan, not
the session succeeding.** It moves ahead of `SESSION_REQUESTED`, before
the `await`. Accepted consequences:

- A failed `createKycSession` now emits `SCAN_STARTED` where it did not
  before. Per-path `SCAN_STARTED` counts rise by the session-failure
  rate. This is the intended reading, and it matches Path C, which
  already emits `SCAN_STARTED` before its own `createKycSession` await.
- `SESSION_REQUESTED` counts **rise** too, on exactly the inputs this
  fix targets. `trackBranchEvent` no-ops when `currentAttempt` is null,
  so today a Path A/B entry with no bootstrapped attempt drops its
  `SESSION_REQUESTED` silently. After the reorder, `SCAN_STARTED`
  bootstraps the attempt first and the branch event lands. Recovering
  those drops **is** the fix — do not treat the count delta as a
  regression.
- Path B's `pre_start` failure stage becomes unreachable for this branch;
  every KYC failure after the modal fails from `scan_started`. Collapse
  the `scanStarted` flag rather than leaving dead branches — its only
  remaining reader is the `pre_start` / `kyc_session_error` pair at
  `:170-172`, which becomes `scan_started` / `kyc_session_error`.
- Path C's `catch` calls no `failOnboardingAttempt` at all
  (`selfClientProvider.tsx:492-516`), so it already leaks an
  unterminated attempt after `SCAN_STARTED`. Fixing that is in scope for
  the consolidation — the helper's callers must all terminate the
  attempt they start.

Do not re-scope this to "reorder without changing counts." The counts are
already inconsistent between paths; the point of the invariant is that
`SCAN_STARTED` bootstraps the attempt, and an attempt that fails during
session creation is a real funnel drop that Paths A and B currently drop
silently.

## Files modified

- `packages/mobile-sdk-alpha/src/analytics/` — new helper that emits
  `SCAN_STARTED` then the KYC branch event in one call. Place it beside
  the existing funnel helpers; it must not add a new mutation surface
  beyond what `trackOnboardingStep` / `trackBranchEvent` already expose.
- `app/src/hooks/useKycLauncher.ts` — replace the hand-ordered pair.
- `app/src/screens/documents/selection/LogoConfirmationScreen.tsx` — same.
- `app/src/providers/selfClientProvider.tsx` — same; this site is already
  correct, so this is a de-duplication, not a fix. Keep the explanatory
  comment at `:377` or move it onto the helper.

## Validation

```bash
pnpm --filter @selfxyz/mobile-sdk-alpha test && pnpm --filter @selfxyz/mobile-sdk-alpha types
pnpm --filter @selfxyz/mobile-app test
```

Ordering assertions for Paths A and B, mirroring the Path C test in
`app/tests/src/providers/selfClientProvider.test.tsx`.

## Acceptance criteria

- All three KYC emission paths assert the SCAN_STARTED-before-branch-event
  invariant by test, not by reading order.
- One shared helper replaces the three duplicated sequences. A future
  fourth KYC path cannot emit them out of order without bypassing it.
- No change to event **names or payloads**. Counts are unchanged for
  successful attempts that already had a bootstrapped funnel attempt.
  They change on exactly two inputs, both intended and both asserted by
  test per **Failure semantics** above: (a) a rejected
  `createKycSession` now emits `SCAN_STARTED` plus a `scan_started`-stage
  failure on Paths A, B, and C; (b) an entry with no prior attempt now
  emits `SESSION_REQUESTED` instead of dropping it.
- Every path that emits `SCAN_STARTED` terminates its attempt on all exit
  routes — success, cancel, provider failure, and thrown exception. No
  path starts an attempt it can leave open.
