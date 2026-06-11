# AUD-02 — Key material & keychain lifecycle audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft
> Priority: High
> Time box: 4 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests only. Target <1k LOC of test code.

## Context

You are auditing how the Self app generates, stores, migrates, backs up, and restores the user's
master secret (a BIP39 mnemonic in ethers `Mnemonic` JSON form, keychain service `'secret'`).
This is the pilot audit for the workstream: losing this secret is permanent account loss, leaking
it is full identity-key compromise, and the surface currently has near-zero test coverage on its
write paths.

Reconnaissance (2026-06-11) confirmed the surface is small enough to audit exhaustively
(~1,000 LOC of TS plus one vendored Kotlin patch) and produced the suspected-issue list embedded
in the question list below. Treat every "suspected" item as unverified: your job is to confirm or
refute each one with a trace or a reproduction, per the workstream's evidence standard.

## Scope

### In scope (the complete file inventory)

| Area                                      | Files                                                                                                                                                                                                                                                                                                                                                          | LOC               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Secret lifecycle core                     | `app/src/providers/authProvider.tsx`                                                                                                                                                                                                                                                                                                                           | 596               |
| Keychain option builder                   | `app/src/integrations/keychain/index.ts`                                                                                                                                                                                                                                                                                                                       | 225               |
| Mnemonic validation                       | `app/src/utils/crypto/mnemonic.ts`                                                                                                                                                                                                                                                                                                                             | 68                |
| Keychain error taxonomy                   | `app/src/utils/keychainErrors.ts`                                                                                                                                                                                                                                                                                                                              | —                 |
| Cloud backup                              | `app/src/services/cloud-backup/{index,helpers,ios,google}.ts`                                                                                                                                                                                                                                                                                                  | 247               |
| Startup call sites                        | `app/src/screens/app/SplashScreen.tsx` (lines 116–137), `app/src/screens/app/startupRouting.ts`                                                                                                                                                                                                                                                                | —                 |
| Web variant                               | `app/src/providers/authProvider.web.tsx`                                                                                                                                                                                                                                                                                                                       | —                 |
| Privileged-export call sites              | `app/src/providers/selfClientProvider.tsx`, `app/src/providers/passportDataProvider.tsx`, `app/src/services/points/api.ts`, `app/src/screens/dev/DevPrivateKeyScreen.tsx`, `app/src/screens/dev/TroubleshootingScreen.tsx`                                                                                                                                     | trace only        |
| Backup/restore call sites (Q4/Q5 ingress) | `app/src/screens/account/settings/CloudBackupScreen.tsx` (`useBackupMnemonic` at :64, `disableBackup` :91, `upload` :175), `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx` (`download` :58, `restoreAccountFromMnemonic` :81, :218), `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx` (`restoreAccountFromMnemonic` :63, :95) | trace only        |
| Vendored native delta                     | `patches/react-native-keychain+10.0.0.patch`                                                                                                                                                                                                                                                                                                                   | ~6.2k added lines |
| Existing tests                            | `app/tests/src/utils/keychainErrors.test.ts` (64), `app/tests/src/hooks/useMnemonic.test.ts` (47), `app/tests/src/services/cloud-backup.test.ts` (497)                                                                                                                                                                                                         | 608               |

### Out of scope

- Document/passport data storage in `passportDataProvider.tsx` (catalog, dedup, content hashes) —
  that is AUD-01/AUD-03 territory. You only trace its calls into `unsafe_getPrivateKey`.
- The recovery-flow **screens** (`RecoverWithPhraseScreen`, `SaveRecoveryPhraseScreen`,
  `AccountRecoveryChoiceScreen`) — UX and navigation belong to AUD-03. You trace which auth/backup
  functions they call and stop at the function boundary.
- Turnkey backup (`app/src/integrations/turnkey.ts`) — feature is disabled
  (`turnkeyBackupEnabled`); record its existence in the report, do not audit it.
- Fixing anything. The workstream invariant is read-only: every fix, however small, becomes a
  finding with acceptance criteria.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Generation and first storage (`loadOrCreateMnemonic`, `authProvider.tsx:189-288`)

1. **Q1.1 (suspected Critical).** When a stored secret exists but `JSON.parse` fails
   (`authProvider.tsx:200-220`, the "old secret format" path), execution falls through to the
   create block at `authProvider.tsx:264-278`, which writes a **new random mnemonic over the
   existing secret**. Confirm by trace and reproduce in a test: does any legacy on-device format
   reach this path, and is the old secret recoverable afterward? Identify what "old secret format"
   was (git history of this file) and whether any current users can still hold it.
2. **Q1.2 (suspected Major).** `Keychain.getGenericPassword` returning `false` is treated as "no
   secret" and triggers creation. Enumerate (from `react-native-keychain` 10.0.0 source, including
   the patch) every condition under which the Android and iOS implementations return `false`
   rather than throw — locked keystore, interrupted biometric, missing entry, decryption failure.
   Any non-"missing entry" condition that returns `false` means a transient failure silently
   replaces the user's key.
3. **Q1.3.** Compare the `setOptions` used on create (`authProvider.tsx:270`) with those used by
   migration (`authProvider.tsx:509`) and restore (`authProvider.tsx:164`). All three must produce
   identical protection classes; document any divergence.

### Q2 — Startup migration (`migrateToSecureKeychain`, `authProvider.tsx:484-538`; called from `SplashScreen.tsx:135`)

1. **Q2.1 (suspected Major).** The migration reads the secret without `accessControl`
   (`authProvider.tsx:494`) and re-writes it in place with new options (`:509`). The two steps are
   not atomic. Determine what state the keychain entry is in if the process dies or the write
   throws between read and write, on each platform — is the old entry intact, deleted, or
   replaced with a partial write?
2. **Q2.2.** On failure the function returns `false` without setting
   `hasCompletedKeychainMigration`, so it re-runs every launch. Decide-by-evidence whether this is
   safe retry or a repeated-failure loop visible to users (correlate with the
   `mnemonic_migration_failed` Sentry event volume if accessible); the report must state which.
3. **Q2.3 (suspected Low).** The migration write passes `SERVICE_NAME` (`'secret'`) as the
   keychain **username** where other writes pass the literal `'secret'` (`:164`, `:270`). Same
   value today by coincidence; confirm whether username participates in lookup on either platform
   and flag the fragility.

### Q3 — Retrieval and authentication gating

1. **Q3.1 (suspected Major).** `loginWithBiometrics` (`authProvider.tsx:329-370`) and
   `_getWithBiometrics` (`:86-124`) use `ReactNativeBiometrics.simplePrompt` — a UI prompt with no
   cryptographic binding — and `_getSecurely` hardcodes `signature: 'authenticated'` (`:71-74`).
   Establish where biometric access to the secret is _actually_ enforced: it must be the keychain
   `accessControl` on the entry itself. Verify on both platforms that reading service `'secret'`
   without passing the auth-gated `getOptions` fails when `accessControl` was set at write time.
2. **Q3.2 (suspected Major — policy decision needed).** On devices without a passcode,
   `getAdaptiveSecurityConfig` sets `accessControl: undefined`
   (`app/src/integrations/keychain/index.ts:177-180`) and stores the mnemonic at
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY` with **no authentication requirement**. Document this as the
   current accepted posture or a gap — the report must force the owner decision either way.
3. **Q3.3 (suspected Major).** `hasSecretStored` (`authProvider.tsx:473-481`) swallows all errors
   to `false`, and `startupRouting.ts:29` routes `!hasSecretStored` users as fresh installs.
   Trace the full downstream consequence: from a transient keychain error at startup, what
   sequence of screens and writes occurs, and does any path reach `loadOrCreateMnemonic`'s create
   block (Q1.2 compounding) while a real secret still exists?
4. **Q3.4.** The 15-minute `isAuthenticated` session (`authProvider.tsx:321`, `:358-369`) is
   React state only. Confirm it gates nothing security-relevant by itself (keychain re-prompts
   regardless), or find what trusts it.

### Q4 — Cloud backup confidentiality and integrity (`app/src/services/cloud-backup/`)

1. **Q4.1 (suspected Critical — verify carefully before fast-pathing).** The backup file is named
   `encrypted-private-key` (`helpers.ts:12-13`), but `upload()` writes `JSON.stringify(mnemonic)`
   — the raw phrase — on both platforms (`index.ts:105-112`, `ios.ts:35-47`). Establish
   definitively whether any encryption layer exists between these calls and the provider
   (react-native-cloud-storage scope/options, Drive appData semantics, git history for a removed
   encryption step). If the mnemonic genuinely leaves the device plaintext-at-applayer, this is a
   Critical finding: protection reduces to the user's Apple/Google account security, and the
   filename actively misleads. Apply the fast-path (confidential Linear issue, redacted report
   reference) if confirmed.
2. **Q4.2.** Android: `google.ts` requests `access_type: 'offline', prompt: 'consent'` and holds
   an `accessToken` on a `GDrive` instance. Determine token lifetime/storage (is a refresh token
   persisted anywhere?) and whether `appDataFolder` scoping is the only thing preventing broader
   Drive access.
3. **Q4.3.** `disableBackup` (`index.ts:33-57`, `ios.ts:13-15`): verify deletion actually removes
   all backup copies (Drive lists-then-deletes every match — confirm pagination isn't truncating;
   iOS `rmdir` recursive) and what the user sees if deletion partially fails.

### Q5 — Restore paths

1. **Q5.1 (suspected Major).** `restoreFromMnemonic` (`authProvider.tsx:147-183`) overwrites the
   stored secret unconditionally. Trace every caller: can a user with an existing registered
   identity reach restore and silently replace their key (losing the old identity) without an
   explicit destructive-action confirmation?
2. **Q5.2.** Verify `parseMnemonic` (`app/src/utils/crypto/mnemonic.ts:48-68`) is on **every**
   restore ingress (manual phrase entry, iOS download, Drive download) and that its error
   messages don't echo phrase material into logs/Sentry.

### Q6 — Capability detection and silent security downgrades (`app/src/integrations/keychain/index.ts`)

1. **Q6.1 (suspected Medium).** Every detection failure degrades silently to the weakest option:
   `getMaxSecurityLevel` catch → `ANY` (`:195-204`), `checkPasscodeAvailable` catch → `false`
   (`:62-77`) which drops `accessControl` entirely (Q3.2). Determine whether a transient failure
   at write time can downgrade the protection class of an _existing_ secret on the next write, and
   whether any telemetry records that a downgrade happened.
2. **Q6.2 (suspected Low).** `checkPasscodeAvailable` probes by writing
   `passcode-test-<Date.now()>` entries (`:64`). If `resetGenericPassword` fails, orphaned test
   entries accumulate. Confirm and measure.
3. **Q6.3.** `useStrongBox` defaults: option default is `true` (`:28-29`), runtime falls back to
   `useSettingStore.getState().useStrongBox`. Document the actual default for a fresh install and
   which devices end up StrongBox-backed.

### Q7 — Privileged exports and the web boundary

1. **Q7.1.** For each call site of `unsafe_getPrivateKey` / `unsafe_getPointsPrivateKey`
   (`selfClientProvider.tsx`, `passportDataProvider.tsx`, `points/api.ts`,
   `DevPrivateKeyScreen.tsx`, `TroubleshootingScreen.tsx`): record what the key is used for, how
   long it lives in JS memory, whether it can reach logs/state/analytics, and whether the dev
   screens are excluded from release builds.
2. **Q7.2.** `unsafe_clearSecrets` (`authProvider.tsx:547-551`) is `__DEV__`-gated — confirm the
   gate is compile-time-effective in release builds.
3. **Q7.3.** `authProvider.web.tsx`: CLAUDE.md mandates keychain is native-managed with **no web
   fallback for secure storage**. Verify the web variant stores no secret material (anything else
   is a finding against a stated security boundary).

### Q8 — The vendored keychain patch (`patches/react-native-keychain+10.0.0.patch`)

1. **Q8.1.** Isolate the real source delta — `KeychainModule.kt`, `cipherStorage/*.kt`
   (`CipherStorage`, `CipherStorageBase`, `CipherStorageKeystoreAesCbc`,
   `CipherStorageKeystoreAesGcm`, `CipherStorageKeystoreRsaEcb`), `src/types.ts` — from the
   ~6,200 lines of committed build artifacts (`.project`, `build/.transforms/**`, `.dex` files).
   Document precisely what behavior the Kotlin delta changes (StrongBox support? cipher
   selection?) and whether upstream `react-native-keychain` ≥10 has absorbed it.
2. **Q8.2.** The build-artifact bloat itself is a finding for AUD-06's bucket — record it with a
   pointer, don't pursue it here beyond confirming the artifacts are inert.

### Q9 — Existing-coverage characterization

1. **Q9.1.** For the three existing test files, record what each actually asserts versus mock
   wiring, and map every Q1–Q7 question to `covered / partially covered / uncovered`. This table
   anchors the report's test-gap acceptance criteria and feeds AUD-04.

## Method

1. Work the questions in order Q4 → Q1 → Q3 → Q2 → Q5 → Q6 → Q7 → Q8 → Q9 (highest candidate
   severity first, so the time box truncates the tail, not the head).
2. For each question: trace the full call path with `path:line` citations, then classify per the
   workstream severity rubric. Suspected severities above are priors, not conclusions.
3. Reproduce every confirmed Critical/Major as a characterization test pinning **current**
   behavior (e.g., "legacy-format parse failure currently results in a new mnemonic overwriting
   the stored entry"). New tests live under `app/tests/src/providers/authProvider.test.tsx` and
   `app/tests/src/integrations/keychain.test.ts` (new files); extend
   `app/tests/src/services/cloud-backup.test.ts` for Q4/Q5.
4. Jest constraints (hard requirements, they prevent CI OOM): no nested
   `require('react-native')` or `require('react')` inside `jest.mock` factories — use hoisted
   imports and the existing mock aliases; keep tests under `app/tests/` so
   `app/scripts/check-test-requires.cjs` covers them; mock `react-native-keychain` at the module
   boundary via `moduleNameMapper`/existing setup mocks rather than ad-hoc factories.
5. Native-source questions (Q1.2, Q2.1, Q3.1, Q8.1) are answered by reading the vendored
   `react-native-keychain` 10.0.0 source plus the patch — not by speculation about the library.
   Platform behavior you cannot establish from source goes to `Needs investigation` with a named
   manual-test procedure, not a guess.
6. A confirmed Critical security finding triggers the workstream fast-path immediately:
   confidential Linear issue with full detail the same day; the report carries a redacted
   reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-06-DD-key-material-keychain-audit.md` with the
   workstream's required sections: header block, summary, severity-bucketed findings with
   per-finding acceptance criteria, `Needs investigation` leads with dispositions, follow-up
   issues grouped into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification
   log, what works well, validation.
2. **Characterization tests** — merged in the audit PR, one per confirmed Critical/Major finding
   on a write path, named so the linked finding is obvious
   (`describe('AUD-02 Q1.1: legacy-format fallthrough', ...)`).
3. **Coverage map** (Q9 table) — included in the report; copied to AUD-04's plan when that audit
   is scoped.

## Files you will NOT modify

- Anything under `app/src/` — the audit is read-only.
- `patches/`, `app/jest.config.cjs`, `app/jest.setup.js` — if a new test genuinely needs a mock
  the setup lacks, add a scoped mock file under `app/tests/__setup__/mocks/` instead.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-02 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd app && yarn jest:run tests/src/providers tests/src/integrations tests/src/services/cloud-backup.test.ts && yarn types && node scripts/check-test-requires.cjs
```

Both must pass with the new characterization tests in place. The report's Validation section
records these commands and their output.

## Definition of done

1. Every Q1–Q9 sub-question answered with citations, or explicitly moved to
   `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections.
3. Characterization tests merged and green for every confirmed Critical/Major write-path finding.
4. Any confirmed Critical security finding fast-pathed at discovery (confidential issue exists,
   report redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-02 backlog row updated; pilot
   lessons recorded in the status log below for the protocol revision before AUD-01.

## Status log

- 2026-06-11 — Plan drafted from reconnaissance of the full file inventory. Awaiting owner review
  and Linear tracking issue creation (Stage 1 gate).
- 2026-06-11 — Review revisions: fixed validation command path (`scripts/` relative to `app/`),
  carved out a backlog-row-only exception to the SPEC.md no-modify rule to resolve the DoD
  conflict, added Q4/Q5 backup/restore ingress call sites to the inventory as trace-only rows.
