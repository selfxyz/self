# Proof Request workstream

> Scope: Self Wallet (React Native, `app/`) proof-request surfaces — the
> "Proof Requested" screen, the ID selector bottom sheet, and the surrounding
> disclose flow. WebView (`packages/webview-app/`) and Euclid live in
> `specs/projects/sdk/workstreams/webview/` and are not tracked here.

## Why this workstream exists

Proof-request UX is iterating quickly on the RN app ahead of WebView parity
(Google Readiness, Perks, KYC flows). Per repo convention, app-only work
historically lived in Linear with inline scope and no repo spec. As the
proof-request surface area grows, work that touches multiple screens or
involves analytics contracts is heavy enough to benefit from a versioned
plan. Specs land here when:

- the change spans ≥2 RN screens or shared `app/src/components/` primitives,
- it introduces or modifies `KnownEventName` entries, or
- it pairs with a sibling spec in `specs/projects/sdk/workstreams/webview/`.

Single-screen tweaks and one-shot fixes still belong in a Linear issue only.

> **CLAUDE.md carve-out (TBD).** Today CLAUDE.md says: *"For app-only or
> non-SDK work, a Linear issue with inline scope is sufficient — no repo
> spec required."* The criteria above are an explicit carve-out from that
> rule. Until CLAUDE.md is amended to mention `specs/projects/app/`, treat
> this workstream as a deliberate exception, not the new default.

## Backlog

| ID        | Title                                                                | Status      | Priority | Depends on | Plan                                                                                                                | Notes                                                                                                              |
| --------- | -------------------------------------------------------------------- | ----------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| SELF-2855 | Proof Request + ID Picker — eligibility per ID for active perk       | In Progress | High     | SELF-2862  | [plans/SELF-2855-proof-request-id-picker-eligibility.md](./plans/SELF-2855-proof-request-id-picker-eligibility.md) | Per-ID eligibility row + dimmed ineligible rows. RN only; Euclid mirror is a separate WV-EUCLID-TODO entry later. |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`
