# SDK Security Hardening — Follow-up Spec

> Last updated: 2026-03-01
> Source: Bot review feedback on PR #1785 (kmp-wrap-up-evi-handoff-work)
> Status: Ready for handoff (follow-ups tracked)

## Status Checklist

| Chunk | Description                                | Priority | Status      |
| ----- | ------------------------------------------ | -------- | ----------- |
| 1     | APDU command allowlisting                  | High     | Done        |
| 2     | NFC transceive timeout (iOS)               | Medium   | Done        |
| 3     | Redact sensitive data from error messages  | Medium   | Done        |
| 4     | LifecycleBridgeHandler type+error handling | Low      | Not started |
| 5     | NFC return payload — minimize PII surface  | Low      | In progress |
| 6     | Person 4 crypto tracking                   | Low      | Not started |

## Context

PR #1785 wraps up the KMP/EVI handoff work. Automated reviewers (CodeRabbit, Codex) flagged several security hardening items. The quick fixes were already addressed in the PR's feedback commits. This spec tracks the remaining items that need follow-up work.

## Chunks

### Chunk 1: APDU Command Allowlisting ✅

**Priority:** High
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

`params.apduCommands` from the WebView layer is forwarded directly to `NfcManager.transceive()` with no validation. A compromised or malicious WebView payload could issue arbitrary APDUs against any NFC-capable card in range (payment cards, access cards — not just passports).

**Note:** Only the RN SDK is affected. The KMP Android handler uses JMRTD which generates all APDUs internally (no raw APDU input from WebView). The KMP iOS handler delegates to NFCPassportReader via Swift providers (also no raw APDU input).

**Completed:**

- Defined allowlist of valid CLA bytes (`0x00`, `0x0C`, `0x10`) and INS bytes (`0xA4`, `0xB0`, `0xB1`, `0x84`, `0x82`, `0x86`, `0x22`, `0xCA`, `0xCB`) for eMRTD reading
- Added APDU shape checks (short APDU length consistency plus command-specific `P1/P2/Lc` constraints for `A4/B0/B1/84/82/86/22/CA/CB`)
- Added tests for allowlist and rejection paths (validator + integration behavior)

### Chunk 2: NFC Transceive Timeout (iOS) ✅

**Priority:** Medium
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

`react-native-nfc-manager` has no per-call timeout for `transceive()`. On iOS, a stuck chip or broken connection can hang the scan indefinitely with no way to recover.

**Completed:**

- Wrapped per-command `transceive()` calls with a timeout guard (`DEFAULT_APDU_TIMEOUT_MS = 10_000`)
- Added configurable timeout option (`apduTimeoutMs`) on `NfcHandler`
- On timeout, throws `NFC_APDU_TIMEOUT` and performs standard scan cleanup (`cancelTechnologyRequest()` in `finally`)
- Added tests for timeout behavior

### Chunk 3: Redact Sensitive Data from Error Messages ✅

**Priority:** Medium
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

Earlier code included raw APDU command bytes in parse errors. For passport-reading flows, APDU command bytes can encode key-derivation material from MRZ data. Any upstream `catch` that logs `err.message` could leak that material.

**Completed:**

- Removed raw APDU hex from parse errors (`Invalid APDU hex command format`)
- Replaced generic NFC exception passthrough with redacted fallback (`NFC scan failed`) for non-bridge errors
- Added safe APDU failure details counters (`acceptedCount`, `rejectedCount`, `timedOutCount`) without command bytes

### Chunk 4: LifecycleBridgeHandler — Type + Error Handling

**Priority:** Low
**Files:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`

When `type != null` (line 84-89), the handler unconditionally creates `VerificationResult(success = true, type = type)` and ignores `success`, `errorCode`, and `errorMessage` params. The current comment says this is intentional ("flat lifecycle payload is a protocol-level success signal"), but if a future caller sends `{ type: "error", success: false, errorCode: "..." }`, error fields would be silently dropped.

**Required work:**

- Decide if `type` should always imply success, or if type+error combinations are valid
- If type-only is intentional, add a brief comment or assertion making this explicit
- If type+error is valid, update the branching logic to respect `success` when `type` is present

### Chunk 5: NFC Return Payload — Minimize PII Surface

**Priority:** Low
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`, `packages/rn-sdk/HANDOFF.md`

The NFC scan returns `tagId` (passport chip UID — a unique persistent identifier, PII under GDPR) and `apduResponses` in hex (can encode raw Data Groups: MRZ text, face image, fingerprints). These pass back to the WebView and risk being logged or persisted inadvertently.

**Required work:**

- Evaluate whether `tagId` is needed by the WebView layer; if not, stop returning it
- Decide whether `apduResponses` should be returned in full, minimized, or gated behind a debug/explicit opt-in flag

**Completed in this PR:**

- Updated `packages/rn-sdk/HANDOFF.md` NFC response docs to remove stale `params: {...}` and document APDU error contract

### Chunk 6: Person 4 Crypto Tracking

**Priority:** Low
**Files:** `specs/projects/sdk/workstreams/sdk-core/`

The Person 4 workstream has pending crypto work. In a zero-knowledge/passport-verification SDK, partially-wired crypto paths can degrade security guarantees. This needs a tracking issue or explicit deferral decision.

**Required work:**

- Review current Person 4 crypto status
- Open a tracked issue if work is outstanding, or add an explicit note that it's deferred

## Validation

For chunks 1-3 and 5:

```bash
yarn workspace @selfxyz/rn-sdk test
yarn workspace @selfxyz/rn-sdk typecheck
yarn workspace @selfxyz/rn-sdk build
```

For chunk 4:

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
```

## Definition of Done

- [x] Chunk 1: APDU allowlist implemented and tested in RN (KMP not affected — uses JMRTD/NFCPassportReader internally)
- [x] Chunk 2: Transceive timeout implemented and tested
- [x] Chunk 3: Sensitive data redacted from NFC error messages (raw APDU/native error messages removed from bridge responses)
- [ ] Chunk 4: LifecycleBridgeHandler type+error behavior decided and documented
- [ ] Chunk 5: NFC return payload minimized, HANDOFF.md updated
- [ ] Chunk 6: Person 4 crypto tracked or explicitly deferred

## Handoff Notes (Next PR)

1. **Chunk 5 decision (API-impacting):** Decide whether `tagId` should be removed from bridge responses by default.
2. **Chunk 5 decision (data volume/privacy):** Decide policy for `apduResponses` (full return vs minimized/redacted vs explicit opt-in).
3. **Chunk 4/6 tracking:** Keep as separate follow-up items to avoid blocking RN SDK hardening merge.
