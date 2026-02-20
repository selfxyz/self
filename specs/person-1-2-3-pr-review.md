# Plan: Person 1-2-3 PR Review + Handoff

## Branch

- `feat/person1-2-3-implementation`

## Goal

- Freeze implementation on this branch.
- Produce an accurate merge handoff by reconciling spec status vs actual code.
- Update planning/checklist docs to reflect reality and isolate follow-up work.
- Capture already-established cross-workstream findings so handoff output is actionable, not only procedural.

## Scope

- Review-only against current branch changes.
- No implementation code changes.
- No commits or pushes.

## Procedure vs Findings

- This document is both:
- A procedural checklist for the review pass.
- A findings-aware plan that must carry forward known cross-workstream issues into output artifacts.
- If any known finding below cannot be validated during audit, mark it `Unknown (carry forward)` with explicit rationale.

## Package Inventory Created In This PR

- `@selfxyz/webview-bridge`
- `@selfxyz/webview-app`
- `@selfxyz/self-sdk-swift`
- `@selfxyz/rn-sdk`
- `@selfxyz/kmp-minipay-sample`

## Known Findings Snapshot (As Of 2026-02-19)

- Duplicate web fallback adapters exist in both `webview-bridge/src/adapters/` and `packages/mobile-sdk-alpha/src/adapters/browser/` for IndexedDB docs, Web Crypto, console analytics, and no-op haptic; `SelfClientProvider` currently imports from `webview-bridge`. A follow-up consolidation/ownership decision is required.
- Person 1 wiring gap: haptic is bridged to native instead of no-op fallback, and crypto adapter behavior is hybrid. This is a correctness follow-up item, not just cleanup.
- iOS handler scope expanded beyond original plan (9 handlers shipped vs 3 originally planned), including documents, crypto, analytics, and haptic; Android currently uses web fallbacks for these areas. Platform asymmetry requires an explicit product/architecture decision.
- `specs/WAVE-PLAN.md` status counts are stale: current summary text (for example, "11 done / 13 pending") does not match implementation progress; audit should update to a code-evidenced count (currently believed closer to ~23 done / ~4 remaining).
- RN SDK highest-risk carry-forward items are the NFC deviation (metadata vs raw APDU path) and camera/MRZ stub (`NOT_IMPLEMENTED`); these should be prioritized in follow-up sequencing.

## Inputs to Audit

- `specs/WAVE-PLAN.md`
- `specs/person1-webview/OVERVIEW.md`
- `specs/person1-webview/SPEC.md`
- `specs/person2-native-shells/OVERVIEW.md`
- `specs/person2-native-shells/SPEC.md`
- `specs/person3-integrations/OVERVIEW.md`
- `specs/person3-integrations/SPEC-MINIPAY-SAMPLE.md`
- `specs/person4-sdk-core/OVERVIEW.md`
- `specs/person4-sdk-core/SPEC.md`
- `specs/person5-rn-sdk/OVERVIEW.md`
- `specs/person5-rn-sdk/SPEC.md`
- `packages/rn-sdk/HANDOFF.md`
- `git diff --stat origin/main..HEAD`

## Audit Method

1. Build chunk inventory from each spec and overview.
2. Reconcile `packages/rn-sdk/HANDOFF.md` claims against current branch changes.
3. For RN SDK, validate each item in:

- `What Is Implemented`
- `Known Limitations`
- `Spec Deviation`
- `Deferred Decision`
  and map each to one of the status rubric labels with code evidence.

4. Verify changed files from `origin/main..HEAD` for each claimed chunk.
5. Spot-check representative code paths per chunk (not just filenames).
6. Classify each chunk with one of:

- `Done (code present)`
- `Partial (code present, validation/integration pending)`
- `Pending (not implemented)`
- `Superseded/Descoped (stale item)`
- `Unknown (carry forward)`

7. Prefer carry-forward when evidence is ambiguous.
8. Ensure Known Findings Snapshot items are either:

- Confirmed with evidence and reflected in outputs, or
- Explicitly marked carry-forward with owner + next PR target.

## Output Artifacts

1. Create `specs/HANDOFF.md` with:

- What This PR Delivers
- Remaining Work (Follow-Up PRs)
- Person 1 to Person 5 sections
- RN SDK reconciliation subsection sourced from `packages/rn-sdk/HANDOFF.md` (implemented, deviations, deferred decisions, limitations)
- Cross-workstream findings subsection covering:
- Duplicate fallback adapters decision
- Person 1 crypto/haptic wiring correction
- iOS vs Android handler asymmetry decision
- Stale/Descoped Items
- Suggested Follow-Up PR Order

2. Update checklist accuracy in:

- `specs/person1-webview/OVERVIEW.md`
- `specs/person2-native-shells/OVERVIEW.md`
- `specs/person3-integrations/OVERVIEW.md`
- `specs/person4-sdk-core/OVERVIEW.md`
- `specs/person5-rn-sdk/OVERVIEW.md`

3. Update cross-workstream status in:

- `specs/WAVE-PLAN.md`
- Replace stale aggregate counts with audit-verified totals and date-stamped note.

## Status Rubric (Important)

- `Done` requires implementation evidence in this branch.
- `Partial` when implementation exists but spec-required runtime validation is not confirmed.
- `Pending` when no implementation evidence exists.
- `Superseded/Descoped` when work item was replaced by later spec direction.
- `Unknown` defaults to carry-forward in `HANDOFF.md`.

## Editing Rules

- Documentation-only edits.
- Do not alter production/test implementation files.
- Preserve historical context, but mark stale statements explicitly.
- Prefer explicit dates and branch name in handoff text.

## Review Checklist Before Finalizing Docs

- Every changed chunk has a classification.
- `packages/rn-sdk/HANDOFF.md` has been reviewed and reconciled with `specs/HANDOFF.md`.
- Every RN SDK handoff claim is either confirmed with evidence or explicitly marked carry-forward.
- Duplicate fallback adapters are explicitly addressed (decision made or carry-forward item created).
- Person 1 crypto/haptic wiring gap is explicitly addressed (fixed status or carry-forward item created).
- iOS handler asymmetry is explicitly addressed (decision made or carry-forward item created).
- `specs/WAVE-PLAN.md` totals are updated to match audit evidence (with explicit date).
- Every stale checklist item is either removed, struck through, or annotated.
- `HANDOFF.md` includes concrete follow-up items, not generic placeholders.
- Follow-up PR order reflects dependency chain, not calendar preference.

## Suggested Follow-Up PR Ordering Logic

1. Close correctness gaps that impact runtime integration first.
2. Then complete validation/device coverage.
3. Then cleanup/spec debt and optional improvements.
