# Host Callback Contract

> Last updated: 2026-03-11
> Status: Complete

- Workstream: webview
- Backlog IDs: WV-04
- Owner: WebView / Product Platform
- Branch: `justin/kmp-wv-04`
- PR: n/a

### Why

- The active WebView flow still assumes a native lifecycle responder for terminal callbacks, which breaks browser, iframe, and popup embedding.
- Hosts need a single contract for ready, result, and dismiss that works the same across native containers and pure browser embedding.
- `WV-04` must stay additive so existing RN/KMP transports keep working unchanged.

### Scope

- Add a browser host transport fallback in `packages/webview-bridge` that uses `window.parent.postMessage` for iframes and `window.opener.postMessage` for popups when no native transport exists.
- Define the host message envelope for `self:ready`, `self:result`, and `self:dismiss`, and make `lifecycle.setResult()` non-blocking in browser mode.
- Update `packages/webview-app` to send full `VerificationResult` payloads plus dismiss signals from terminal and cancel paths.
- Document the host callback contract in the active WebView spec and mark `WV-04` complete.

### Out of Scope

- Real KYC provider SDK integration or replacing the provider placeholder screen
- New native bridge handlers, native modules, or mobile SDK export changes
- Changes under `specs/projects/sdk/paused/**`, `packages/kmp-sdk/**`, or `packages/mobile-sdk-alpha/**`

### Files to Modify

- `specs/projects/sdk/workstreams/webview/plans/WV-04-host-callback-contract.md`
- `specs/projects/sdk/workstreams/webview/SPEC.md`
- `packages/webview-bridge/src/bridge.ts`
- `packages/webview-bridge/src/types.ts`
- `packages/webview-bridge/src/adapters/lifecycle.ts`
- `packages/webview-bridge/src/__tests__/bridge.test.ts`
- `packages/webview-bridge/src/__tests__/adapters.test.ts`
- `packages/webview-app/src/providers/VerificationRequestProvider.tsx`
- `packages/webview-app/src/providers/BridgeProvider.tsx`
- `packages/webview-app/src/screens/proving/ProvingScreen.tsx`
- `packages/webview-app/src/screens/proving/VerificationResultScreen.tsx`
- `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx`
- `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx`

### Files Not to Modify

- `packages/mobile-sdk-alpha/**`
- `packages/kmp-sdk/**`
- `specs/projects/sdk/paused/**`
- `noir/**`

### Preconditions

- `WV-02` remains the source of truth for provider launch/result normalization before any host callback.
- Existing native transports for Android KMP, iOS KMP, and RN WebView must remain the first-choice bridge path when present.

### Implementation Notes

- Keep the browser transport behind native transport detection. If a native transport exists, lifecycle behavior must stay unchanged.
- Use a small host envelope:

```ts
type SelfHostMessage = {
  type: 'self:ready' | 'self:result' | 'self:dismiss';
  version: 1;
  payload: Record<string, unknown>;
};
```

- Read `verificationId` and optional `targetOrigin` from the launch URL so browser embedding can correlate sessions and limit `postMessage` origin in production.
- Let browser-mode `lifecycle.setResult()` resolve immediately after posting the message instead of waiting for a response that will never arrive.

### Validation

```bash
cd packages/webview-bridge && yarn build && yarn test
cd packages/webview-app && yarn build
cd packages/mobile-sdk-alpha && yarn test && yarn types
rg -n "lifecycle\\.(setResult|dismiss|ready)" packages/webview-app/src/
```

### Definition of Done

- [x] Browser host transport added and used only when no native transport exists
- [x] Host envelope type defined for `self:ready`, `self:result`, and `self:dismiss`
- [x] Browser-mode `setResult()` no longer times out
- [x] Terminal and cancel flows in `webview-app` call `lifecycle.setResult()` or `lifecycle.dismiss()`
- [x] WebView spec documents the host callback contract and marks `WV-04` done
- [x] Validation passes
- [x] Plan status updated
- [x] PR marked n/a for local execution handoff

### Status Log

- 2026-03-11: Started plan for WebView/browser host callbacks and terminal lifecycle wiring.
- 2026-03-11: Implemented browser host fallback transport, typed lifecycle payloads, screen wiring, and spec updates. Validation passed for `webview-bridge`, `webview-app`, and `mobile-sdk-alpha`.

1. **Browser fallback, not browser fork.** Add the minimal transport-layer behavior needed for iframes/popups without changing native message semantics.
2. **Terminal callbacks are explicit.** Every verification success, failure, or user abandonment path must emit a host-visible lifecycle signal.
3. **Use existing result shapes.** Reuse `VerificationResult` instead of introducing a second terminal payload schema.

### Definition of Done

> **Done when:** the WebView flow can be embedded without native modules, hosts receive `self:ready`, `self:result`, and `self:dismiss` via `postMessage` in browser mode, native transports keep their current behavior, and all requested validation commands pass.

### Scope of Work

#### 1. Browser Host Transport

**`packages/webview-bridge/src/bridge.ts`**

- Detect a browser host target after Android KMP, iOS KMP, and RN WebView checks fail.
- Wrap lifecycle messages in the host envelope and post them to `window.parent` or `window.opener`.
- Listen for `self:cancel` from the host and expose it as a bridge lifecycle event if the implementation stays small.

##### Input / Output

**Input:**

```ts
bridge.fire('lifecycle', 'ready', { verificationId: 'verif-123' });
```

**Expected Output:**

```json
{
  "type": "self:ready",
  "version": 1,
  "payload": { "verificationId": "verif-123" }
}
```

**Edge case — browser with no embedder:**

```text
Input:  bridge.fire('lifecycle', 'ready', {})
Output: no throw; message is dropped after detection finds no parent/opener host
```

---

#### 2. Terminal Result Wiring

**`packages/webview-app/src/screens/proving/ProvingScreen.tsx`**
**`packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx`**
**`packages/webview-app/src/screens/proving/VerificationResultScreen.tsx`**

- Build the full `VerificationResult` payload from request context.
- Send dismiss signals from explicit cancel/close/continue actions.
- Avoid double-sending terminal results by treating the result screen continue action as teardown only.

##### Input / Output

**Input:**

```text
URL: ?userId=u-1&verificationId=v-1&resultType=proofRequested
Action: user taps Verify
```

**Expected Output:**

```json
{
  "type": "self:result",
  "version": 1,
  "payload": {
    "success": true,
    "userId": "u-1",
    "verificationId": "v-1"
  }
}
```

**Edge case — user cancels from the proving screen:**

```text
Input:  user taps close on /proving
Output: self:dismiss with reason user_cancel, then UI navigates away
```

### Files You Will Modify

| File | Change | Risk |
| --- | --- | --- |
| `packages/webview-bridge/src/bridge.ts` | Add browser transport fallback and optional inbound host message handling | **Medium** — bridge behavior must not regress native paths |
| `packages/webview-bridge/src/types.ts` | Add host message types and browser transport options | **Low** — additive type changes |
| `packages/webview-bridge/src/adapters/lifecycle.ts` | Tighten result typing and dismiss payload support if needed | **Low** — small adapter surface |
| `packages/webview-app/src/providers/VerificationRequestProvider.tsx` | Parse `verificationId` and `targetOrigin` from URL params | **Low** — request context expansion |
| `packages/webview-app/src/providers/BridgeProvider.tsx` | Pass browser host options into the bridge | **Low** — constructor-only change |
| `packages/webview-app/src/screens/proving/ProvingScreen.tsx` | Send full result payload and dismiss on cancel | **Medium** — terminal flow wiring |
| `packages/webview-app/src/screens/proving/VerificationResultScreen.tsx` | Signal teardown on continue | **Low** — simple callback change |
| `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx` | Signal dismiss on back and provider start observability | **Low** — placeholder screen |
| `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx` | Send full result payload | **Low** — terminal flow wiring |
| `specs/projects/sdk/workstreams/webview/SPEC.md` | Add host callback contract and mark WV-04 done | **Low** — doc alignment |

### Files You Will NOT Modify

| File | Why |
| --- | --- |
| `packages/mobile-sdk-alpha/**` | Out of scope; this task only consumes existing verification result semantics |
| `packages/kmp-sdk/**` | Paused workstream |
| `specs/projects/sdk/paused/**` | Paused specs must remain untouched |

### Completion Status

| Chunk | Description | Size | Status |
| --- | --- | --- | --- |
| WV-04A | Browser host transport and envelope types | S | Done |
| WV-04B | WebView app lifecycle/result wiring | S | Done |
| WV-04C | Spec updates and validation | S | Done |
