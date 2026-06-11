# AUD-01 — NFC chip-reading flow audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (pre-drafted ahead of AUD-02 completion; requires recon refresh + owner re-review at activation)
> Priority: High
> Depends on: AUD-02 (informational — fold its keychain/storage findings into the Q5 trace boundary at refresh)
> Time box: 5 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests only. Target <1k LOC of test code.

## Context

You are auditing how the Self app reads a passport/ID-card chip over NFC: the JS orchestration and
response parsing, the per-platform native readers (vendored Kotlin module, in-repo Swift module),
the authentication fallback chain (PACE → BAC), timeout/cancellation behavior, and the parallel —
partially duplicated — scan path inside `mobile-sdk-alpha`. A wrong parse here feeds corrupt data
into proving; a silent native failure strands users mid-onboarding on a path with no retry budget.

Reconnaissance (2026-06-11) found the surface split across **three parser implementations** and two
native modules, with several suspected-dead or suspected-broken paths embedded in the question list
below. Treat every "suspected" item as unverified: confirm or refute each with a trace or a
reproduction, per the workstream's evidence standard.

## Scope

### In scope (the complete file inventory)

| Area | Files | LOC |
| --- | --- | --- |
| JS scan orchestration + parsers | `app/src/integrations/nfc/nfcScanner.ts` | 304 |
| Native module binding | `app/src/integrations/nfc/passportReader.ts` | 176 |
| Scan screen (timeouts, cancellation, events) | `app/src/screens/documents/scanning/DocumentNFCScanScreen.tsx` | 745 |
| SDK duplicate scan path | `packages/mobile-sdk-alpha/src/adapters/react-native/nfc-scanner.ts` | 160 |
| SDK scan entry + timeout | `packages/mobile-sdk-alpha/src/client.ts` (`scanNFC`, lines 113–122), `packages/mobile-sdk-alpha/src/nfc/index.ts` (55) | — |
| SDK byte-level parser | `packages/mobile-sdk-alpha/src/processing/nfc.ts` | 140 |
| Adapter wiring | `packages/mobile-sdk-alpha/src/adapters/react-native/factory.ts` (line 75), `app/src/providers/selfClientProvider.tsx` (line 109) | trace only |
| Android native reader | `app/android/react-native-passport-reader/android/src/main/java/io/tradle/nfc/RNPassportReaderModule.kt` | 1,079 |
| Android APDU logging | `app/android/react-native-passport-reader/android/src/main/java/io/tradle/nfc/APDULogger.kt` | 113 |
| Android intent wiring | `app/android/app/src/main/java/com/proofofpassportapp/MainActivity.kt` (line 34) | trace only |
| iOS native reader | `app/ios/PassportReader.swift` (186), `app/ios/PassportReaderCore.swift` (304) | 490 |
| Dev/method-selection ingress | `app/src/screens/documents/scanning/DocumentNFCMethodSelectionScreen.tsx` (283), `app/src/hooks/useErrorInjection.ts`, `app/src/stores/errorInjectionStore.ts` | trace only |
| Failure-path egress | `app/src/screens/documents/scanning/RegistrationFallbackNFCScreen.tsx` (302), `app/src/screens/documents/scanning/DocumentNFCTroubleScreen.tsx` (131), `app/src/stores/nfcTroubleStore.ts` (21) | trace only |
| SDK parallel NFC UI (WebView flow) | `packages/mobile-sdk-alpha/src/flows/onboarding/document-nfc-screen.tsx` (464), `packages/mobile-sdk-alpha/src/components/screens/NFCScannerScreen.tsx` (79) | trace only |
| Existing tests | `app/tests/src/integrations/nfc/nfcScanner.test.ts` (499), `app/tests/src/integrations/nfc/passportReader.test.ts` (128), `app/tests/src/screens/documents/scanning/DataConfirmationScreen.test.tsx` (245), `app/tests/src/screens/documents/scanning/DataConfirmationScreen-nfcFallback.test.tsx` (139), `app/tests/src/screens/documents/scanning/DocumentNFCTroubleScreen.test.tsx` (128), `app/tests/src/stores/nfcTroubleStore.test.ts` (34), `packages/mobile-sdk-alpha/tests/adapters/reactNative/nfcScanner.test.ts`, `packages/mobile-sdk-alpha/tests/processing/nfc.test.ts` | — |

### Out of scope

- Camera/MRZ OCR capture (`DocumentCameraScreen`, `LiveMRZScannerView.swift`, `MrzScanEngine.swift`,
  `app/src/utils/ocr/`) — that is the input ingress; you trace that `useMRZStore` supplies
  `passportNumber`/`dateOfBirth`/`dateOfExpiry` and stop at the store boundary.
- Passport-data **storage** after a successful parse (`storePassportData`,
  `passportDataProvider.tsx`) — AUD-02/AUD-03 territory; you stop at the
  `storePassportData(passportData)` call (`DocumentNFCScanScreen.tsx:446`).
- The proving pipeline that later consumes `PassportData`.
- KYC fallback UX (`useKycLauncher`) and recovery navigation — trace which screen is reached on
  failure and stop.
- The `app/android/android-passport-nfc-reader/` vendored example app and `app/ios/main.jsbundle`
  committed bundle — record as AUD-06 pointers (Q8.3), do not audit.
- Fixing anything. The workstream invariant is read-only: every fix, however small, becomes a
  finding with acceptance criteria.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Passive/chip authentication is suspected dead code (native, both platforms)

1. **Q1.1 (suspected Major).** Android `doPassiveAuth` dereferences `dg2File.encoded`
   (`RNPassportReaderModule.kt:672`), but `dg2File` is `lateinit` and the only assignment is
   commented out (`:556-558`). If so, every scan throws
   `UninitializedPropertyAccessException` inside `doPassiveAuth`, the catch at `:803-807` swallows
   it, and `passiveAuthSuccess` is **always false** — passive authentication (data-group hash
   comparison, CSCA chain validation `:707-769`, SOD signature check `:777-798`) never runs to
   completion on Android. Confirm by trace; reproduce in a JVM-side reasoning note or
   characterization test if feasible. Then establish impact: does anything consume
   `passiveAuthSuccess`/`chipAuthSucceeded` beyond the `nfc_scan_completed` analytics event
   (`:829-832`)? If on-device authenticity checking is intentionally vestigial (verification
   happens in ZK circuits), the report must say so explicitly and flag the dead ~200 LOC.
2. **Q1.2.** iOS computes the equivalent verdicts — `passportCorrectlySigned`,
   `passportDataNotTampered`, `verificationErrors` (`PassportReaderCore.swift:177-185`) — and both
   JS parsers drop them (`nfcScanner.ts:201-209` comments them out). Same question as Q1.1: dead
   weight or missed security signal?
3. **Q1.3.** The Android CSCA trust store is a bundled `masterList` asset
   (`RNPassportReaderModule.kt:707`). Determine its provenance and staleness, and whether it is
   reachable at all given Q1.1.
4. **Q1.4 (suspected Medium).** iOS swallows `dataGroupHashes` serialization failures with an
   empty catch (`PassportReaderCore.swift:174-175`), so JS parses `'{}'` and produces **empty**
   `dg1Hash`/`dg2Hash` arrays (`nfcScanner.ts:191-196`). Trace what downstream validation
   (`isPassportDataValid` dg1-hash comparison in `common`) does with an empty `dg1Hash` — silent
   acceptance or late hard failure?

### Q2 — Authentication fallback chain (Android `ReadTask`)

1. **Q2.1 (suspected Major).** The BAC retry loop treats a successful unauthenticated `EF_COM`
   read as "BAC succeeded" without calling `doBAC`
   (`RNPassportReaderModule.kt:470-478`). Enumerate when `EF_COM` is readable without secure
   messaging (prior session residue? non-conformant chips?) and what happens to the subsequent
   DG1/SOD reads (`:550-564`) if no secure channel actually exists.
2. **Q2.2 (suspected Major).** `skipPACE` is accepted by the JS API
   (`nfcScanner.ts:96`, screen param `DocumentNFCScanScreen.tsx:363`) and forwarded through the app
   native-module wrapper (`passportReader.ts:100-113`), but the Android module defines no such param
   (companion object `:1065-1070`) and never reads it — a silent no-op on the platform the option
   was shipped to help. Verify the full JS → wrapper → native chain, including the original commit
   context (`450f1efaa`), and verify iOS does honor it (`PassportReader.swift:85`,
   `PassportReaderCore.swift:134`).
3. **Q2.3.** CAN path has no fallback: with `useCan` and PACE failing, `authKey` is a
   `PACEKeySpec`, the BAC branch (`:445`) is skipped, and the scan dies at `:513-514`
   (`"Authentication not established"`) — which `onPostExecute` then maps to
   `E_SCAN_FAILED_DISCONNECT: "Lost connection to chip on card"` because it is an `IOException`
   (`:815-817`). Confirm the misleading error mapping and what the user is told.
4. **Q2.4.** PACE loop edge cases (`:386-432`): zero `PACEInfo` entries (skip straight to BAC?),
   multiple OIDs with `oidsTried == paceInfoCount` throw inside the loop (`:428-430`), and the
   outer catch (`:433-441`) converting all of it to a BAC fallback. Document the actual state
   machine and any unreachable branches.

### Q3 — Timeouts and cancellation

1. **Q3.1 (suspected Major).** The 30s JS timeout (`DocumentNFCScanScreen.tsx:308-320` and
   `:325-345`) only flips `scanCancelledRef` and navigates to `RegistrationFallbackNFC` — it
   cancels **nothing native**. Trace what happens when the native scan completes after the
   timeout fired, on each platform: orphaned Android `scanPromise` resolution, iOS NFC sheet
   still up over the fallback screen, retry colliding with `E_ONE_REQ_AT_A_TIME`
   (`RNPassportReaderModule.kt:240-244`; mitigated only by `reset()` in `scanAndroid`,
   `nfcScanner.ts:75` — iOS has no reset).
2. **Q3.2 (suspected Low, confirm and bucket).** Lines `:304-320` and `:325-345` of
   `DocumentNFCScanScreen.tsx` are two near-identical timeout blocks; the first is cleared and
   replaced immediately by the second, and only the second tracks
   `NFC_SCAN_FAILED`/`setNfcScanningActive(false)`. Confirm the first block is dead copy-paste.
3. **Q3.3.** Document the full timeout hierarchy and its mismatches: JS 30s, Android
   `isoDep.timeout = 20000` (`RNPassportReaderModule.kt:329`), iOS system NFC session timeout
   (~20s, from `SelfNFCPassportReader`), and the SDK's `cfg.timeouts.scanMs` (Q4.3). Which one
   actually fires first on each platform?
4. **Q3.4.** Unmount/blur cleanup (`DocumentNFCScanScreen.tsx:565-585`) clears JS state but not
   native state. Establish whether a user backing out mid-scan can wedge the Android module
   (`scanPromise` non-null until `onHostDestroy`/`reset`) and what the next scan attempt does.

### Q4 — The duplicated SDK scan path

1. **Q4.1 (suspected Major).** `reactNativeScannerAdapter` references
   `NativeModules.SelfPassportReader` (`packages/mobile-sdk-alpha/src/adapters/react-native/nfc-scanner.ts:22`, `:104`),
   but no native module registers under that name in this repo — Android registers
   `RNPassportReader` (`RNPassportReaderModule.kt:189`), iOS registers `PassportReader`
   (`PassportReader.swift:20`). The adapter is wired live into the client
   (`factory.ts:75`, `selfClientProvider.tsx:109`). Determine whether any production code path
   reaches `selfClient.scanNFC` (`client.ts:113-122`): if yes, it throws
   `"PassportReader not found"` on a real user path; if no, the entire adapter is dead code that
   still drifts (see Q4.2). Either answer is a finding.
2. **Q4.2 (suspected Medium).** Diff the three parser implementations — app
   (`nfcScanner.ts:165-304`), SDK adapter (`nfc-scanner.ts:21-160`), SDK byte-level
   (`processing/nfc.ts:112`) — plus the app wrapper contract in `passportReader.ts` and the fourth
   partial copy in the committed `app/ios/main.jsbundle`.
   Known drift to verify: SDK iOS parser has no hex validation and crashes on absent
   `DG1.sodHash` (`nfc-scanner.ts:60`); SDK Android parser returns `dg2Hash` as a raw hex string
   where the app converts to `number[]` (`nfc-scanner.ts:130` vs `nfcScanner.ts:274-277`); SDK
   Android scan options omit `skipPACE`/`skipReselect`/`sessionId` (`nfc-scanner.ts:117-123`).
   Name the canonical owner the remediation should converge on (CLAUDE.md says SDK).
3. **Q4.3.** `client.ts:113-122` builds an `AbortController` for `cfg.timeouts.scanMs` and passes
   `signal` to the adapter — which never reads it. Confirm the SDK scan timeout is a no-op.

### Q5 — Response contract integrity (native → JS)

1. **Q5.1 (suspected Medium).** Android `onPostExecute` writes `documentSigningCertificate`
   twice — base64 at `RNPassportReaderModule.kt:857`, then full PEM **with** header/footer and
   newlines at `:909` — and the JS parser wraps it in `BEGIN/END CERTIFICATE` again
   (`nfcScanner.ts:278-281`), producing a double-wrapped PEM. Establish what downstream DSC
   parsing actually receives and why it tolerates this (or where it breaks).
2. **Q5.2.** The `AndroidScanResponse` type promises fields native never sends (`photo`,
   `passportReader.ts:26-28`) and native sends fields JS ignores (`modulus`, `publicKeyQ`,
   `signatureAlgorithm`, `RNPassportReaderModule.kt:848-881`). Map the real contract and flag the
   type lie.
3. **Q5.3.** The `documentType` heuristic `mrz.length === 88 ? 'passport' : 'id_card'` is
   copy-pasted in four places (`nfcScanner.ts:235`, `:289`; SDK `nfc-scanner.ts:81`, `:139`).
   Verify it against TD1/TD2/TD3 MRZ lengths and the document taxonomy in `common` — what does a
   TD2 document (72 chars) classify as?
4. **Q5.4.** iOS parser crash surfaces: `JSON.parse(String(documentSigningCertificate))` with the
   field absent throws `Unexpected token 'u'` (`nfcScanner.ts:213`); `serializeX509Wrapper`
   returning nil makes that reachable (`PassportReaderCore.swift:157-159`). Enumerate which
   absent/odd fields produce which user-facing error.

### Q6 — Native event channel and platform asymmetry

1. **Q6.1 (suspected Low).** Scan-progress UX is driven by matching literal strings emitted from
   Kotlin (`Messages`, `RNPassportReaderModule.kt:122-144`) against hardcoded comparisons in the
   screen (`DocumentNFCScanScreen.tsx:534-562`) — a stringly cross-language contract with no
   shared constant. Confirm, and note that the emitter is Android-only
   (`DocumentNFCScanScreen.tsx:93-96`): iOS users get no progress haptics/messages. Document the
   asymmetry.
2. **Q6.2.** `eventMessageEmitter` drops events when there is no active catalyst instance
   (`RNPassportReaderModule.kt:954-962`). Determine whether mid-scan backgrounding loses terminal
   events the screen depends on.

### Q7 — Production reachability of dev/test surfaces

1. **Q7.1 (suspected Medium).** A 5-tap gesture on the scan screen opens
   `DocumentNFCMethodSelection` (`DocumentNFCScanScreen.tsx:194-198`) with no `__DEV__` gate
   found in recon. That screen exposes `skipPACE`/`skipCA`/`extendedMode`/CAN toggles. Confirm
   whether it ships reachable in release builds and what the worst user-reachable configuration
   does (e.g., `skipCA` weakening chip auth).
2. **Q7.2.** `useErrorInjection`/`errorInjectionStore` gate the injected NFC failures
   (`DocumentNFCScanScreen.tsx:349-358`) — recon found no `__DEV__` gate in either file. Confirm
   how injection is armed and whether release builds can reach it.

### Q8 — Existing-coverage characterization

1. **Q8.1.** For the eight existing test files in the inventory, record what each actually
   asserts versus mock wiring, and map every Q1–Q7 question to
   `covered / partially covered / uncovered`. This table anchors the report's test-gap
   acceptance criteria and feeds AUD-04.
2. **Q8.2.** The app wrapper test (`app/tests/src/integrations/nfc/passportReader.test.ts`) and SDK
   adapter tests (`packages/mobile-sdk-alpha/tests/adapters/reactNative/nfcScanner.test.ts`) cover
   different native-module names and method shapes. Note what each pins and whether either would
   have caught the `SelfPassportReader` name mismatch from Q4.1.
3. **Q8.3.** Record AUD-06 pointers without pursuing: the `app/android/android-passport-nfc-reader/`
   vendored example app, the committed `app/ios/main.jsbundle`, and the dead `Response`/`Foo`
   classes plus ~150 commented-out lines in `RNPassportReaderModule.kt` (`:146-156`, `:566-617`).

## Method

1. Work the questions in order Q1 → Q2 → Q4 → Q3 → Q5 → Q7 → Q6 → Q8 (highest candidate severity
   first, so the time box truncates the tail, not the head).
2. For each question: trace the full call path with `path:line` citations, then classify per the
   workstream severity rubric. Suspected severities above are priors, not conclusions.
3. Reproduce every confirmed Critical/Major that is testable from JS as a characterization test
   pinning **current** behavior. App-side tests extend
   `app/tests/src/integrations/nfc/nfcScanner.test.ts`,
   `app/tests/src/integrations/nfc/passportReader.test.ts`, or add files under
   `app/tests/src/integrations/nfc/`; SDK-side tests extend
   `packages/mobile-sdk-alpha/tests/adapters/reactNative/nfcScanner.test.ts`. Name tests so the
   linked finding is obvious (`describe('AUD-01 Q4.2: SDK android parser returns dg2Hash as string', ...)`).
4. App Jest constraints (hard requirements, they prevent CI OOM): no nested
   `require('react-native')` or `require('react')` inside `jest.mock` factories — use hoisted
   imports and the existing mock aliases; keep app tests under `app/tests/` so
   `app/scripts/check-test-requires.cjs` covers them; mock native modules at the module boundary
   via `moduleNameMapper`/existing setup mocks rather than ad-hoc factories.
5. SDK tests run under Vitest, not Jest. Do not add Jest-only APIs to `packages/mobile-sdk-alpha`
   tests unless existing setup already provides them; use the package's `tests/setup.ts` patterns.
6. Native-source questions (Q1, Q2, Q3.3, Q5.1, Q6) are answered by reading the vendored Kotlin
   and Swift source — not by speculation. Kotlin behavior that cannot be pinned by a JS test gets
   a documented end-to-end trace plus, where warranted, a named manual-test procedure (device,
   document type, steps, expected vs. observed) in the report — not a guess.
7. A confirmed Critical security finding (e.g., Q7.1 turning out to expose an auth-weakening
   toggle in release) triggers the workstream fast-path immediately: confidential Linear issue
   with full detail the same day; the report carries a redacted reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-nfc-chip-reading-audit.md` with the
   workstream's required sections: header block, summary, severity-bucketed findings with
   per-finding acceptance criteria, `Needs investigation` leads with dispositions, follow-up
   issues grouped into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification
   log, what works well, validation.
2. **Characterization tests** — merged in the audit PR, one per confirmed Critical/Major finding
   that is JS-testable; documented manual-test procedures for native-only findings.
3. **Coverage map** (Q8.1 table) — included in the report; copied to AUD-04's plan when that
   audit is scoped.
4. **Parser-convergence input** — the Q4.2 diff table, as the seed for the remediation spec that
   names the canonical parser owner.

## Files you will NOT modify

- Anything under `app/src/`, `app/android/`, `app/ios/`, or `packages/mobile-sdk-alpha/src/` —
  the audit is read-only.
- `patches/`, `app/jest.config.cjs`, `app/jest.setup.js` — if a new test genuinely needs a mock
  the setup lacks, add a scoped mock file under `app/tests/__setup__/mocks/` instead.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-01 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd app
yarn jest:run tests/src/integrations/nfc tests/src/screens/documents/scanning tests/src/stores/nfcTroubleStore.test.ts
yarn types
node scripts/check-test-requires.cjs

cd ../packages/mobile-sdk-alpha
yarn test tests/adapters/reactNative/nfcScanner.test.ts tests/processing/nfc.test.ts
yarn types
```

All must pass with the new characterization tests in place. The report's Validation section
records these commands and their output.

## Definition of done

1. Every Q1–Q8 sub-question answered with citations, or explicitly moved to
   `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections.
3. Characterization tests merged and green for every confirmed Critical/Major JS-testable
   finding; named manual-test procedures documented for native-only Critical/Major findings.
4. Any confirmed Critical security finding fast-pathed at discovery (confidential issue exists,
   report redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-01 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md`.

## Status log

- 2026-06-11 — Plan pre-drafted from reconnaissance of the full file inventory (app TS, SDK TS,
  Kotlin, Swift all read at cited lines). Drafted before AUD-02 execution per the workstream's
  sequential pre-drafting rule; requires recon refresh + owner re-review at activation. Lesson
  carried from AUD-02 review: backup/restore-style ingress call sites included as trace-only
  rows from the start, and the SPEC.md no-modify rule carries the backlog-row exception.
- 2026-06-11 — Review pass tightened the activation plan: added the missing `passportReader.test.ts`
  inventory/coverage target, made the app wrapper contract explicit in Q2/Q4, separated app Jest
  constraints from SDK Vitest constraints, and expanded validation commands so working directories
  are unambiguous.
