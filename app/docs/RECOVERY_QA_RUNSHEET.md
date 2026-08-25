# Recovery stack — device QA run sheet

Covers the four stacked PRs (build once, test all four):

| PR | Issue | Fix |
| --- | --- | --- |
| [#2272](https://github.com/selfxyz/self/pull/2272) | SELF-3931 | Fetch protocol trees before the recovery registration check |
| [#2273](https://github.com/selfxyz/self/pull/2273) | SELF-3932 | Surface cloud restore failures to the user and telemetry |
| [#2277](https://github.com/selfxyz/self/pull/2277) | SELF-3933 | Trigger iCloud sync before concluding a backup is missing |
| [#2278](https://github.com/selfxyz/self/pull/2278) | SELF-3934 / SELF-3935 | Truthful Drive OAuth errors, visible backup-enable failures, frozen backup path |

**Build from `self-3934-3935-backup-error-hygiene`** — the stack is linear
(#2272 → #2273 → #2277 → #2278), so this one build exercises everything.

## Setup

- iOS device A + iOS device B on the same Apple ID (or one device you can
  wipe). Only the fresh-restore test needs two. **Real hardware only** —
  simulator iCloud sync needs manual triggering and is flaky.
- One Android device with a Google account. The OAuth tests need a build
  whose client ID you can deliberately break once (test 11).
- A previously registered ID document (the trees fix needs a real registered
  commitment to restore against). The mismatched-backup test additionally
  needs a backup made under a *different* phrase than the document's.
- Mixpanel (project 3540525) open to verify events as you go.

## iOS — restore

- [x] **1. Fresh-device restore — the merge-gating test (#2277).**
      Enable cloud backup on device A → fresh install on device B (same
      Apple ID) → Recover → from iCloud, *immediately*.
      **Expected:** restore succeeds; a wait of up to ~30 s is normal.
      Never "did you back it up previously?".
      This is the only test that validates the placeholder-naming and
      `triggerSync`-materialisation assumptions unit tests cannot reach.
- [ ] **2. Sync budget exhausted (#2277).** If test 1 stalls past the budget:
      **Expected:** "Your backup is still syncing from iCloud. Keep the app
      open and try again in a moment." — and a retry shortly after succeeds.
- [x] **3. Signed out of iCloud (#2273, #2277).** Sign out in OS Settings →
      Recover → from iCloud.
      **Expected:** "Sign in to iCloud in your device settings…" — not
      "no backup found", not silence.
- [ ] **4. No backup ever made (#2273, #2277).** Signed in, account with no
      backup → Recover from iCloud.
      **Expected:** "We couldn't find a backup in iCloud…" including the
      Android↔iPhone incompatibility sentence. A few seconds' probe delay is
      expected (#2278 retries empty listings) — but no 30 s wait.
- [ ] **5. Disabled backup stays gone (#2277 AC4).** Enable backup → disable
      backup → Recover from iCloud.
      **Expected:** "no backup found".
- [x] **6. Backup from a different registration (#2278 copy).** With a backup
      in iCloud made under a different phrase than the document on the device
      → Recover from iCloud.
      **Expected:** "We found a Self backup in iCloud, but it's not the one
      used with this document. Enter the recovery phrase you used with this
      document instead." — must NOT mention a phrase the user typed or say
      "sign in".

## Android — restore

- [ ] **7. Sign-in cancelled (#2273).** Recover → from Google Drive → cancel
      the sign-in sheet (back out before picking an account).
      **Expected:** "The Google Drive sign-in was dismissed before it
      finished…" — not silence, not an idle button.
- [ ] **8. Deny on Google's consent page (#2278).** Proceed into the sheet,
      pick an account, then tap Deny/Cancel on the consent screen.
      **Expected:** treated as a cancel — same "dismissed" copy as test 7,
      NOT a failure. (Confirms the `access_denied`-as-cancel assumption.)
- [ ] **9. No backup on the account (#2273).**
      **Expected:** "We couldn't find a backup in Google Drive…".
- [ ] **10. Airplane mode (#2278).** Recover from Drive with no network.
      **Expected:** "Something went wrong signing in to Google Drive…" —
      a *failure*, no longer misreported as "cancelled" (this was the
      SELF-3934 bug; network errors share the cancel code but not the
      cancel message).
- [ ] **11. Wrong client ID (#2278).** One-off build with a deliberately bad
      `GOOGLE_SIGNIN_ANDROID_CLIENT_ID`.
      **Expected:** the sign-in-failed copy, and Mixpanel shows
      `reason: sign_in_failed` — never "cancelled".

## Either platform — restore

- [x] **12. Registered-ID restore (#2272).** Reinstall, re-scan a previously
      registered ID, Recover → from cloud.
      **Expected:** restore completes. (This was the TypeError / false
      "not registered" bug.)
- [x] **13. Registry unreachable (#2272, #2273).** Same as 12 in airplane mode
      (past the download step if cached), or via the phrase path.
      **Expected:** "We couldn't reach the Self network to verify your ID.
      Check your connection…" — **never** "doesn't match a registered ID".
- [x] **14. Phrase path (#2272).** Repeat 12 and 13 via Recover → recovery
      phrase.
      **Expected:** same outcomes; errors render inline under the text box.
- [ ] **15. Biometrics unavailable (#2273).** Disable biometrics/device lock
      in OS Settings → open the Recover screen.
      **Expected:** cloud button disabled with the explanation directly
      beneath it; phrase button fully usable; **no biometric prompt**.
- [ ] **16. Biometrics re-enabled without restart (#2273).** From test 15,
      without killing the app: re-enable biometrics in OS Settings, return to
      the app with the screen still open.
      **Expected:** cloud button enables on its own — no restart, no
      re-navigation. (Exercises the AppState foreground re-check; only a real
      OS round-trip can.)
- [x] **17. Error typography.** Trigger any inline recovery error.
      **Expected:** the red text renders in the app's body font (DINOT),
      matching the surrounding copy — not the OS default font.

## Either platform — backup enable (#2278)

- [ ] **18. Enable fails visibly.** Airplane mode → Settings → enable cloud
      backup.
      **Expected:** an "Error / Failed to enable cloud backups" alert, the
      toggle stays OFF, and `Cloud Backup Enable Failed` fires with a reason.
      Previously this failed in complete silence.
- [ ] **19. Biometric prompt dismissed during enable.** Start enabling, then
      dismiss the biometric/keychain prompt.
      **Expected:** NO error alert (the user cancelled it themselves), toggle
      stays off; Mixpanel shows `reason: authentication_cancelled`.
- [ ] **20. Sign-in sheet dismissed during enable (Android).** Start enabling,
      cancel the Google sheet.
      **Expected:** NO error alert; `reason: sign_in_cancelled`.
- [ ] **21. Path freeze — no orphaning (#2278, critical).** Restore a backup
      created by the **current production build**.
      **Expected:** still found and restored — the frozen folder path resolves
      to the same iCloud/Drive location production has always written to.
- [ ] **22. Enable → disable round-trip.** Enable backup, then disable it,
      then attempt restore.
      **Expected:** disable removes the file from the same location the
      enable wrote it; restore reports "no backup found".

## Either platform — backup enable conflict check (SELF-3964)

- [ ] **23. Fresh-account enable (critical — the mkdir-discriminator path).**
      Account that never backed up → enable.
      **Expected:** succeeds. On iOS the backup folder does not exist yet, so
      the existence check cannot list it — enable must still work.
- [ ] **24. Same-phrase reconnect.** Phrase-restore a device whose account
      already holds that phrase's backup → enable.
      **Expected:** toggle flips on silently, no dialog; Android appDataFolder
      still has exactly the same number of files (no new upload); Mixpanel
      `Cloud Backup Enabled Done` carries `existing: true`.
- [ ] **25. Legacy duplicates, all matching (Android).** Account with two
      duplicate files of the same phrase → enable.
      **Expected:** reconnects silently; still exactly two files — nothing
      written, nothing deleted.
- [ ] **26. Conflicting backup.** Account holding a backup for a *different*
      phrase than this device → enable.
      **Expected:** "Existing backup found … left untouched" alert; toggle
      stays off; the cloud backup is still restorable afterwards; Mixpanel
      `reason: backup_conflict`.
- [ ] **27. Corrupt backup.** Manually corrupt the backup file → enable.
      **Expected:** same conflict alert, file untouched — never replaced.

## Mixpanel checks (after the runs)

- [ ] `Backup: Cloud Restore Started` fires exactly once per attempt, and
      `Backup: Cloud Backup Started` no longer fires from the recover button.
- [ ] Every restore failure above carries a `reason` matching what was on
      screen: `no_backup_found`, `cloud_unavailable`, `sign_in_cancelled`,
      `sign_in_failed`, `backup_not_synced`, `protocol_data_unavailable`,
      `document_not_registered`.
- [ ] `Backup: Cloud Backup Enable Failed` carries `reason`
      (`unexpected_error` / `sign_in_cancelled` / `sign_in_failed` /
      `authentication_cancelled`) — tests 18-20.
- [ ] Zero `Cloud Restore Failed: Unknown Error` events with
      `error: TypeError` from the test devices (#2272 regression check).

## Not device-testable

- `secret_storage_failed` (#2273's keychain-write failure branch) — not
  reproducible without breaking the keychain; covered by unit tests only.

## Still open (not covered by any test here)

- SELF-3934 AC2: the GCP Console audit (client IDs per environment,
  registered SHA-1s vs the Play App Signing certificate, consent-screen
  publishing status) — recorded as a comment on the Linear issue when done.
- Test 4's Play-signed variant: on a Play-signed internal-track build, do a
  full enable → uninstall → reinstall → restore round-trip (SELF-3934
  testing instruction 4). Only meaningful after the Console audit confirms
  the production OAuth client carries the Play App Signing SHA-1.
