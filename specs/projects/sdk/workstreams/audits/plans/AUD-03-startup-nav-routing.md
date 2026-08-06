# AUD-03 — Startup & navigation routing audit

> Linear: [SELF-3182](https://linear.app/selfprotocol/issue/SELF-3182) — created 2026-06-11, unassigned
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Planned (pre-drafted ahead of AUD-02 completion; requires recon refresh + owner re-review at activation) — awaiting workstream owner
> Priority: High
> Depends on: AUD-02 (informational — `hasSecretStored`/keychain-error behavior is shared; fold AUD-02's Q3.3 finding into Q1 at refresh)
> Time box: 3 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests only. Target <800 LOC of test code.

## Context

You are auditing how the app decides **where to send the user at launch** and how it routes deep
links, KYC resume, and recovery prompts on top of that decision. This is the code-level routing
state machine — `getStartupNavigationTarget`, `SplashScreen`'s init sequence, the deep-link
handler, and the two startup hooks (`useRecoveryPrompts`, `usePendingKycRecovery`) — not the
onboarding UX.

**Scope decision (owner, 2026-06-11): the onboarding _experience_ (screens, copy, step flow) is
descoped.** Self is rebuilding onboarding for Euclid 3.0, so auditing onboarding-screen UX would
audit code about to be replaced. This audit therefore covers only the routing/navigation
**mechanism** — the parts that survive an onboarding rewrite because they sit below it: the startup
decision function, the splash init/settle/timeout race, deep-link parsing and stack construction,
and resume-on-launch. Onboarding-screen internals, copy, and step ordering are out.

Reconnaissance (2026-06-11) read every file in the inventory at the cited lines and produced the
suspected-issue list embedded in the question list. Treat every "suspected" item as unverified:
confirm or refute each with a trace or a reproduction, per the workstream's evidence standard.

## Scope

### In scope (the complete file inventory)

| Area                                     | Files                                                                                                                                                                                                                                                                                                          | LOC        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Startup routing decision                 | `app/src/screens/app/startupRouting.ts`                                                                                                                                                                                                                                                                        | 61         |
| Splash init / settle / timeout           | `app/src/screens/app/SplashScreen.tsx`                                                                                                                                                                                                                                                                         | 270        |
| Deep-link handler + stack builder        | `app/src/navigation/deeplinks.ts`                                                                                                                                                                                                                                                                              | 451        |
| Root navigator + listeners               | `app/src/navigation/index.tsx`                                                                                                                                                                                                                                                                                 | 116        |
| KYC resume-on-launch                     | `app/src/hooks/usePendingKycRecovery.ts`                                                                                                                                                                                                                                                                       | 153        |
| Recovery-prompt scheduler                | `app/src/hooks/useRecoveryPrompts.ts`                                                                                                                                                                                                                                                                          | 168        |
| Dev-screen registration (prod-reachable) | `app/src/navigation/devTools.tsx`                                                                                                                                                                                                                                                                              | 117        |
| WIA / dev flags                          | `app/src/utils/devUtils.ts` (`IS_WIA_ENABLED` line 24, `IS_DEV_MODE`)                                                                                                                                                                                                                                          | trace only |
| Routing inputs (boundary, trace only)    | `app/src/providers/authProvider.tsx` (`hasSecretStored`), `app/src/providers/passportDataProvider.tsx` (`hasAnyValidRegisteredDocument`, the migration calls), `app/src/stores/settingStore.ts` (privacy-note/backup/recovery flags), `app/src/stores/pendingKycStore.ts`, `app/src/consts/recoveryPrompts.ts` | trace only |
| Existing tests                           | `app/tests/src/screens/app/startupRouting.test.ts` (97, 5 cases), `app/tests/src/navigation/deeplinks.test.ts` (811), `app/tests/src/hooks/useRecoveryPrompts.test.ts` (330), `app/tests/src/hooks/usePendingKycRecovery.test.ts` (276), `app/tests/src/navigation.test.tsx` (141)                             | —          |

### Out of scope

- **Onboarding-screen UX** — every screen under `app/src/screens/onboarding/` and the
  `onboarding.ts` navigator's screen internals/copy/order. Euclid 3.0 replaces these. You may
  reference an onboarding route **name** as a routing target, but do not audit the screen.
- The keychain/secret internals behind `hasSecretStored` — AUD-02 owns those. You consume the
  boolean and AUD-02's finding about its error-swallowing (AUD-02 Q3.3); you do not re-audit the
  keychain.
- Document storage/migration internals (`passportDataProvider` catalog, dedup, registration-state
  computation) are outside this routing audit. You trace that `hasAnyValidRegisteredDocument`,
  `checkIfAnyDocumentsNeedMigration`, and `migrateFromLegacyStorage` are _called_ in a particular
  order and stop at the function boundary; storage correctness findings route to the owning
  workstream or a follow-up AUD row, not AUD-01.
- The WebView bridge protocol belongs to AUD-05, and the WebView app / WIA host surface belongs to
  AUD-09. You trace that `IS_WIA_ENABLED` rewrites the startup target to `WebViewHost` and stop.
- Google USAT gate **policy** — you trace its two cold-launch nav side-effects in `handleUrl`
  (`deeplinks.ts:198-207`, `:238-245`); the gate's eligibility rules are AUD-08/product.
- KYC websocket protocol/TEE caching — `usePendingKycRecovery` calls `useKycWebSocket`; you trace
  the resume _navigation_, not the socket.
- Fixing anything. The workstream invariant is read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — The startup decision function (`getStartupNavigationTarget`, `startupRouting.ts:19-49`)

1. **Q1.1 (suspected Major).** When `hasSecretStored` is `false` but the user actually has a
   secret (transient keychain error — AUD-02 Q3.3 establishes this is reachable because
   `hasSecretStored` swallows all errors to `false`), and they have **no** registered document and
   **no** recovery signal and the privacy note was already dismissed, the function returns `Home`
   (`startupRouting.ts:45-48`) as if onboarded. Trace what `Home` does for a user whose secret is
   actually present but unreadable this launch: does any screen reachable from `Home` trigger
   secret creation (AUD-02 Q1.2 overwrite)? Enumerate the full truth table of the four boolean
   inputs (16 rows) and mark each row's target, flagging any row where a real returning user lands
   somewhere destructive or wrong.
2. **Q1.2.** `hasStartupRecoverySignal` (`startupRouting.ts:51-61`) ORs three settings:
   `cloudBackupEnabled`, `hasViewedRecoveryPhrase`, `pointsAddress !== null`. Confirm these
   settings persist independently of the secret (settingStore vs keychain) — i.e., can a user with
   a wiped keychain but surviving settings get routed to `AccountRecoveryChoice` correctly, and
   can the inverse (settings lost, secret present) misroute?
3. **Q1.3.** The function is pure and unit-tested (`startupRouting.test.ts`, 5 cases). Confirm the
   5 cases against the 16-row truth table from Q1.1 and record which rows are uncovered (feeds
   Q6 and AUD-04).

### Q2 — Splash init sequence: settle race, timeout, and migration ordering

1. **Q2.1 (suspected Major).** `SplashScreen` has three competing settle paths, all guarded by
   `settledRef` (`SplashScreen.tsx:143-144`, `:164-165`, `:184-186`): the happy path, the catch
   block, and a 30s `INIT_TIMEOUT_MS` timer. Trace the interleavings: if init throws _after_
   `settledRef` is set (e.g., `migrateToSecureKeychain` rejects at `:135-141` — but note that
   call is wrapped in its own try/catch, so it can't reject the outer flow), or if the timeout
   fires while `loadDataAndDetermineNextScreen` is between `await`s. Establish whether any
   interleaving can navigate twice, navigate to a stale `nextScreen`, or never navigate. Document
   the actual guarantee `settledRef` provides.
2. **Q2.2 (suspected Medium).** Navigation only happens once `isAnimationFinished` is also true
   (`SplashScreen.tsx:227-241`); the animation has its own independent 5s fallback timer
   (`:209-220`). Trace the two-variable handoff (`nextScreen`/`queuedDeepLink` × animation done):
   can a fast init + slow/never-firing animation strand the user on Splash beyond the 5s fallback?
   Can a queued deep link be set but never handled if `isAnimationFinished` flips in a particular
   order?
3. **Q2.3 (suspected Major).** Startup runs security-relevant migrations in sequence inside the
   init flow: `migrateFromLegacyStorage` (`:89`), `checkAndUpdateRegistrationStates` (`:108`,
   conditional), and `migrateToSecureKeychain` (`:135`, in inner try/catch that only `console.warn`s
   on failure). Trace the ordering relative to the `getStartupNavigationTarget` call (`:122`):
   the routing decision is computed _before_ keychain migration runs (`:122` vs `:135`). Does the
   target ever go stale because migration changes `hasSecretStored` after the decision is frozen?
   What is the user impact of `migrateToSecureKeychain` failing silently here (cross-reference
   AUD-02 Q2.2 on the re-run-every-launch behavior)?
4. **Q2.4.** On the catch and timeout fallbacks (`:171-180`, `:191-200`), the screen routes to
   `Home`/`Disclaimer` purely on `hasPrivacyNoteBeenDismissed`, ignoring registered-document and
   recovery signals. Confirm a returning, registered user who hits a 30s startup timeout (slow
   device, large catalog) is routed to `Home` correctly — or stranded/misrouted.

### Q3 — Deep-link handling (`deeplinks.ts`)

1. **Q3.1 (suspected Major).** Cold-launch vs warm-launch routing diverges in `safeNavigate`
   (`deeplinks.ts:330-350`): cold launch (`currentRoute === 'Splash'`) does `navigationRef.reset`,
   warm does `navigate`. The `correctParentScreen` module global (`:165`, set by Splash at
   `:146`) is the back-stack parent. Trace the race: a deep link arriving (`Linking` 'url' event,
   `:428`) before Splash has called `setDeeplinkParentScreen` uses the default `'Home'` parent.
   Establish whether a cold-launch deep link can be processed before the startup target is
   computed, producing a wrong back stack or bypassing recovery/disclaimer routing entirely.
2. **Q3.2 (suspected Major).** `getAndClearQueuedUrl` vs `peekQueuedUrl` (`:148-150`): when the
   startup target disallows queued deep links (`allowQueuedDeepLink: false` for recovery/
   disclaimer targets, `startupRouting.ts`), Splash _peeks_ but never clears
   (`SplashScreen.tsx:148-150`). Trace what happens to that queued URL: is it ever consumed, or
   does it leak into the next `handleUrl` / next launch? Confirm whether a deep link can be
   silently dropped for a user who launches into recovery.
3. **Q3.3 (suspected Medium).** Parameter validation (`VALIDATION_PATTERNS`, `:74-84`;
   `validateAndSanitizeParam`, `:113-143`) is allowlist-based and `selfApp`/`mock_passport` accept
   any character (`/^[\s\S]*$/`) then `JSON.parse`. Trace the failure handling: malformed
   `selfApp` JSON routes to `QRCodeTrouble` (`:223-225`) before the gate runs; valid JSON then
   calls `evaluateGoogleUsatGate` (`:187-207`) before `setSelfApp` / listener startup (`:209-210`).
   Confirm no half-applied state (selfApp set, listener started) survives a parse/gate failure.
   Check fragment-param merging (`:362-376`) for
   override/injection of query params by a `#`-fragment.
4. **Q3.4.** `mock_passport` deep link (`:260-297`) routes to `MockDataDeepLink`, a **dev screen**
   registered unconditionally in production (`navigation/index.tsx:45` "allow in production for
   testing"; `devTools.tsx:46`). Confirm a crafted deep link reaches a mock-data injection screen
   in a release build, and document what that screen can do (cross-reference Q5).
5. **Q3.5.** Commented-out OAuth-callback short-circuit logic (`:416-441`) is dead but shipped.
   Confirm it's inert and record for AUD-06; verify the live `code || id_token` branch
   (`:310-317`) genuinely no-ops (Turnkey is disabled per AUD-02 context).

### Q4 — Startup hooks mounted on the navigator (`navigation/index.tsx:86-87`)

1. **Q4.1 (suspected Major).** `usePendingKycRecovery` polls `navigationRef.isReady()` every 100ms
   via `setInterval` (`usePendingKycRecovery.ts:110-122`) until ready, then navigates to
   `KYCVerified`. Trace teardown: the interval is cleared on unmount/dep-change (`:125-127`), but
   the effect re-runs on every `pendingVerifications` change. Establish whether overlapping
   intervals or a navigate-after-unmount can occur, and whether `KYCVerified` navigation can race
   the Splash→Home/Disclaimer navigation (both fire on launch).
2. **Q4.2 (suspected Medium).** `useRecoveryPrompts` shows a modal on a route+count heuristic
   (`useRecoveryPrompts.ts:97-114`) gated to `RECOVERY_PROMPT_ALLOWED_ROUTES`. It double-checks
   route eligibility before and after the async `getAllDocuments` (`:80`, `:107-110`). Trace
   whether the modal can still appear on a wrong/transient route (e.g., during the Splash→Home
   reset, or mid-deep-link-navigation) given the `navigationRef.addListener('state', ...)` fire
   site (`:154-157`).
3. **Q4.3.** Both hooks read state asynchronously at launch (`getAllDocuments`, store reads) and
   navigate imperatively via `navigationRef` outside the React tree. Confirm neither can fire
   before `navigationRef.isReady()`, and document the ordering contract between these two hooks,
   Splash's navigate, and deep-link `safeNavigate` — four imperative navigators racing at launch.

### Q5 — Dev-screen production reachability (`devTools.tsx`, registered at `index.tsx:45`)

1. **Q5.1 (suspected Medium).** `navigationScreens` spreads `devScreens` unconditionally with the
   comment "allow in production for testing" (`index.tsx:45`). Enumerate which dev screens are
   reachable by navigation in a release build and which expose security-relevant surfaces:
   `DevPrivateKey` (`devTools.tsx:81`, key display — cross-reference AUD-02 Q7.1),
   `MockDataDeepLink`/`CreateMock` (mock document injection, reachable via deep link per Q3.4),
   `DevDangerZone`. The report must force an owner decision: accepted testing posture, or a gap.
2. **Q5.2.** Determine whether any dev screen is reachable _without_ a dev-only entry point — i.e.,
   via deep link (Q3.4), gesture (AUD-01 found a 5-tap gesture; check for analogues here), or a
   production-visible menu — versus only via `DevSettings` which itself may be gated.

### Q6 — Existing-coverage characterization

1. **Q6.1.** For the five existing test files, record what each actually asserts versus mock
   wiring, and map every Q1–Q5 question to `covered / partially covered / uncovered`. Note
   specifically: there is **no `SplashScreen` test** (recon confirmed), so the Q2 settle/timeout
   race is entirely uncovered. This table anchors the report's test-gap acceptance criteria and
   feeds AUD-04.

## Method

1. Work the questions in order Q1 → Q2 → Q3 → Q4 → Q5 → Q6 (highest candidate severity first, so
   the time box truncates the tail, not the head).
2. For each question: trace the full call path with `path:line` citations, then classify per the
   workstream severity rubric. Suspected severities above are priors, not conclusions.
3. Reproduce every confirmed Critical/Major as a characterization test pinning **current**
   behavior. `getStartupNavigationTarget` and `hasStartupRecoverySignal` are pure — extend
   `app/tests/src/screens/app/startupRouting.test.ts` with the full truth table (Q1.1). For the
   Splash settle/timeout race (Q2), add `app/tests/src/screens/app/SplashScreen.test.tsx` (new
   file) using fake timers and mocked providers; if a race can only be characterized by trace
   (real navigation timing), document it as a trace with a named manual-repro and move the test
   target to `Needs investigation`. Deep-link cases extend
   `app/tests/src/navigation/deeplinks.test.ts`.
4. Jest constraints (hard requirements, they prevent CI OOM): no nested
   `require('react-native')` or `require('react')` inside `jest.mock` factories — use hoisted
   imports and the existing `Mock*` aliases; keep tests under `app/tests/` so
   `app/scripts/check-test-requires.cjs` covers them; reuse the existing navigation mock
   (`app/tests/__setup__/mocks/navigation.js`) rather than ad-hoc factories.
5. Imperative-navigation races (Q2.1, Q3.1, Q4.1, Q4.3) that cannot be deterministically
   reproduced in jest go to `Needs investigation` with a named manual-test procedure (cold vs warm
   launch, deep link timing, device speed), not a guess.
6. A confirmed Critical security finding (e.g., Q5 turning out to expose a key/mock-injection
   surface trivially in release) triggers the workstream fast-path immediately: confidential
   Linear issue with full detail the same day; the report carries a redacted reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-startup-nav-routing-audit.md` with the
   workstream's required sections: header block (noting the Euclid-3.0 onboarding-UX descope),
   summary, severity-bucketed findings with per-finding acceptance criteria, `Needs investigation`
   leads with dispositions, follow-up issues grouped into PR-sized buckets (the `/gaps-to-issues`
   input), adversarial verification log, what works well, validation.
2. **Characterization tests** — merged in the audit PR, one per confirmed Critical/Major finding
   that is jest-testable; named manual-test procedures for race-only findings.
3. **Startup truth table** (Q1.1, 16 rows) — included in the report.
4. **Coverage map** (Q6.1 table) — included in the report; copied to AUD-04's plan when scoped.

## Files you will NOT modify

- Anything under `app/src/` — the audit is read-only.
- `app/jest.config.cjs`, `app/jest.setup.js`, existing mocks — if a new test genuinely needs a
  mock the setup lacks, add a scoped mock file under `app/tests/__setup__/mocks/` instead.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-03 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd app
yarn jest:run tests/src/screens/app tests/src/navigation tests/src/hooks/useRecoveryPrompts.test.ts tests/src/hooks/usePendingKycRecovery.test.ts
yarn types
node scripts/check-test-requires.cjs
```

Must pass with the new characterization tests in place. The report's Validation section records
these commands and their output.

## Definition of done

1. Every Q1–Q6 sub-question answered with citations, or explicitly moved to
   `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections, including the
   onboarding-UX descope rationale.
3. Characterization tests merged and green for every confirmed Critical/Major jest-testable
   finding; named manual-test procedures documented for race-only findings.
4. Any confirmed Critical security finding fast-pathed at discovery (confidential issue exists,
   report redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-03 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Plan pre-drafted from reconnaissance of the full file inventory (routing core files,
  boundary inputs, and existing tests read at cited lines). Drafted before AUD-02 execution per the sequential
  pre-drafting rule; requires recon refresh + owner re-review at activation.
- 2026-06-11 — Owner scope decision folded in at draft time: onboarding-screen UX descoped because
  Euclid 3.0 will rebuild onboarding. Audit narrowed to the routing/navigation **mechanism**
  (startup decision, splash race, deep links, resume hooks, dev-screen reachability) — the layer
  that survives an onboarding rewrite. Title and SPEC row to be updated to reflect the narrower
  scope at activation.
- 2026-06-11 — Review pass fixed two scope misroutes (document storage is not AUD-01; WebView app
  host surface feeds AUD-09) and corrected Q3.3's parse-before-gate ordering.
