# Nav-Hygiene · Decisions Log

Authoritative record of every open-question decision for the workstream. Generated from the in-page exporter on 2026-05-25 and committed to the repo so answers survive any browser-local storage reset.

The interactive widget in [SPEC.html](./SPEC.html#open-questions) and each plan page is the _editing surface_ — this file is the _durable source of truth_. If the two ever disagree, update both.

22 of 22 answered.

---

## NAV-02 · Dev route namespace

### nav-02-q1-dialogue-move — _custom decision_

**Question:** Should the three `/proving/dialogue*` routes move to `/dev/*` or stay at `/proving/*` as component-showcase routes?

**Decision:** Neither — discard these screens for now.

The dialogue screens are clunky, unused by any production flow (only reachable via DevRouteMenu), and not worth namespace surgery. Delete them in NAV-02. Capture the "rework dialogue screens before re-introducing them" follow-up in the SDK future backlog.

### nav-02-q2-tunnel-kyc-pending

**Decision:** Keep at `/tunnel/kyc-pending` until NAV-08.

**User note:** "I don't really understand your question, the `/dev/` seems to not be used anywhere else in the docs. so why should we have this stuff only for that screen which is actually not only for devs. there has to be a misunderstanding somewhere."

**Reconciliation:** NAV-02 _creates_ the `/dev/*` namespace (that's the entire point of NAV-02). Today every dev-only route lives somewhere else with a `import.meta.env.DEV &&` gate. The framing of the question implied `/dev/*` already existed elsewhere — it doesn't yet. With the decision above (keep `/tunnel/kyc-pending` where it is), NAV-08 will sweep it along when it renames `/tunnel/*` → `/disclose/*`, so the screen never enters the `/dev/*` namespace at all. NAV-02's plan must clarify this when it lands.

---

## NAV-03 · Boot decision consolidation

### nav-03-q1-return-vs-navigate

**Decision:** Pure function returning `BootAction = wait | navigate{to,replace} | fail-closed{error} | noop`.

### nav-03-q2-where-to-place

**Decision:** Rename `ModeBoot` → `BootDecision`.

### nav-03-q3-fail-closed-page

**Decision:** Navigate to `/embed/error` _before_ `setResult` + `dismiss`.

**User note:** "Can you add somewhere in a new section that I'll let you name idea is like 'action to take now' or smth else. but we need to know that we need to communicate with the team that. and in there write the specs of that new screen."

**Action item:** This decision creates a _new_ Euclid screen requirement. See [NAV-03 plan → Action Items](./plans/NAV-03-boot-decision.html#action-items) for the screen spec + team-communication checklist.

---

## NAV-04 · Cluster close

### nav-04-q1-cluster-detection

**Decision:** (a) Infer cluster from `useLocation().pathname`'s first segment.

**User note:** "I picked A, but can you investigate what the state of the art is? wouldnt that be possible to do A and to make sure in the tests or somewhere that none of the screens are going to be reachable through 2 paths?"

**Follow-up baked into the plan:**

1. Brief state-of-the-art review (react-router-dom v6 patterns, Next-app-router segment APIs) added to NAV-04's Approach.
2. Add a unit test that enumerates every registered route, asserts each screen component appears as the `element` of at most one `<Route>`, and asserts the path's first segment uniquely maps to one cluster. Failing test = invariant broken.

### nav-04-q2-default-close-target

**Decision:** Per-cluster entry point in the registry (no longer always `navigate('/')`).

### nav-04-q3-overrides

**Decision:** Hook respects `state.returnTo` (will become `state.nextPath` after NAV-09).

---

## NAV-05 · Back vs close labels

### nav-05-q1-handler-names

**Decision:** Standardize names AND semantics. Canonical set: `handleClose` / `handleBack` / `handleRetry` / `handleContinue`.

### nav-05-q2-eslint-rule

**Decision:** Ship a custom ESLint rule (in addition to AGENTS.md docs). Lives at `packages/webview-app/eslint-rules/`.

---

## NAV-06 · NFC error consolidation

### nav-06-q1-split-vs-param

**Decision:** Split: EU-ID gets its own `/onboarding/eu-id/nfc-error` route. File a follow-up Euclid ticket for an `EuIdNfcErrorScreen` component.

---

## NAV-07 · `replace: true` audit

### nav-07-q1-eslint-rule

**Decision:** Document in AGENTS.md; fix the 5 known violations. (No custom ESLint rule for this one — too heuristic to enforce mechanically.)

### nav-07-q2-audit-scope

**Decision:** Full sweep of all 150 default-replace calls (not just the 5 known violations).

**Note:** This is a deliberate upgrade over the "Recommended" option. The plan must expand its scope estimate from ~30 min to ~2–3 hours and budget for ~5–10 additional fixes surfaced by the sweep.

---

## NAV-08 · Namespace rewrite

### nav-08-q1-tunnel-paths

**Decision:** Drop the prefix entirely. Paths describe operations only. Mode-coupling is enforced by NAV-13's `<ModeRoute>` wrapper, not by URL prefix.

### nav-08-q2-backcompat

**Decision:** Hard cut. Document the breaking change. No transitional redirect map.

**Plan addition:** Coordinate with host integrators (anyone shipping a SelfApp deeplink config) before the release ships.

---

## NAV-09 · Nav-state slots

### nav-09-q1-canonical-names

**Decision:** Single canonical name: `nextPath`. Rename `returnTo` → `nextPath` in the recovery files.

### nav-09-q2-url-returnto

**Decision:** Migrate to state-only. Drop the URL `?returnTo=` survival path.

---

## NAV-10 · Delete tunnel-registration

### nav-10-q1-delete-vs-move

**Decision:** Delete entirely. Remove App.tsx routes + screen files + DevRouteMenu entries.

---

## NAV-11 · Social sign-on (deferred)

No questions — workstream-level decision recorded in [SPEC.html](./SPEC.html) backlog row: deferred for v1 until WV-12 lands the Euclid screens.

---

## NAV-12 · Tunnel → embed rename

### nav-12-q1-mode-literal

**Decision:** Rename the literal to `'self-app' | 'embed'` (full rename). Matches all docs.

### nav-12-q2-folder-rename

**Decision:** Rename everything in one PR — folder + file/class names + import sites.

---

## NAV-13 · Mode-route wrapper

### nav-13-q1-wrapper-shape

**Decision:** `<ModeRoute mode='…' path='…' element={<Screen/>} />`.

### nav-13-q2-mismatch-behavior

**Decision:** Mode-aware behavior — self-app users land on `/` (redirect home); embed users get `lifecycle.setResult({success:false, errorCode:'route_not_allowed'})` + `lifecycle.dismiss()`.
