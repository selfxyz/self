# WV-17: Recovery Phrase Restore Flow for WebView and Tunnel

> Last updated: 2026-04-01
> Status: Ready
> Priority: High
> Depends on: WV-07 (Done), WV-08 (Ready)

- Workstream: webview
- Backlog ID: WV-17
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The webview app now has the route wiring for recovery:

- `packages/webview-app/src/screens/tunnel/TunnelRecoveryRequiredScreen.tsx`
  can send the user into `/recovery/phrase-input`
- `packages/webview-app/src/screens/recovery/SecretPhraseInputScreen.tsx`
  validates mnemonic shape
- `packages/webview-app/src/screens/recovery/RecoverySuccessScreen.tsx`
  can resume the caller route through `returnTo`

But the current webview recovery flow is still UI-only. `SecretPhraseInputScreen`
accepts any valid BIP39 phrase and navigates straight to success. It does **not**
restore the secret, validate that the phrase matches the selected document, or
mark the current document as registered.

This breaks the tunnel `account_recovery_choice` branch. The user can enter a
syntactically valid phrase, return to `/tunnel/proof/generating`, and hit the
same recovery interruption again because nothing real changed.

The native app has recovery logic in `app/src/screens/account/recovery/`
and `app/src/providers/authProvider.tsx`, but that implementation is not the
right dependency for webview:

- it lives under `app/`
- it assumes app-owned providers
- parts of it are passport-centric and lag the proving machine’s current
  `kyc` / `aadhaar` handling

You are implementing the real **phrase-based** recovery flow for webview using
shared SDK/browser-safe logic. You are **not** porting the app providers into
`packages/webview-app`.

## Scope

### In scope

- phrase-based account recovery in `packages/webview-app`
- tunnel `account_recovery_choice` resume after successful phrase recovery
- selected-document validation before secure-storage mutation
- shared browser-safe helper(s) in `packages/mobile-sdk-alpha` for recovery
  validation/finalization
- regression tests for recovery success and failure behavior

### Out of scope

- cloud backup restore
- Apple / Google / social login recovery
- importing `app/src/providers/authProvider.tsx` or
  `app/src/providers/passportDataProvider.tsx` into webview packages
- general Vite warning cleanup (`crypto` externalization, `lottie-web` eval,
  large chunk warnings)
- RN app recovery screen refactors

## Current State

### What already exists

- `packages/webview-app/src/utils/secretManager.ts`
  - derives a private key from a mnemonic
  - persists `self_mnemonic` and `self_private_key` through
    `bridgeStorageAdapter`
- `packages/mobile-sdk-alpha/src/documents/utils.ts`
  - exports `markCurrentDocumentAsRegistered(selfClient)`
  - exports `reStorePassportDataWithRightCSCA(selfClient, document, csca)`
- `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`
  - contains the current source-of-truth registration validation logic:
    `isUserRegisteredWithAlternativeCSCA(...)`
  - already handles `kyc` and `aadhaar` by using `public_keys` rather than the
    older app-only fallback

### What is broken

- `packages/webview-app/src/screens/recovery/SecretPhraseInputScreen.tsx`
  only validates word count / BIP39 format and always navigates to success on a
  valid phrase
- the tunnel flow can resume after recovery success even when the restored
  phrase does not match the selected document
- a wrong phrase could overwrite the current secret if we naïvely port the app
  implementation order

## Design Decisions

### 1. Validate before writing secure storage

Do **not** persist the mnemonic or derived private key until the selected
document has been validated against the candidate secret.

This is the most important design decision in the spec.

The native app currently restores the mnemonic first and validates the document
afterward. For webview, that ordering is too risky because a wrong phrase could
overwrite the existing secure secret and strand the session.

Required order:

1. validate mnemonic syntax
2. derive candidate private key from the phrase
3. load the selected document from `selfClient`
4. validate that document against the candidate secret using shared SDK logic
5. only after validation succeeds, persist `self_mnemonic` and
   `self_private_key`
6. reconcile CSCA metadata if needed and mark the document registered

### 2. Use the proving machine’s registration rules, not the old app flow

The shared helper must mirror the registration branch in
`packages/mobile-sdk-alpha/src/proving/provingMachine.ts`, not the older app
recovery screens.

That means:

- use `isUserRegisteredWithAlternativeCSCA(...)`
- for `kyc` and `aadhaar`, source alternative keys from
  `selfClient.getProtocolState()[docType].public_keys`
- for passports, use `alternative_csca`

Do not copy the outdated app-only branch that throws for `kyc`.

### 3. Keep the secret write in webview-app

The shared SDK helper should own registration validation and document
finalization, but the secure-storage write stays in `packages/webview-app`
because it already depends on `bridgeStorageAdapter` and the webview secure
storage key names.

This avoids creating a `mobile-sdk-alpha` dependency on `@selfxyz/webview-bridge`.

### 4. Keep recovery validation next to proving internals

Do **not** export `getCommitmentTree` from `packages/mobile-sdk-alpha/src/browser.ts`
just to satisfy this feature.

Instead, put the new recovery validation helper under the proving area in
`packages/mobile-sdk-alpha/src/` so it can import the same internal helpers the
proving machine already uses. Export only the new high-level helper from
`browser.ts`.

This keeps the browser public surface small and avoids turning a proving-store
internal into a new supported browser API by accident.

### 5. Use `secret` consistently

In this spec, `secret` means the same value currently persisted as
`self_private_key`.

- the mnemonic is the user-entered recovery phrase
- the secret is the derived private key used by registration validation

Use `secret` in helper names, variable names, and return types unless you are
specifically talking about the storage key name.

## What You Will Do

### 1. Add a shared recovery validation helper in `mobile-sdk-alpha`

Create a browser-safe helper under `packages/mobile-sdk-alpha/src/proving/` and
export it from `packages/mobile-sdk-alpha/src/browser.ts`.

Recommended file:

- `packages/mobile-sdk-alpha/src/proving/recoveryValidation.ts`

Required behavior:

- input:
  - `selfClient`
  - selected `IDDocument`
  - candidate secret
- output:
  - `{ isRegistered: boolean; csca?: string }`

Implementation requirements:

- import `isUserRegisteredWithAlternativeCSCA` from
  `@selfxyz/common/utils/passports/validate`
- import `getCommitmentTree` internally from the same SDK proving/protocol area
  the proving machine already uses
- call `isUserRegisteredWithAlternativeCSCA(document, secret, ...)`
- source commitment trees with the same callback semantics used in the
  registration branch of `provingMachine.ts`
- source alt-CSCA/public-key material with the exact branching below:

```ts
getAltCSCA: (docType: DocumentCategory) => {
  if (docType === 'aadhaar' || docType === 'kyc') {
    const publicKeys = selfClient.getProtocolState()[docType].public_keys;
    return publicKeys
      ? Object.fromEntries(publicKeys.map(key => [key, key]))
      : {};
  }
  return selfClient.getProtocolState()[docType].alternative_csca;
};
```

- do not mutate secure storage
- do not navigate
- do not import anything from `app/`

Also add a small finalization helper if it improves clarity:

- either reuse the existing exported functions directly in webview-app, or
- add a thin shared helper that calls:
  - `reStorePassportDataWithRightCSCA(selfClient, document, csca)`
  - `markCurrentDocumentAsRegistered(selfClient)`

Keep this helper pure with respect to React and route state.

### 2. Extend the webview secret manager with explicit restore support

Modify:

- `packages/webview-app/src/utils/secretManager.ts`

Add a new helper to persist a validated phrase into secure storage:

```ts
restoreSecretFromMnemonic(storage, mnemonic): Promise<{ secret: string }>
```

Required behavior:

- derive the secret using the existing derivation path
- write both:
  - `self_mnemonic`
  - `self_private_key`
- return the derived secret so the caller can avoid deriving twice
- if writing either key fails after the other succeeded, roll back both keys and
  rethrow so the caller treats the whole persist as failed

Do not add any localStorage or IndexedDB fallback. This must continue to use
the bridge-backed secure storage adapter only.

### 3. Replace UI-only submit logic in `SecretPhraseInputScreen`

Modify:

- `packages/webview-app/src/screens/recovery/SecretPhraseInputScreen.tsx`

Required behavior:

1. Keep the existing mnemonic syntax validation.
2. On syntactically invalid phrases:
   - trigger error haptic
   - track the rejection event
   - stay on the same screen
   - show inline error copy
3. On syntactically valid phrases:
   - load the selected document via `loadSelectedDocument(client)`
   - if no selected document exists, navigate to `/recovery/failure`
     (terminal failure — see step 3a)
   - derive the candidate secret from the phrase without mutating storage
   - call the new shared recovery validation helper
4. If validation fails (phrase does not match document):
   - do **not** navigate to `/recovery/success`
   - do **not** write the mnemonic/private key into secure storage
   - trigger error haptic
   - track a failure event with a stable reason
   - keep the user on the phrase-input screen
   - show inline error copy such as `Recovery phrase does not match this identity`
5. If validation succeeds:
   - clear any inline error state
   - persist the mnemonic/private key with the new `restoreSecretFromMnemonic`
     helper
   - if `restoreSecretFromMnemonic` rejects, navigate to `/recovery/failure`
     (terminal failure — see step 3a)
   - finalize document registration:
     - `reStorePassportDataWithRightCSCA(...)`
     - `markCurrentDocumentAsRegistered(...)`
   - trigger success haptic
   - track a success event
   - navigate to `/recovery/success`, preserving `returnTo`
6. On any unexpected error during steps 3–5 (including document load
   failure, validation helper rejection, finalization failure):
   - do **not** write secrets or finalize the document
   - track a terminal failure event with a stable reason code
   - navigate to `/recovery/failure`, forwarding `returnTo`

Implementation constraints:

- handle the async submit path directly in this screen; do not hide it inside a
  React hook that also owns routing
- guard against double-submit while the async operation is in flight
- keep the raw mnemonic in a single piece of component state only; do not copy
  it into refs, memoized derived state, or secondary state variables
- if the Euclid screen does not expose inline error props, render a local error
  text block below the input/screen wrapper in `packages/webview-app`; do not
  defer visible error UX in this PR
- clear the mnemonic and derived secret from state/variables in a `finally`
  block after submit completes (see Security Requirements)
- add a 5-attempt cooldown with 30s lockout (see Security Requirements)
- add a code comment at the top of the component stating that phrase possession
  is the authentication gate (see Security Requirements)

### 3a. Add a placeholder terminal failure screen

Create:

- `packages/webview-app/src/screens/recovery/RecoveryFailureScreen.tsx`

This is a **temporary placeholder** using the existing Euclid
`RegistrationFailureScreen` with overridden copy. Euclid does not have
recovery-specific failure screens yet (SELF-2345 is redesigning recovery UX).
This placeholder makes the terminal failure visible and navigable so we don't
silently swallow errors.

The `copy` prop is `Partial<typeof registrationFailureScreenDefaultCopy>` and
supports all four keys: `title`, `body`, `dismiss`, `tryDifferentMethod`.
Verified in `@selfxyz/euclid/src/screens/identity/RegistrationFailureScreen.tsx`
(line 30-35, line 40: `{ ...registrationFailureScreenDefaultCopy, ...copy }`).

Add the route `/recovery/failure` in `packages/webview-app/src/App.tsx`.

```tsx
import { RegistrationFailureScreen } from '@selfxyz/euclid';

// TODO: Replace with dedicated RecoveryFailureScreen from Euclid
// once SELF-2345 (recovery phrase UX redesign) lands.
export const RecoveryFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_dismissed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onTryAgain = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_try_again');
    const target = returnTo
      ? `/recovery/phrase-input?returnTo=${encodeURIComponent(returnTo)}`
      : '/recovery/phrase-input';
    navigate(target, { replace: true });
  }, [navigate, haptic, analytics, returnTo]);

  return (
    <RegistrationFailureScreen
      {...WEB_SAFE_AREA}
      onDismiss={onDismiss}
      onTryDifferentMethod={onTryAgain}
      copy={{
        title: 'Recovery failed',
        body: 'Something went wrong while restoring your account. You can try again or dismiss to return home.',
        dismiss: 'Go home',
        tryDifferentMethod: 'Try again',
      }}
    />
  );
};
```

Required behavior:

- "Go home" navigates to `/`
- "Try again" navigates explicitly to `/recovery/phrase-input` with
  `replace: true`, preserving any `returnTo` query parameter. Do not use
  `navigate(-1)` — the back stack is not guaranteed to have phrase-input
  as the previous entry (direct navigation, unusual back-stack state).
- The flow stops here for now — no automatic retry or tunnel resume from
  this screen. This is intentional; follow-up work will add proper recovery
  failure handling once SELF-2345 lands.

When navigating to `/recovery/failure` from `SecretPhraseInputScreen`,
forward the current `returnTo` query parameter so the failure screen can
pass it back to phrase-input on retry.

Navigate to `/recovery/failure` from `SecretPhraseInputScreen` for:

- missing selected document (`loadSelectedDocument` returns null)
- storage write failure (`restoreSecretFromMnemonic` rejects)
- any unexpected error during the recovery submit path

### 4. Preserve tunnel resume behavior after real recovery

Verify and keep:

- `packages/webview-app/src/screens/tunnel/TunnelRecoveryRequiredScreen.tsx`
- `packages/webview-app/src/screens/recovery/RecoverySuccessScreen.tsx`

Required behavior:

- `TunnelRecoveryRequiredScreen` continues to route to
  `/recovery/phrase-input?returnTo=%2Ftunnel%2Fproof%2Fgenerating`
- `RecoverySuccessScreen` continues to respect `returnTo` and navigate with
  `replace: true`
- `TunnelProvingScreen` keeps the existing `initDone` guard that prevents stale
  store state from triggering route changes before a fresh init completes

Only modify these files if needed for correctness. Do not rewrite the route
structure.

### 5. Add focused tests

#### 5a. SDK helper tests

Add or extend tests under `packages/mobile-sdk-alpha/tests/` for the new shared
validation helper.

Required assertions:

- returns registered for a matching selected document + secret
- returns not registered for a non-matching secret
- uses `public_keys` for `kyc` / `aadhaar`
- converts `public_keys: string[]` into `Record<string, string>` with
  `Object.fromEntries(publicKeys.map(key => [key, key]))`
- does not attempt to mutate storage or route state

#### 5b. Webview recovery tests

Extend webview tests under `packages/webview-app/tests/screens/recovery/`.

Required assertions:

- valid-but-non-matching phrase stays on `/recovery/phrase-input`
- valid-but-non-matching phrase shows visible inline error text
- matching phrase navigates to `/recovery/success`
- `returnTo` still resumes the tunnel route after success
- failed recovery does not navigate to success
- missing selected document navigates to `/recovery/failure`
- storage write failure navigates to `/recovery/failure`
- recovery failure screen "Try again" navigates back to phrase input
- recovery failure screen "Go home" navigates to `/`

You already added route-regression tests for the tunnel and recovery wrapper
behavior. Keep those and extend them rather than replacing them.

#### 5c. Security behavior tests

Add to the webview recovery test file:

Required assertions:

- after a failed submit, analytics event does not contain the mnemonic or secret
- after 5 consecutive mismatches, submit is disabled (button not clickable)
- if bridge storage write rejects, navigation does not proceed to success
- if one secure-storage key write succeeds and the second fails, the first write
  is rolled back and the previously stored values remain unchanged
- failed recovery does not mark the selected document registered
- on unmount during async submit, no unhandled state update occurs

## Files You Will Modify

| File                                                                                      | Change                                                           | Risk       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `packages/mobile-sdk-alpha/src/browser.ts`                                                | export the new browser-safe recovery helper                      | Low        |
| `packages/mobile-sdk-alpha/src/proving/recoveryValidation.ts`                             | add shared recovery validation helper                            | Medium     |
| `packages/mobile-sdk-alpha/src/documents/utils.ts`                                        | optional reuse only; no behavior change unless helper extraction | Low        |
| `packages/webview-app/src/utils/secretManager.ts`                                         | add validated restore helper                                     | Medium     |
| `packages/webview-app/src/screens/recovery/SecretPhraseInputScreen.tsx`                   | replace UI-only submit with real recovery path                   | **Medium** |
| `packages/webview-app/src/screens/recovery/RecoveryFailureScreen.tsx`                     | new placeholder using RegistrationFailureScreen with custom copy | Low        |
| `packages/webview-app/src/App.tsx`                                                        | add `/recovery/failure` route                                    | Low        |
| `packages/webview-app/src/screens/recovery/RecoverySuccessScreen.tsx`                     | only if needed to preserve return behavior                       | Low        |
| `packages/webview-app/src/screens/tunnel/TunnelProvingScreen.tsx`                         | preserve only; modify only if recovery resume exposes a bug      | Low        |
| `packages/webview-app/tests/screens/recovery/recoverySupportScreens.test.tsx`             | add success/failure recovery assertions                          | Low        |
| `packages/webview-app/tests/screens/tunnel/tunnelFlowScreens.test.tsx`                    | extend only if route behavior changes                            | Low        |
| `packages/mobile-sdk-alpha/tests/proving/` or `packages/mobile-sdk-alpha/tests/recovery/` | add helper tests                                                 | Medium     |
| `specs/projects/sdk/workstreams/webview/SPEC.md`                                          | keep backlog current                                             | None       |

## Files You Will NOT Modify

| File / Area                                                       | Why                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `app/src/providers/authProvider.tsx`                              | native app provider is reference-only, not a dependency              |
| `app/src/providers/passportDataProvider.tsx`                      | app-only provider; webview must stay package-local                   |
| `app/src/screens/account/recovery/**`                             | reference implementation only                                        |
| `@selfxyz/common/**`                                              | consume existing validation utilities only; no common changes        |
| `packages/webview-bridge/src/adapters/storage.ts`                 | secure-storage bridge contract already exists                        |
| `packages/webview-app/src/screens/tunnel/TunnelProvingScreen.tsx` | account-recovery route handoff already exists; this PR fixes restore |
| Vite config / chunk splitting / `lottie-web` dependency chain     | unrelated warning cleanup                                            |

## Security Requirements

### Trust boundary

The bridge-backed secure storage is the trust boundary for secrets. The rules:

- The bridge is trusted to store and return secrets securely. The webview
  must never mirror `self_mnemonic` or `self_private_key` into localStorage,
  IndexedDB, sessionStorage, or any other browser-accessible store.
- If the bridge storage write fails (rejects or throws), abort recovery
  entirely. Do not navigate to success, do not mark the document registered,
  do not leave partial state. Treat a failed persist as a failed recovery.

### Sensitive data in memory

- After the submit handler completes (success or failure), clear the
  mnemonic string and derived secret from local variables and React state.
  Use a `finally` block or equivalent so cleanup runs on both paths.
- On component unmount, clear any mnemonic/secret held in state.
- Never hold the raw mnemonic in a ref that survives across renders
  after submit completes.
- Prefer a single source of truth for the phrase in component state. Do not
  duplicate it into additional refs/state objects for convenience.

### No secret logging

Do not log, track, or include in analytics events:

- the raw mnemonic or any substring of it
- the derived secret / private key
- document commitment hashes or other values that would make offline
  brute-force correlation easier

Analytics events should use stable reason codes only (e.g.
`recovery_validation_failed`, `recovery_storage_write_failed`), not
data-derived strings.

### Attempt limiting

Add a client-side attempt counter. After **5 consecutive failed
validation attempts** (syntactically valid phrase, document mismatch),
disable the submit button for 30 seconds with a visible cooldown
indicator. Reset the counter on success or component unmount.

Scope decision:

- the counter is **in-memory only**
- it is scoped to the mounted phrase-input route instance
- it must not be persisted to secure storage, localStorage, IndexedDB,
  cookies, or query params
- it must not be described in code comments or UI copy as brute-force
  protection

This is not a security boundary (client-side limits are bypassable) but
it mitigates accidental rapid retries and provides UX feedback that
something is wrong.

### Authentication gate

Possession of the recovery phrase is sufficient authentication for this
flow. No additional PIN, biometric, or password gate is required before
phrase entry. This is an explicit product decision: the phrase _is_ the
credential.

State this assumption in a code comment at the top of
`SecretPhraseInputScreen` so future reviewers know it was intentional.

### Session state after secret replacement

After successful recovery persists the new secret:

1. The `selfClient` instance must be usable with the new secret
   immediately. Verify that `selfClient` reads the secret from storage
   on each use (not cached at init time).
2. If any auth/SDK state caches the previous secret in memory, explicitly
   recreate or reset that state before navigating to success. Do not rely on
   incidental remount behavior alone.
3. The proving store must not retain state from a previous proving
   attempt with the old secret. The existing `initDone` guard on
   `TunnelProvingScreen` handles this (fresh mount resets it), but
   verify this in manual testing step 7.

This is a required decision, not a suggestion: if you discover a secret cache,
you must reset it in the implementation PR instead of documenting it as a
follow-up.

### Secure-storage rollback

Persisting the recovered secret is an atomic operation from the feature’s point
of view.

- If `self_mnemonic` write succeeds and `self_private_key` write fails, remove
  `self_mnemonic` before surfacing the error.
- If `self_private_key` write succeeds and `self_mnemonic` write fails, remove
  `self_private_key` before surfacing the error.
- If previous values existed before the attempt, the rollback path must leave
  the pre-existing values intact or restore them before returning failure.
- Never leave secure storage in a half-written state after a failed recovery
  attempt.

### Failure-path atomicity

On validation failure or any error during the recovery submit:

- Do not write `self_mnemonic` or `self_private_key` to storage
- Do not call `markCurrentDocumentAsRegistered`
- Do not call `reStorePassportDataWithRightCSCA`
- Do not update any route state or navigation flags
- Do not leave partial recovery indicators in component state beyond
  the inline error message
- If secure-storage persistence started, roll it back before surfacing failure

The only side effects of a failed attempt should be the analytics event
and the visible error feedback (inline error text for phrase mismatch,
navigation to `/recovery/failure` for terminal failures).

### Recovery route access

`/recovery/phrase-input` is reachable via direct navigation (URL or
back-button). This is acceptable — the flow validates the phrase against
the selected document regardless of entry point, and the validate-before-write
invariant protects storage. Do not add a route guard that blocks direct
access; it would add complexity without security value since the phrase
is the credential.

Direct-navigation failure behavior must still fail closed:

- if there is no selected document, navigate to `/recovery/failure`
- if selected-document state is ambiguous or unreadable, navigate to
  `/recovery/failure`
- do not create a new identity, generate a replacement secret, or navigate to
  success from this route without validating against exactly one selected
  document

## Constraints

- **Do not import from `app/` into `packages/webview-app` or `packages/mobile-sdk-alpha`.**
- **No web fallback for secrets.** Use bridge-backed secure storage only.
- **Do not overwrite secure storage on a non-matching phrase.**
- **Do not add `react-native` imports to `packages/mobile-sdk-alpha/src/`.**
- **Keep recovery phrase support limited to manual phrase entry.** No social
  login, Apple backup, Google backup, or cloud restore in this PR.
- **Do not change the host lifecycle contract.** Recovery success resumes the
  existing route; it does not call `lifecycle.setResult()` directly.

## Validation

```bash
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/webview-app exec vitest run tests/screens/recovery/recoverySupportScreens.test.tsx tests/screens/tunnel/tunnelFlowScreens.test.tsx
yarn workspace @selfxyz/webview-app build
```

Manual validation:

1. Start the webview app and enter the tunnel staging flow.
2. Trigger `account_recovery_choice`.
3. Enter a syntactically valid but non-matching phrase.
4. Confirm the app stays on phrase input, shows inline error, and does not
   resume tunnel.
5. Repeat step 3 five times. Confirm the submit button disables with a
   visible cooldown after the 5th attempt.
6. Wait 30 seconds, confirm the button re-enables.
7. Reload the page during the cooldown and confirm the cooldown does not claim
   to persist as a security boundary.
8. Enter a matching phrase.
9. Confirm recovery success returns to `/tunnel/proof/generating`.
10. Confirm the proving flow continues instead of looping back to recovery.
11. Force a secure-storage write failure and confirm no partial secret update
    remains in storage.
12. (If testable) Trigger a terminal failure (e.g. no selected document).
    Confirm the recovery failure screen appears with "Recovery failed" title.
13. Tap "Try again" — confirm it returns to phrase input.
14. Tap "Go home" — confirm it navigates to `/`.

## Definition of Done

- [ ] A valid-but-non-matching phrase does not overwrite secure storage
- [ ] A matching phrase persists the mnemonic/private key through the bridge
- [ ] A valid-but-non-matching phrase shows visible error feedback
- [ ] The selected document is validated with the proving machine’s current
      registration rules
- [ ] Successful recovery marks the current document as registered
- [ ] Tunnel recovery resumes from `returnTo` after success
- [ ] Webview recovery tests cover both success and failure behavior
- [ ] Shared recovery validation helper is browser-safe and exported from
      `@selfxyz/mobile-sdk-alpha/browser`
- [ ] Mnemonic and derived secret are cleared from memory after submit
      (success and failure paths)
- [ ] No analytics events contain the mnemonic, secret, or commitment hashes
- [ ] Failed bridge storage write aborts recovery without partial state
- [ ] 5-attempt cooldown with 30s lockout is implemented and visible
- [ ] Cooldown state is in-memory only and not presented as a security boundary
- [ ] Partial secure-storage writes roll back without changing the prior secret
- [ ] Code comment documents phrase-as-credential authentication decision
- [ ] Terminal failures (missing document, storage write failure) navigate to
      `/recovery/failure` placeholder screen
- [ ] Placeholder screen has TODO comment referencing SELF-2345
- [ ] If any secret cache exists, it is explicitly reset before tunnel resume
