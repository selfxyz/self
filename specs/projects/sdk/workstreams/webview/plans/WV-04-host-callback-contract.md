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
- 2026-03-12: Tightened `targetOrigin` parsing so URL-supplied `*` is rejected outside development, closing a production browser-host origin bypass.
