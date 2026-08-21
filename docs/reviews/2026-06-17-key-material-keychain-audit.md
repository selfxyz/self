# AUD-02 — Key Material & Keychain Lifecycle Audit (Findings)

> Date: 2026-06-17
> Scope: mnemonic/seed-phrase generation, keychain storage, startup migration, biometric gating, cloud backup/restore, capability detection, vendored keychain patch, and existing test coverage for the Self Wallet master secret (keychain service `'secret'`).
> Auditor: Claude Code (AUD-02 pilot), investigation + adversarial-refutation agents.
> Code state: branch `self-3180`, worktree at `origin/dev` HEAD `bb3b59bbc` (`authProvider.tsx` = 596 LOC, matches plan).
> Status: **Reviewed — dispositions recorded (2026-06-18).** See Owner Decisions. F-01/F-02 Critical escalation handled by the owner out-of-band. Remediation for F-02/F-06/F-07/F-08 tracked in `fix/aud-02-key-material`.
> Plan: [AUD-02 execution plan](../../specs/projects/sdk/workstreams/audits/plans/AUD-02-key-material-keychain-lifecycle.md)

## Summary

The master secret is a BIP39 mnemonic stored as `JSON.stringify(ethers.Mnemonic)` under keychain service `'secret'`. The audit traced all nine question clusters end-to-end against `origin/dev` and the vendored `react-native-keychain` 10.0.0 source. Every Critical/Major finding below was reproduced or traced and independently re-verified by a refutation pass that tried to disprove it.

Headline results:

- **Two Criticals confirmed.** The cloud backup writes the **plaintext mnemonic** to iCloud/Google Drive under a file named `encrypted-private-key` with no app-layer encryption (F-01). A legacy on-device secret format that fails `JSON.parse` is **silently overwritten with a new random mnemonic**, unrecoverably destroying the original key (F-02).
- **Six Majors confirmed**, covering non-atomic iOS migration with a key-loss window (F-03), unconditional destructive restore with no confirmation (F-04), secrets stored with **no authentication requirement** on passcode-less devices (F-05), StrongBox hardware backing **disabled by default** in production (F-06), `hasSecretStored` swallowing errors and misrouting existing users as fresh installs (F-07), and incomplete cloud-backup deletion that reports success (F-08).
- **One Medium**: dev screens that reveal the raw private key ship in release builds, reachable via tap gestures (F-09).
- **Lows/informational**: validation-path inconsistency (F-10), orphaned passcode-test keychain entries (F-11), `useStrongBox` JSDoc/default drift (F-12), migration username/service coupling (F-13), keychain patch artifact bloat + patch drift (F-14).
- **Two plan priors refuted/narrowed.** The "transient `getGenericPassword` false → overwrite" mechanism (plan Q1.2) does **not** exist on the app's native paths — transient failures throw, they do not return false. The Q3.3 "compounding overwrite at startup" hypothesis is **refuted**: startup routing never reaches the create/overwrite block; F-07 is a routing/UX defect only.
- **Coverage**: 0 of 21 questions fully covered by existing tests; 5 partial, 16 uncovered. The most dangerous write paths (F-01, F-02, F-04, F-05) have no tests.

Two plan citations are stale and corrected here: `authProvider.web.tsx` does not exist (no web variant; Q7.3 boundary holds with no finding), and `CloudBackupScreen.tsx` is not a restore ingress (the real third ingress is the SDK recovery event in `selfClientProvider.tsx`).

---

## Findings

### F-01 — Cloud backup stores the plaintext mnemonic (filename claims encryption) — **CRITICAL**

**Code.** `app/src/services/cloud-backup/helpers.ts:12-13` (`ENCRYPTED_FILE_PATH`, `FILE_NAME = 'encrypted-private-key'`); Android write `app/src/services/cloud-backup/index.ts:108` (`.setData(JSON.stringify(mnemonic))`); iOS write `app/src/services/cloud-backup/ios.ts:45` (`CloudStorage.writeFile(ENCRYPTED_FILE_PATH, JSON.stringify(mnemonic))`); payload type `app/src/types/mnemonic.ts:11,29` (`phrase`, `entropy`). Caller `app/src/screens/account/settings/CloudBackupScreen.tsx:170-175` passes the decrypted in-memory `Mnemonic` straight to `upload()`.

**Trigger.** User enables cloud backup in settings. `upload(mnemonic)` serializes the `Mnemonic` object — which contains the literal 12/24-word `phrase` and the `entropy` — and writes it verbatim. No encryption step exists in the call chain; `download()`→`parseMnemonic()` does a plain `JSON.parse` (proving the stored form is plaintext JSON). `git log -p` over `app/src/services/cloud-backup/` shows no `encrypt`/`cipher`/`aes`/`nacl`/`sodium` call was ever added or removed — encryption was never implemented; the name is cosmetic.

**Observed vs expected.** Observed: the root recovery secret leaves the device in clear and lands in iCloud AppData / Google Drive `appDataFolder` as readable JSON. Confidentiality reduces entirely to the user's Apple/Google account security (password + 2FA + provider at-rest encryption), and the `encrypted-private-key` filename plus the "encrypted backup" user-facing strings (`index.ts:78`, `ios.ts:31`) actively misrepresent the protection. Expected for a recovery-secret boundary: encrypt the payload with a user-derived key (passphrase/PIN) before it leaves the device, so cloud-account compromise does not equal key compromise.

**Acceptance criteria (remediation).**
- The mnemonic is encrypted on-device with a key not derivable from the cloud account before any `writeFile`/`setData`; the cloud stores ciphertext only.
- The file name and all user-facing copy match reality (no "encrypted" claim unless it is).
- A test asserts the bytes handed to the provider are not a parseable plaintext mnemonic.
- Restore decrypts and validates; round-trip covered by a test.

---

### F-02 — Legacy-format parse failure overwrites the stored secret with a new mnemonic — **CRITICAL**

**Code.** `app/src/providers/authProvider.tsx`: read `:196-199`; if present, inner `try JSON.parse → return` `:201-207`; inner `catch` `:208-219` logs only (no return/throw); outer `catch` `:221-263` handles only keychain *exceptions* and rethrows; create block `:264-288` generates `ethers.Mnemonic.fromEntropy(ethers.randomBytes(32))` and `Keychain.setGenericPassword('secret', data, { ...setOptions, service: SERVICE_NAME })` `:270-273`. `SERVICE_NAME = 'secret'` `:37`.

**Trigger.** A stored secret exists but is not valid JSON, so `JSON.parse` throws. The inner catch only logs `mnemonic_parse_failed / legacy_format`; control falls through to the create block, which overwrites the same service with a fresh random mnemonic. Git history (independently reproduced): before PR #201 (`2155bf95a`, 2025-02-21) the secret was stored as a **raw hex private-key string** (`setGenericPassword('secret', privateKey, …)`), read back with no `JSON.parse`. #201 switched the on-disk format to `JSON.stringify(mnemonic)` **with no read-old/convert migration**; PR #221 (`c12bd6b5f`, 2025-02-25) added the `try/parse/catch` block whose original catch body logged "Creating a new one" — the overwrite was the intended "handling". Any account created before #201 that has not since been rewritten still holds the raw-string format and hits this path on load.

**Observed vs expected.** Observed: a parse failure on a present secret silently replaces it; the prior key is read into no variable before the overwrite and `setGenericPassword` overwrites by service, so it is unrecoverable (iOS delete-then-add `RNKeychainManager.m:461-463`; Android overwrite-in-place `DataStorePrefsStorage.kt:64-78`). Expected: fail closed on a present-but-unparseable secret — never auto-create over existing key material; if a legacy format is possible, migrate it.

**Acceptance criteria.**
- On a present-but-unparseable stored secret, the code does **not** create/overwrite; it surfaces an error (and, if legacy raw-string format is in scope, converts it).
- A characterization test pins current behavior (parse-fail input → overwrite) and the remediation flips it to "no overwrite".
- Decision recorded on whether to support migrating the pre-#201 raw private-key format or to treat it as recover-from-phrase only.

---

### F-03 — Startup migration is non-atomic; iOS has a key-loss window — **MAJOR**

**Code.** `app/src/providers/authProvider.tsx:484-538` (`migrateToSecureKeychain`): read without accessControl `:494`, re-write with secure options `:509-512`. iOS native `RNKeychainManager.m:461` (`deletePasswordsForOptions` → `SecItemDelete`) then `:463` (`insertKeychainEntry` → `SecItemAdd`). Android `KeychainModule.kt:176-216` + `DataStorePrefsStorage.kt:64-78` (single transactional `prefs.edit{}`).

**Trigger.** Migration runs at startup (`SplashScreen.tsx:135`). On iOS the library deletes the existing item, then adds the new one as two independent Security-framework calls with no transaction/rollback and no verify-before-delete. `insertKeychainEntry` can fail *after* the delete commits — `LAContext canEvaluatePolicy` failure (`:230-233`, e.g. passcode removed / biometric lockout), `SecAccessControlCreateWithFlags` error (`:242-244`), or a non-`noErr` `SecItemAdd` status (`:258-260`). Migration writes back the same `existingMnemonic.password` it just read, so a crash/throw in the window destroys the only copy. **Android is not lossy** (overwrite-in-place; old entry intact until the atomic commit). Because failure does not set `hasCompletedKeychainMigration` (F-07-adjacent: catch `:521-537` returns false without `setKeychainMigrationCompleted()`), the migration retries every launch, re-entering the iOS window each time.

**Observed vs expected.** Observed: a same-session interruption between delete and add on iOS irrecoverably loses the mnemonic; chronic migration failure repeats the exposure. Expected: write-new-then-delete-old, or verify the new entry is readable before any destructive step.

**Acceptance criteria.**
- iOS migration cannot reach a state where the old entry is deleted and the new one is absent (write/verify before delete, or in-place update with no intervening delete).
- A test simulates a throw between read and write and asserts the original secret survives.

---

### F-04 — `restoreFromMnemonic` overwrites the active identity with no confirmation — **MAJOR**

**Code.** `app/src/providers/authProvider.tsx:147-183` (`restoreFromMnemonic`): validates phrase `:151`, then `Keychain.setGenericPassword('secret', data, …)` `:164-167` unconditionally + `generateAndStorePointsAddress` `:168`; wrapper `restoreAccountFromMnemonic` `:384-394`. Ingresses: `RecoverWithPhraseScreen.tsx:95`, `AccountRecoveryChoiceScreen.tsx:81` (cloud restore via `:215-228`). Reachable for an existing-secret user via the SDK recovery event `selfClientProvider.tsx:261-265` (from `provingMachine.ts:317,338`, emitted `:1730`) and the in-app `AccountRecoveryScreen.tsx:27` — neither gated on `hasSecretStored`.

**Trigger.** A user who already has a stored secret reaches a recovery screen (e.g. scans a document already registered under different credentials → `PROVING_ACCOUNT_RECOVERY_REQUIRED` → `AccountRecoveryChoice`, or opens recovery from settings), enters/downloads a valid phrase, and `restoreFromMnemonic` overwrites the existing key. The only auth step is the biometric prompt authorizing the *write* — there is no "this will replace your current identity" confirmation, and no `hasSecretStored` pre-check. Startup routing's `!hasSecretStored` gate (`startupRouting.ts:29-34`) does not cover these in-app/event ingresses.

**Observed vs expected.** Observed: silent, unconfirmed replacement of the live identity key (and points address). Expected: an explicit destructive-action confirmation and/or an existing-secret guard before overwrite.

**Acceptance criteria.**
- Restore over an existing secret requires an explicit destructive-action confirmation distinct from the biometric prompt.
- A test asserts restore with an existing secret present does not proceed without the confirmation path.

---

### F-05 — Secret stored with no authentication requirement on passcode-less devices — **MAJOR (owner policy decision required)**

**Code.** `app/src/integrations/keychain/index.ts`: no-passcode branch `:177-179` sets `accessControl = undefined` even with `requireAuth: true`; `:155` sets `accessible = WHEN_UNLOCKED_THIS_DEVICE_ONLY`; `createKeychainOptions` `:97-102` omits `accessControl` from `setOptions` when undefined. Reaches the write at `authProvider.tsx:270-273` / `:164-167`. Native: absent accessControl → `AccessControl.NONE` (`KeychainModule.kt:690-691`), `useBiometry/usePasscode=false` (`:737-748`), key generated without `setUserAuthenticationRequired` → app-readable with no user auth.

**Trigger.** Device has no screen lock / passcode (`checkPasscodeAvailable` returns false). The mnemonic is then stored decryptable by the app process with no user authentication on both platforms.

**Observed vs expected.** Observed: on passcode-less devices the root secret has no auth gate — a deliberate posture (comment `:178` "Don't require additional authentication if no passcode is set"). Expected: an explicit, owner-ratified decision. Either accept the documented posture (and document it in user-facing security docs) or fail closed (require a passcode / app-level secret to enable wallet creation).

**Acceptance criteria.**
- Owner records the decision (accept documented posture vs fail-closed) in the SPEC and user-facing security docs.
- If fail-closed: a test asserts a secret is never written without an auth requirement.
- If accepted: the posture is documented and a telemetry/event marks no-auth storage.

---

### F-06 — StrongBox hardware backing disabled by default in production — **MAJOR**

**Code.** Vendored patch sole functional change: `patches/react-native-keychain+10.0.0.patch` line ~8961 gates StrongBox on the new flag (`if (useStrongBox && supportsSecureHardware)`), native default `true` (`getUseStrongBoxOrDefault`). App overrides: `app/src/integrations/keychain/index.ts:94-95` (`options.useStrongBox ?? useSettingStore.getState().useStrongBox`); store default `app/src/stores/settingStore.ts:186` (`useStrongBox: false`). No mnemonic write path passes `useStrongBox: true` (`authProvider.tsx:58,504,562,582`; `passportDataProvider.tsx:888,920`); `checkPasscodeAvailable` hardcodes `false` (`keychain/index.ts:68`). JSDoc `:28-29` claims "Default: true".

**Trigger.** Every production keychain write on Android. The JS layer always passes `useStrongBox` explicitly (resolved to `false`), so the patch's native `true` default never applies; StrongBox key generation is skipped even on StrongBox-capable hardware, downgrading storage from the StrongBox HSM to the standard TEE/Keystore.

**Observed vs expected.** Observed: HSM backing off by default, contradicting the JSDoc and the patch's apparent intent. Expected: either default StrongBox on for capable devices, or document the rationale (device-compat/crash avoidance) as a ratified decision. The undocumented downgrade is the finding.

**Acceptance criteria.**
- The effective default is decided and documented (on for capable devices, or off with a recorded rationale); JSDoc and store default agree.
- A test asserts the resolved `useStrongBox` value for a fresh install matches the documented decision.

---

### F-07 — `hasSecretStored` swallows all errors → existing users misrouted as fresh installs — **MAJOR**

**Code.** `app/src/providers/authProvider.tsx:473-481` (`catch → return false`); routing `app/src/screens/app/startupRouting.ts:29` (`!hasSecretStored` → `AccountRecoveryChoice`/`Disclaimer`/`Home`); `SplashScreen.tsx:114-131`.

**Trigger.** A transient keychain error at startup (locked keystore, interrupted biometric, on iOS a prompt-on-bare-read cancel) makes `hasSecretStored()` return `false`, routing an existing user as if they had no secret.

**Observed vs expected.** Observed: read failure is indistinguishable from "no secret", producing a misleading recovery/onboarding route. Expected: distinguish "no secret" from "unreadable right now" (tri-state or rethrow on non-not-found errors) and treat unknown as retry, not absent. **Refutation note:** the original hypothesis that this compounds into an automatic overwrite (plan Q3.3) is **refuted** — startup routing never calls `getOrCreateMnemonic`/`loadOrCreateMnemonic`, and the create block is reached only on a genuine non-throwing "no entry" read (a thrown read rethrows at `:230/:252/:262`). This is a routing/UX correctness defect, not a key-destruction path.

**Acceptance criteria.**
- `hasSecretStored` (or its caller) distinguishes "absent" from "error"; startup does not route an existing user to recovery/onboarding on a transient read error.
- A test asserts a thrown keychain read does not yield the fresh-install route.

---

### F-08 — `disableBackup` (Android) can leave plaintext backups behind while reporting success — **MAJOR**

**Code.** `app/src/services/cloud-backup/index.ts:43-56` (`files.list` once, `nextPageToken` ignored, delete via `Promise.all` over the returned page). Upload creates a new file each time (`:105-112`, `newMultipartUploader().setRequestBody({name,parents})`, no `setIdOfFileToUpdate` → `POST`, Drive allows same-name duplicates). UI: `CloudBackupScreen.tsx:91-93` flips to disabled and fires `CLOUD_BACKUP_DISABLED_DONE` on resolve.

**Trigger.** If more backup files exist than one Drive list page (the wrapper does not auto-paginate), deletion is truncated; `Promise.all` resolves on the partial set, the UI shows "disabled", and plaintext copies (F-01) remain in Drive with no error shown.

**Observed vs expected.** Observed: deletion not guaranteed complete; partial success reported as full success. Expected: paginate until exhausted (or enforce a single canonical file) and surface partial-failure to the user. **Severity caveat:** reaching >1 page requires ~100+ enable/disable cycles with repeatedly failing deletes — low probability; the mechanism is confirmed, the practical severity is the contestable point (Major vs Medium — owner call). The single-file/no-pagination correctness bug stands regardless.

**Acceptance criteria.**
- `disableBackup` deletes all matching files (pagination followed) or the app enforces exactly one canonical backup file.
- Partial deletion failure is surfaced to the user and leaves the enabled flag set.
- A test covers the multi-file/paginated delete path.

---

### F-09 — Dev private-key screens ship in release builds — **MEDIUM**

**Code.** `app/src/navigation/index.tsx:45` (`...devScreens, // allow in production for testing`, no `__DEV__` guard); `app/src/navigation/devTools.tsx:81,102` (`DevPrivateKey`, `Troubleshooting` registered unguarded); `DevPrivateKeyScreen.tsx:28,39,80` (reveals `unsafe_getPrivateKey()` plaintext, `Clipboard.setString`); `SettingsScreen.tsx:158-168` (3-tap → troubleshooting, 5-tap → dev mode) surfaces them.

**Trigger.** A release-build user performs the tap gesture in settings, reaching screens that display and copy the raw account private key to the clipboard. No env/build-config exclusion found.

**Observed vs expected.** Observed: plaintext key-reveal reachable in production via gestures. Expected: dev key-reveal screens compiled out of release (`if (__DEV__)` around the `devScreens` spread).

**Acceptance criteria.**
- `DevPrivateKey`/`Troubleshooting` (key-reveal) are excluded from release bundles, or gated behind a non-discoverable build flag.
- A test or build assertion verifies the dev screens are absent in a production build config.

---

### F-10 — Restore validation inconsistency across ingresses — **LOW**

**Code.** Cloud download validates via `parseMnemonic` (`index.ts:85`, `ios.ts:22`; `app/src/utils/crypto/mnemonic.ts:48-68`, full structure + BIP39). Manual entry and the keychain-load path use bare `ethers.Mnemonic.isValidMnemonic` (`authProvider.tsx:151`) / bare `JSON.parse` (`authProvider.tsx:202`) with no structural validation.

**Observed vs expected.** Divergent validation surfaces mean a regression on one ingress isn't caught by the other's tests, and tampered-but-valid-JSON keychain content is accepted. Expected: a single validation surface for all ingresses. Logging is clean — no phrase material reaches logs/Sentry on any audited path (Q5.2 verified: error strings are static, telemetry carries `mnemonicLength`/`reason` only).

**Acceptance criteria.** All restore/load ingresses route through one validator; a test covers each ingress against the same invalid-input matrix.

---

### F-11 — Orphaned `passcode-test-*` keychain entries on cleanup failure — **LOW**

**Code.** `app/src/integrations/keychain/index.ts:62-77`: writes `passcode-test-${Date.now()}` then `resetGenericPassword`; both in one `try` with a logging-only `catch`. If the reset fails, the unique-named test entry is orphaned. Called via `detectSecurityCapabilities` on every `_getSecurely`/secret access (`authProvider.tsx:57`) and migration (`:503`).

**Observed vs expected.** Observed: one orphan per failed cleanup, unbounded over time, no sweep. Expected: fixed service name (so retries overwrite) or guaranteed cleanup (`finally`), ideally a non-write capability probe.

**Acceptance criteria.** Probe uses a stable name or guaranteed cleanup; a test asserts no residual entry after a probe whose reset throws.

---

### F-12 — `useStrongBox` JSDoc/default drift — **LOW** (folded into F-06 remediation)

**Code.** JSDoc `keychain/index.ts:28-29` says "Default: true"; effective fresh-install default is `false` (`settingStore.ts:186`). `logSecurityConfig` (`keychain/index.ts:209-225`) is dead code (no callers) and is the reason no downgrade telemetry exists (relevant to F-06). **Acceptance:** JSDoc matches the ratified default; remove or wire `logSecurityConfig`.

### F-13 — Migration passes `SERVICE_NAME` as keychain username — **LOW**

**Code.** `authProvider.tsx:509` writes username `SERVICE_NAME`; create/restore write literal `'secret'` (`:270`, `:164`). Equal today. Username/account participates in no lookup on either platform (iOS read query omits `kSecAttrAccount` `RNKeychainManager.m:475-483`; Android keys on service alias). **Acceptance:** standardize on one constant for both args; harmless today, latent inconsistency if the service name ever changes.

### F-14 — Keychain patch: artifact bloat + patch drift — **LOW** (route bloat to AUD-06)

**Code.** `patches/react-native-keychain+10.0.0.patch`: 643 of 650 hunks (~8,800 of 9,048 lines) are inert Gradle/Eclipse build artifacts under `android/build/**` + `android/.project`; the real delta is 7 files (~40 net lines) implementing the `useStrongBox` toggle. The artifacts are regenerated by Gradle and not consumed at runtime → pointer for AUD-06's cruft bucket. Separately, installed `KeychainModule.kt:196` contains a `Log.d("useStrongBox: …")` **not present in the committed patch** — the running code has drifted from the patch (a hand-edit or second patch); `patch-package` would flag this. **Acceptance:** strip build artifacts from the patch (AUD-06); reconcile the committed patch with the installed source (debug log of a boolean — Minor).

---

## Needs Investigation (with dispositions)

| Lead | Why unresolved from source | Disposition |
| --- | --- | --- |
| iOS auth-denied `OSStatus` on a real device — does `getGenericPassword` on an access-controlled item return `nil` (false) or reject on user-cancel/repeated-fail? | Apple's exact status for an existing-but-unreadable item is OS behavior, not source-derivable. If it can resolve `false`, F-02's overwrite vector gains a second (non-legacy) trigger and `hasSecretStored`'s false-negative (F-07) is sized by it. | **Convert to an investigation Linear issue** with the named device test (install with Face ID + passcode, store mnemonic, relaunch, observe prompt + cancel return value). Re-queue into AUD-01 (NFC/native) device-test batch. |
| iCloud/Drive at-rest reality — confirm `react-native-cloud-storage` `writeFile` and the `@robinbobin` Drive uploader perform no app-layer encryption (they do not, per public API) by reading the produced cloud file directly. | Third-party lib internals + provider behavior; `node_modules` absent in the worktree. | **Fold into F-01 remediation acceptance** (a test asserts the provider receives non-ciphertext today). Manual confirmation step listed in F-01. |
| `react-native-app-auth` refresh-token persistence — does `authorize()` persist a refresh token anywhere despite the app reading only `accessToken` (`google.ts:46`)? | Library internals not readable here. App-side: no refresh token is read or stored (`grep refreshToken` → 0 hits). | **Drop with reason**: app code persists nothing; the `access_type:'offline'` grant is unused and should simply be removed (minor hardening, noted under F-08 bucket). |
| Upstream `react-native-keychain` ≥10 absorption of the `useStrongBox` delta. | Requires npm/upstream network access; out of read-only-local scope. Local evidence (shipped `lib/typescript/types.d.ts` lacks `useStrongBox`) says it is a Self customization, not upstream. | **Convert to a remediation-prep note** under F-06/AUD-06: run `npm view` / upstream history diff before deciding to drop the patch on the next RN-keychain upgrade. |

---

## Follow-up Issue Buckets (input for `/gaps-to-issues`)

Buckets are PR-sized and grouped so each remediation PR is independently reviewable and revertible.

- **BUCKET-A — Cloud backup confidentiality (Critical).** F-01 (encrypt-before-upload + honest naming/copy) and F-08 (complete deletion + honest success reporting) and the unused `offline` Drive grant. *One remediation spec; Critical-priority.*
- **BUCKET-B — Secret write-path safety (Critical/Major).** F-02 (no overwrite on parse-fail; legacy-format decision) and F-03 (atomic iOS migration). Both touch `authProvider.tsx` write paths. *One spec.*
- **BUCKET-C — Destructive restore (Major).** F-04 (confirmation + existing-secret guard before restore). *One spec.*
- **BUCKET-D — Auth posture (Major, policy).** F-05 (no-passcode no-auth decision) and F-06/F-12 (StrongBox default + JSDoc). *Owner decision first, then a spec.*
- **BUCKET-E — Startup robustness (Major).** F-07 (`hasSecretStored` tri-state + routing). *One spec.*
- **BUCKET-F — Dev surface hardening (Medium).** F-09 (exclude dev key-reveal screens from release). *One spec.*
- **BUCKET-G — Cleanups (Low).** F-10 (unified validation), F-11 (passcode-probe cleanup), F-13 (username constant), F-14 patch drift. *Batchable.*
- **AUD-06 pointer.** F-14 build-artifact bloat in the keychain patch.
- **AUD-04 pointer.** The coverage map below + the stale `cloud-backup.test.ts` (tests pass only because re-wrapped error strings match; retry wrapper never exercised).

---

## Adversarial Verification Log

Stage 4 ran in fresh agent contexts, each instructed to **refute** (default to "refuted" if uncertain), independent of the investigation sessions.

| Finding | Reviewer | Method | Result |
| --- | --- | --- | --- |
| F-01 (Critical) | refuter-1 | Re-traced upload chain, Mnemonic type, provider wrappers, full git history grep for crypto | **Confirmed.** "Could not refute"; encryption never existed. |
| F-02 (Critical) | refuter-2 | Re-read `:196-288` control flow; independently ran `git show 2155bf95a`/`c12bd6b5f`; verified overwrite by service | **Confirmed.** Fall-through real; legacy raw-string format shipped pre-#201; overwrite unrecoverable. |
| F-03 (Major) | refuter-3 | Read `RNKeychainManager.m` delete-then-add; verified Android transactional write; identified the throwing window | **Confirmed** (iOS lossy; Android correctly exonerated). |
| F-04 (Major) | refuter-3 | Searched both restore screens for confirmation/guard; traced reachability via proving machine + settings | **Confirmed.** Independently found `provingMachine.ts:1730/:317/:338` reaches recovery for existing-secret users. |
| F-05 (Major) | refuter-4 | Traced no-passcode branch to native key-gen; checked for a hard block | **Confirmed.** No layer blocks no-auth storage. |
| F-07 (Major) | refuter-4 | Verified error-swallow + routing; re-verified the overwrite refutation | **Confirmed** as routing-only; overwrite hypothesis refuted. |
| F-06 (Major) | refuter-5 | Verified store default, all call sites, patch StrongBox gate | **Confirmed.** Effective default false; HSM skipped on capable hardware. |
| F-08 (Major) | refuter-5 | Verified no pagination, upload-creates-new, silent success chain | **Confirmed** mechanism; reachability low (severity Major↔Medium is the owner call). |
| F-09 (Medium) | refuter-5 | Verified unguarded `devScreens` spread, key reveal, gesture reachability | **Confirmed.** No release exclusion found. |
| Plan Q1.2 ("transient false → overwrite") | investigation + native source | Enumerated `getGenericPassword` false-vs-throw on both platforms | **Refuted** as written — transient failures throw; false only on genuinely-missing entry. Retained as Low + a device Needs-investigation. |

No accepted Critical/Major finding remained unverified. No finding was downgraded to removal; Q1.2's overwrite mechanism was demoted to Low with its residual device-test lead preserved.

---

## What Works Well

- **Failure classification.** `keychainErrors.ts` (`isUserCancellation`/`isKeychainCryptoError`/`getKeychainErrorIdentity`) cleanly separates user-cancel from crypto failure and is unit-tested; `loadOrCreateMnemonic` rethrows on real keychain errors rather than silently creating (fails closed on the read path).
- **No secret material in logs/telemetry.** Every audited path logs only enums (`reason`, `stage`), counts (`mnemonicLength`), or error identity — never the phrase or key. `RecoverWithPhraseScreen.test.tsx:200-214` explicitly pins "no phrase in raw error".
- **Minimal Drive scope.** Backup requests only `drive.appdata` and scopes all operations to `appDataFolder` — the narrowest correct scope; no refresh token is persisted by app code.
- **No web secret storage.** There is no web auth variant and no `localStorage`/`IndexedDB` use anywhere in `app/src`; the "keychain is native-managed, no web fallback" boundary holds.
- **`__DEV__` gate on `unsafe_clearSecrets` is compile-time effective** via `babel-preset-expo` (dead-code-eliminated in release).

---

## Validation

Characterization tests pinning current (buggy) behavior for the confirmed write-path findings (F-01, F-02, F-04, F-05) are added under `app/tests/src/providers/` and `app/tests/src/integrations/`, and `app/tests/src/services/cloud-backup.test.ts` is extended for F-01. Validation command (from the plan):

```bash
cd app && yarn jest:run tests/src/providers tests/src/integrations tests/src/services/cloud-backup.test.ts && yarn types && node scripts/check-test-requires.cjs
```

Command output is recorded with the test PR. (See the audit PR's test files; each `describe` names its finding, e.g. `AUD-02 F-02: legacy-format fallthrough`.)

## Coverage Map (Q9 — feeds AUD-04)

0 fully covered, 5 partial, 16 uncovered (of 21 sub-questions).

| Finding/Q | Status | Covering test (or none) |
| --- | --- | --- |
| F-02 / Q1.1 overwrite on parse-fail | uncovered | none |
| Q1.2 false→create | uncovered | none |
| F-06 / Q1.3 setOptions parity | uncovered | none |
| F-03 / Q2.1 non-atomic migration | uncovered | none |
| Q2.2 migration retry loop | partial (backup retry runs unmocked; no fail-then-succeed) | `cloud-backup.test.ts` |
| F-13 / Q2.3 username field | uncovered | none |
| Q3.1 biometric enforcement = accessControl | uncovered | none |
| F-05 / Q3.2 no-passcode no-auth | uncovered | none |
| F-07 / Q3.3 hasSecretStored swallow | partial (routing tested; swallow untested) | `startupRouting.test.ts` |
| Q3.4 session is React-state-only | uncovered | none |
| F-01 / Q4.1 plaintext cloud | partial (plaintext write asserted as *success*) | `cloud-backup.test.ts:167-171,243-246` |
| Q4.2 Drive token/scope | uncovered | none |
| F-08 / Q4.3 deletion completeness | partial (2-file delete; no pagination/partial-fail) | `cloud-backup.test.ts:465-487` |
| F-04 / Q5.1 unconditional restore | uncovered | none (`RecoverWithPhraseScreen.test.tsx` mocks restore) |
| F-10 / Q5.2 parseMnemonic ingress + log leak | partial (cloud parse + no-leak covered; manual/keychain ingress not) | `cloud-backup.test.ts`, `RecoverWithPhraseScreen.test.tsx` |
| F-06 / Q6.1 silent downgrade | uncovered | none |
| F-11 / Q6.2 orphaned probe entries | uncovered | none |
| F-12 / Q6.3 useStrongBox default | uncovered | none |
| F-09 / Q7.1 unsafe_getPrivateKey sites | uncovered | none |
| Q7.2 unsafe_clearSecrets __DEV__ gate | uncovered | none (mocked in `useDangerZoneActions.test.tsx`) |
| Q7.3 web variant | n/a — no web variant exists | none |

## Owner Decisions (resolved 2026-06-18)

Recorded after owner review. Remediation tracked in a single follow-up PR (`fix/aud-02-key-material`).

| Finding | Decision | Rationale |
| --- | --- | --- |
| **F-01** plaintext cloud backup | **Deferred** | Owner accepts app-scoped storage (iCloud AppData / Drive `appDataFolder`) for now; residual risk (cloud-account compromise = seed exposure) is acknowledged and revisited later. Client-side encryption not done in this round. |
| **F-02** parse-fail overwrite | **Fix** (fail-closed, no auto-migration) | Never overwrite a present secret; surface the error and route to recovery. Pre-#201 raw-key installs (if any) recover via phrase/cloud backup rather than in-place migration. |
| **F-03** non-atomic iOS migration | **Accept + document** | Loss requires a crash in a sub-second delete→add window in the native lib; migration already retries each launch. No code change. |
| **F-04** destructive restore | **Deferred** | Confirmation gate to be added in a later round. |
| **F-05** no-passcode no-auth | **Accept (intentional)** | Product intentionally supports users with no device lock screen; documented posture. |
| **F-06** StrongBox-off default | **Accept behavior, fix JSDoc** | StrongBox disabled by default due to Samsung-device issues; JSDoc corrected to match. |
| **F-07** startup misroute | **Fix** | Distinguish unreadable-now from absent so a transient keychain error never routes an existing user as a fresh install. |
| **F-08** incomplete backup deletion | **Fix** (single canonical file) | Update-in-place by Drive file id; deletion/restore become unambiguous, pagination moot. |
| **F-09** dev key-reveal screens in release | **Accept (intentional)** | Kept for in-field troubleshooting/backup; documented. |
| **F-10–F-14** lows | **Dropped** (F-06 JSDoc folded into the fix) | — |

Critical fast-path: the owner is handling F-01/F-02 escalation manually; no confidential issue is created from this session. This report is no longer held at Draft pending that step — status set by the owner at the review gate.
