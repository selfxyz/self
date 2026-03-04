# CodeRabbit Review — PR #1807 (Proving Machine Refactor)

> Source: https://github.com/selfxyz/self/pull/1807
> Reviewer: coderabbit.ai (automated)
> Date: 2026-03-03
> Total actionable comments: 13 (1 critical, 10 major, 2 plan-level)

---

## Critical

### 1. `initTeeConnection()` hangs forever when actor is missing

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/teeConnectionHandler.ts:116`
- **Issue:** The `if (!actor) { return; }` branch exits the Promise executor without calling `resolve` or `reject`. Callers wait indefinitely.
- **Fix:** Move the actor check before the `new Promise()` constructor. Return `false` early and log the error.

```diff
-  return new Promise(resolve => {
-    ...
-    if (!actor) {
-      return;
-    }
+  if (!actor) {
+    selfClient.logProofEvent('error', 'State machine actor missing', baseContext, {
+      failure: 'PROOF_FAILED_CONNECTION',
+      duration_ms: Date.now() - startTime,
+    });
+    return false;
+  }
+
+  return new Promise(resolve => {
+    const ws = new WebSocket(wsRpcUrl);
```

---

## Major — Safety / Correctness

### 2. Reset reconnect/session plumbing during `init`

- **File:** `packages/mobile-sdk-alpha/src/proving/provingMachine.ts:160-174` (outside diff)
- **Issue:** `init` resets core fields but leaves `wsReconnectAttempts` and `wsHandlers` untouched. A new proving session can inherit old reconnect state and prematurely exhaust retries.
- **Fix:** Add `wsHandlers: null`, `wsReconnectAttempts: 0`, `error_code: null`, `reason: null` to the `set({...})` call in the init block.

### 3. Add rejection handling for transition-triggered async tasks

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/actorSubscriptions.ts:72-92`
- **Issue:** Promise-returning handlers (`parseIDDocument`, `startFetchingData`, `validatingDocument`, `initTeeConnection`, `startProving`) are fire-and-forget. Unhandled rejections can stall the proving flow.
- **Fix:** Wrap each call with `.catch()` that logs the error and optionally transitions the actor to a failure state.

```ts
const runTask = (task: Promise<unknown>) => {
  void task.catch(error => {
    selfClient.logProofEvent('error', 'State handler failed', context, {
      failure: 'PROOF_FAILED_INTERNAL',
      error: error instanceof Error ? error.message : String(error),
    });
  });
};
```

### 4. Redact identifiers in proof context before logging

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/helpers.ts:27-33`
- **Issue:** `sessionId` (from `provingState.uuid`) and `userId` are passed raw through `createProofContext`, which feeds into proof logging/events.
- **Fix:** Add a `maskIdentifier()` helper and apply it to `sessionId` and `userId` fields before emitting.

### 5. Validate `circuitType` before use instead of force-casting

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/teeConnectionHandler.ts:50`
- **Issue:** `get().circuitType as 'disclose' | 'register' | 'dsc'` masks `null` at runtime. Downstream circuit resolution can fail without a controlled actor transition.
- **Fix:** Check for null/undefined and send `CONNECT_ERROR` instead of casting.

### 6. Handle Socket.IO disconnect in `proving` state too

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/socketIOListener.ts:63-70`
- **Issue:** Disconnect handler only sends `PROVE_ERROR` when state is `ready_to_prove`. A disconnect during `proving` leaves the actor stuck without a terminal transition.
- **Fix:** Extend the condition to also check `get().currentState === 'proving'`.

```diff
-    if (get().currentState === 'ready_to_prove' && currentActor) {
+    if (
+      currentActor &&
+      (get().currentState === 'ready_to_prove' || get().currentState === 'proving')
+    ) {
```

### 7. Incomplete type cast in payload generator excludes `'disclose'`

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/payloadGenerator.ts:125,188`
- **Issue:** Force cast at line 188 to `'register_id' | 'dsc_id' | 'register' | 'dsc'` excludes `'disclose'`, yet line 70 assigns `circuitTypeWithDocumentExtension = 'disclose'`. This bypasses compile-time validation.
- **Fix:** Derive the payload circuit type from the function signature or create a proper union type that includes `'disclose'`.

### 8. Do not gate PCR0 attestation checks with bare `debug` boolean

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/websocketHandlers.ts:84-88`
- **Issue:** Line 84 allows enclave-image allowlist bypass whenever debug mode is true. Trust verification should require a short-lived debug token gate, not just a boolean.
- **Fix:** Require both `debug` flag AND a `debugSecretsToken` for attestation bypass.

```diff
-  if (!(selfClient?.config?.debug ?? false) && !pcr0Mapping) {
+  const allowAttestationBypass = Boolean(
+    selfClient?.config?.debug && selfClient?.config?.debugSecretsToken,
+  );
+  if (!allowAttestationBypass && !pcr0Mapping) {
```

- **Note:** Evaluate whether a `debugSecretsToken` concept already exists or needs to be added.

### 9. Stop emitting raw UUID/session identifiers in logs

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/websocketHandlers.ts:127-132,296-301`
- **Issue:** Raw UUID values logged in `logProofEvent` and `console.warn` calls. These are session identifiers that should be masked.
- **Fix:** Add a `maskSessionId()` helper and apply to all UUID values before logging/tracking.

### 10. Clean up timed-out reconnect sockets

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/websocketHandlers.ts:347-373`
- **Issue:** On reconnect timeout, the code resolves `false` but leaves the WebSocket and listeners active. If it opens later, stale state and duplicate event handling can occur.
- **Fix:** Add a `settled` flag + `finalize()` wrapper. On timeout: remove all event listeners, close the socket, null out state.

### 11. Guard protocol-state lookup to avoid hard crash

- **File:** `packages/mobile-sdk-alpha/src/proving/internal/websocketUrlResolver.ts:38-41`
- **Issue:** `getProtocolState()[documentCategory]` can throw if the key is absent, bypassing the intended `undefined` fallback.
- **Fix:** Use optional chaining: `selfClient.getProtocolState()?.[documentCategory]?.circuits_dns_mapping`.

---

## Plan-Level Feedback

### 12. Don't defer backward-compatible export alias to follow-up PR

- **File:** `app/PLAN-proving-machine-refactor-merge.md:85-95`
- **Issue:** The plan knowingly ships a public API break first and fixes it later. The deprecated alias should be included in the extraction PR.
- **Action:** Include the `provingMachineCircuitType` backward-compatible alias in the refactor PR itself, not a follow-up.

### 13. Add proof-generation performance gate to Validation/DoD

- **File:** `app/PLAN-proving-machine-refactor-merge.md:154-171`
- **Issue:** Tooling checks (types, lint, tests) alone won't catch runtime latency regressions. The DoD should include a measurable perf criterion.
- **Action:** Add a requirement like "proof generation < 60s on mid-tier mobile device" to the validation checklist.

---

## Triage Summary

| Priority | Items                                                                                                                             | Recommendation                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Critical | #1 (promise hang)                                                                                                                 | Fix immediately — can cause permanent UI hang   |
| High     | #2 (stale reconnect state), #3 (unhandled rejections), #6 (disconnect in proving), #10 (stale sockets)                            | Fix in safety PR — these can cause stuck states |
| Medium   | #4 (PII redaction), #5 (circuitType null), #7 (type cast), #8 (debug attestation bypass), #9 (UUID logging), #11 (protocol crash) | Fix in safety PR — defensive hardening          |
| Plan     | #12 (API alias), #13 (perf gate)                                                                                                  | Address in current PR or plan update            |

### Suggested Implementation Order

1. **#1** — Promise hang (critical, isolated fix)
2. **#2 + #10** — Reconnect state cleanup (related)
3. **#3 + #6** — Error handling in state transitions + disconnect (related)
4. **#5 + #7 + #11** — Type safety / null guards (related pattern)
5. **#4 + #9** — Identifier redaction (related pattern)
6. **#8** — Debug attestation hardening (requires design decision on token system)
7. **#12 + #13** — Plan updates (non-code)
