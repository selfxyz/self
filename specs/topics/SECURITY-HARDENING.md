# SDK Security Hardening — Follow-up Spec

> Last updated: 2026-03-01
> Source: Bot review feedback on PR #1785 (kmp-wrap-up-evi-handoff-work)
> Status: Ready for handoff (follow-ups tracked)

## Ownership Migration

This topic file is now context-only. Actionable work should be tracked in owning workstream backlogs and PR plan files:

- `native-shells/SPEC.md` for KMP-native follow-ups
- `rn-sdk/SPEC.md` for RN-native follow-ups
- `sdk-core/SPEC.md` for crypto-surface follow-ups

Do not treat this topic file as the only tracker for open work.

## Workstream Mapping

| Topic Item                                                   | Owning Backlog / Workstream                         |
| ------------------------------------------------------------ | --------------------------------------------------- |
| APDU command allowlisting (KMP)                              | `NS-04` in `native-shells/SPEC.md` — Done           |
| APDU command allowlisting + timeout + payload hardening (RN) | `RN-03` in `rn-sdk/SPEC.md` — PR #1797              |
| LifecycleBridgeHandler type+error handling                   | `NS-05` in `native-shells/SPEC.md` — Done           |
| Person 4 crypto tracking                                     | `SC-02` and follow-up backlog in `sdk-core/SPEC.md` |

Items without a linked backlog ID yet should be re-homed before any new work starts. Do not update this file as the primary status tracker.

## Context

PR #1785 wraps up the KMP/EVI handoff work. Automated reviewers flagged several security hardening items. Quick fixes were addressed in the PR's feedback commits. Remaining items have been re-homed to owning workstream backlogs (see mapping above).

For implementation details, validation commands, and status tracking, consult the linked backlog items in their owning SPECs — not this file.
