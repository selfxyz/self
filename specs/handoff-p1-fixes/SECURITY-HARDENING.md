# SDK Security Hardening — Follow-up Spec

> Last updated: 2026-02-25
> Source: Bot review feedback on PR #1785 (kmp-wrap-up-evi-handoff-work)
> Status: Pending

## Status Checklist

| Chunk | Description | Priority | Status |
|-------|-------------|----------|--------|
| 1 | APDU command allowlisting | High | Not started |
| 2 | NFC transceive timeout (iOS) | Medium | Not started |
| 3 | Redact sensitive data from error messages | Medium | Not started |
| 4 | LifecycleBridgeHandler type+error handling | Low | Not started |
| 5 | NFC return payload — minimize PII surface | Low | Not started |
| 6 | Person 4 crypto tracking | Low | Not started |

## Context

PR #1785 wraps up the KMP/EVI handoff work. Automated reviewers (CodeRabbit, Codex) flagged several security hardening items. The quick fixes were already addressed in the PR's feedback commits. This spec tracks the remaining items that need follow-up work.

## Chunks

### Chunk 1: APDU Command Allowlisting

**Priority:** High
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`, `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/handlers/NfcBridgeHandler.kt`

`params.apduCommands` from the WebView layer is forwarded directly to `NfcManager.transceive()` with no validation. A compromised or malicious WebView payload could issue arbitrary APDUs against any NFC-capable card in range (payment cards, access cards — not just passports).

**Required work:**
- Define an allowlist of valid APDU command prefixes for eMRTD reading (SELECT, READ BINARY, GET CHALLENGE, EXTERNAL AUTHENTICATE, etc.)
- Reject commands that don't match the allowlist before calling `transceive()`
- Apply the same validation in both RN and KMP handlers
- Add tests for rejected commands

### Chunk 2: NFC Transceive Timeout (iOS)

**Priority:** Medium
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

`react-native-nfc-manager` has no per-call timeout for `transceive()`. On iOS, a stuck chip or broken connection can hang the scan indefinitely with no way to recover.

**Required work:**
- Wrap `transceive()` calls in a `Promise.race` with a configurable timeout (e.g., 10s per command)
- On timeout, throw `NFC_TIMEOUT` error and clean up the NFC session
- On Android, investigate using `NfcManager.setTimeout()` for native-level timeout
- Add tests for timeout behavior

### Chunk 3: Redact Sensitive Data from Error Messages

**Priority:** Medium
**Files:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

Line 34 includes the raw hex command in the error message: `Invalid APDU hex command: ${hexCommand}`. For passport-reading flows, APDU command bytes can encode key-derivation material from MRZ data. Any upstream `catch` that logs `err.message` would leak that material.

**Required work:**
- Replace `${hexCommand}` with a truncated/masked version (e.g., first 4 chars + `...`) or remove it entirely
- Audit other error paths in NFC/Camera handlers for similar PII leakage

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
- Add data-handling guidance to HANDOFF.md for `tagId` and `apduResponses`
- Also fix HANDOFF.md line 95 which shows `params: {...}` in the NFC return shape but the code no longer returns params

### Chunk 6: Person 4 Crypto Tracking

**Priority:** Low
**Files:** `specs/person4-sdk-core/`

The Person 4 workstream has pending crypto work. In a zero-knowledge/passport-verification SDK, partially-wired crypto paths can degrade security guarantees. This needs a tracking issue or explicit deferral decision.

**Required work:**
- Review current Person 4 crypto status
- Open a tracked issue if work is outstanding, or add an explicit note that it's deferred

## Validation

For chunks 1-3 and 5:
```bash
cd packages/rn-sdk && npx vitest run
```

For chunk 4:
```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
```

## Definition of Done

- [ ] Chunk 1: APDU allowlist implemented and tested in both RN and KMP
- [ ] Chunk 2: Transceive timeout implemented and tested
- [ ] Chunk 3: Sensitive data redacted from all NFC/Camera error messages
- [ ] Chunk 4: LifecycleBridgeHandler type+error behavior decided and documented
- [ ] Chunk 5: NFC return payload minimized, HANDOFF.md updated
- [ ] Chunk 6: Person 4 crypto tracked or explicitly deferred
