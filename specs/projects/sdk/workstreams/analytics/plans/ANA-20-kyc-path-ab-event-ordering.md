# ANA-20 — KYC Path A / Path B event-ordering audit

> Linear: TBD
> Workstream: [Onboarding Analytics & Funnel](../SPEC.md)
> Depends on: ANA-12 (defines the SCAN_STARTED-before-branch-event invariant)
> Status: Ready
> Priority: Medium
> PR target: <300 LOC.

## Context

Re-homed from the archived RN upgrade follow-up doc
(`specs/archive/rn-upgrade/RN-UPGRADE-FOLLOWUPS.md`, item 2), which
identified this while reviewing the RN 0.83 upgrade PR but had no
workstream to file it under. It is analytics work, not RN work.

ANA-12 establishes the invariant: `SCAN_STARTED` must fire **before** any
KYC branch event, so the funnel attempt is bootstrapped before a branch
event tries to attach to it. Path C was fixed in
`app/src/providers/selfClientProvider.tsx`, where the ordering is now
explicit and carries a comment at `:377`.

**Paths A and B still have the original bug — verified 2026-08-09:**

| Path | Site                                                                                | `SESSION_REQUESTED` | `SCAN_STARTED` |
| ---- | ----------------------------------------------------------------------------------- | ------------------- | -------------- |
| A    | `app/src/hooks/useKycLauncher.ts` (biometric fallback)                              | `:150`              | `:157`         |
| B    | `app/src/screens/documents/selection/LogoConfirmationScreen.tsx` ("no chip" branch) | `:83`               | `:96`          |

In both, the branch event is emitted first. These usually "work" only
because earlier MRZ/NFC `trackOnboardingStep` calls have already
bootstrapped the funnel attempt — the ordering is incidental, not
guaranteed, and it contradicts the invariant Path C now enforces.

## Decision

Reorder both sites so `SCAN_STARTED` precedes `SESSION_REQUESTED`, and
consolidate all three KYC emission sites onto one shared helper. ANA-12
flags this consolidation as a follow-up; this is the spec that does it.

Consolidate rather than reorder-in-place. Three hand-ordered copies of
the same two-event sequence is what produced a bug in two of three
copies; a helper makes the ordering unrepresentable-wrong. Do not leave
the reorder as the whole fix.

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
- No change to event names, payloads, or counts — this is ordering and
  de-duplication only. A funnel step count before and after must match.
