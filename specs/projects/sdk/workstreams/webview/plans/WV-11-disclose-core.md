# WV-11: Disclose Core

> Last updated: 2026-03-25
> Status: Ready
> Priority: High
> Depends on: WV-07 (Done), WV-08 (Ready)

- Workstream: webview
- Backlog ID: WV-11
- Linear: SELF-2420
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The webview app already has a partial disclose surface:

- `VerificationRequestProvider` parses verification request context from
  `window.location.search`
- `ProvingScreen` renders Euclid's `ProofRequestScreen`
- `VerificationResultScreen` renders a terminal success/failure state

But the route is not a real disclose flow yet. Today:

- `/proving` immediately calls `lifecycle.setResult()` from the request review
  screen
- there is no dedicated proof-generation route
- `useProvingStore` is not wired into the main disclose path
- the tunnel flow contains the only proving-machine integration reference, and
  even that flow is still partially mocked

`WV-11` turns the main disclose path into a real route spine:

```text
request context
  → proof request review
  → proof generation
  → proof result
  → lifecycle.setResult() / lifecycle.dismiss()
```

This is the first non-registration disclose contract for the active webview
app. It uses the already-registered document path and the proving machine
assembled in `WV-07`, while reusing the proving integration patterns proven in
`WV-08`.

## Prerequisites

- **WV-07 done** — `SelfClient` and `useProvingStore` are available in
  `packages/webview-app`
- **WV-08 ready** — tunnel flow defines the reference integration pattern for
  real proving-machine wiring
- **WV-01 done** — proof request labels already come from verification request
  context instead of hardcoded UI

## Scope

This spec covers the **main disclose route chain** in `packages/webview-app`.

### In scope

- turn `/proving` into the proof request review step
- add a dedicated `/proving/generating` route for real proving progress
- keep `/proving/result` as the terminal success/failure route
- wire `useProvingStore` into the main disclose path with circuit type
  `disclose`
- move `lifecycle.setResult()` to the terminal result screen
- add request-context guards so direct navigation does not show broken proof UI

### Out of scope

- browser camera QR scanning
- proof receipt/history screens
- proof dialogue overlays
- post-proof backup prompts
- Sumsub pending/success support screens
- Nova splash or unrelated support routes

`QRViewfinderScreen` remains inventoried, but **QR capture is not the active
entry contract** for `WV-11`. The canonical disclose entrypoint is the host-
supplied verification request context in the launch URL/query string.

## What You Will Do

### PR 1: Proof request review and route guards

#### 1a. Keep request context as the canonical disclose entrypoint

**Files:**

- `packages/webview-app/src/providers/VerificationRequestProvider.tsx`
- `packages/webview-app/src/utils/verificationRequest.ts`
- `packages/webview-app/src/screens/proving/ProvingScreen.tsx`

The main disclose flow starts from request context already parsed from
`window.location.search`. Do not introduce a second request source for `WV-11`.

The review screen should require enough request context to render meaningful
proof items:

- `request.disclosures` present, or
- `displayLabels` present

If both are empty, the screen should treat the route as invalid and redirect to
`/`.

#### 1b. Convert `/proving` into review-only behavior

**File:** `packages/webview-app/src/screens/proving/ProvingScreen.tsx`

Keep this screen as the Euclid `ProofRequestScreen` wrapper, but change its
behavior:

- `onConfirm` should **not** call `lifecycle.setResult()`
- `onConfirm` should navigate to `/proving/generating`
- `onClose` should call `lifecycle.dismiss({ reason: 'user_cancel' })` then
  navigate to `/`

The user confirmation on this screen is the approval gate for disclose proving.

#### 1c. Add the new generation route

**File:** `packages/webview-app/src/App.tsx`

Add:

```typescript
<Route path="/proving/generating" element={<ProofGenerationRouteScreen />} />
```

Use a new wrapper component name that does not collide with Euclid exports.

#### 1d. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 1:**

- [ ] `/proving` renders proof request review only
- [ ] missing disclose request context redirects to `/`
- [ ] confirm on `/proving` navigates to `/proving/generating`
- [ ] cancel on `/proving` dismisses the lifecycle session and returns home
- [ ] `yarn build` passes

---

### PR 2: Real proof generation screen

#### 2a. Create the generation wrapper

**Create:** `packages/webview-app/src/screens/proving/ProofGenerationScreen.tsx`

This wrapper owns the real proving-machine integration for the main disclose
flow.

Use:

```typescript
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProofGenerationScreen as EuclidProofGenerationScreen } from '@selfxyz/euclid';
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';
import { useSelfClient } from '../../providers/SelfClientProvider';
```

Behavior:

1. On mount, initialize the proving machine with circuit type `disclose`
2. Drive Euclid progress UI from `useProvingStore(state => state.currentState)`
3. When the machine reaches `ready_to_prove`, automatically call
   `setUserConfirmed(client)` once, because the user already approved the proof
   request on the previous screen
4. On `completed`, navigate to `/proving/result` with success state
5. On `error`, `failure`, `passport_not_supported`, or
   `passport_data_not_found`, navigate to `/proving/result` with failure state

Use a one-shot ref so `setUserConfirmed(client)` is not fired repeatedly on
re-renders.

#### 2b. State → UI mapping

Use the proving-machine state to drive Euclid step copy:

| provingMachine state  | Euclid step / meaning      |
| --------------------- | -------------------------- |
| `idle`                | loading                    |
| `parsing_id_document` | preparing document         |
| `fetching_data`       | fetching verification data |
| `validating_document` | validating document        |
| `init_tee_connexion`  | connecting to prover       |
| `ready_to_prove`      | ready / auto-starting      |
| `proving`             | generating proof           |
| `post_proving`        | finalizing                 |
| terminal error states | navigate to result         |
| `completed`           | navigate to result         |

The exact Euclid prop names may differ, but the wrapper should preserve this
semantic mapping.

#### 2c. Route guard for direct navigation

If the generation route is opened without valid disclose request context, or if
there is no stored document available for disclose, navigate to `/` instead of
rendering a stuck loading state.

Treat the following as invalid entry:

- no disclose request items from query params
- proving store cannot start because no document is available

#### 2d. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 2:**

- [ ] `/proving/generating` uses `useProvingStore` with circuit type `disclose`
- [ ] proving progress reflects real proving-machine state
- [ ] user confirmation is auto-forwarded once at `ready_to_prove`
- [ ] success and failure navigate to `/proving/result`
- [ ] invalid direct navigation redirects instead of hanging
- [ ] `yarn build` passes

---

### PR 3: Terminal result contract and lifecycle callback

#### 3a. Make the result screen the terminal callback owner

**File:** `packages/webview-app/src/screens/proving/VerificationResultScreen.tsx`

This screen becomes the single terminal point for the disclose session.

Required behavior:

- success path builds a `VerificationResult` with:
  - `success: true`
  - `userId: request.userId`
  - `verificationId`
  - `claims.resultType: 'proofRequested'`
- failure path builds a `VerificationResult` with:
  - `success: false`
  - `userId: request.userId`
  - `verificationId`
  - normalized `error`

On terminal CTA:

- if result has not been sent yet, call `lifecycle.setResult(result)`
- on success, after terminal result handling, call `lifecycle.dismiss()`
- on failure or retry, do not call `lifecycle.dismiss()` before the retry path runs
- do not navigate home first and leave the host session hanging

This fixes the current bug where `/proving` sends the result before proof
generation happens.

#### 3b. Success/failure copy

Use disclose-specific copy rather than registration copy:

- success: proof generated / identity shared successfully
- failure: proof generation failed / request could not be completed

Do not reuse "ID Verified" registration language here.

#### 3c. Add retry behavior

On failure, the primary action should retry the disclose flow by navigating
back to `/proving` after ensuring `lifecycle.setResult(result)` has been called
if needed. Keep the host session open for that retry path.

On success, the terminal action should close the session after result delivery
by calling `lifecycle.dismiss()`.

If the Euclid component only supports a single button, prefer:

- success button: `Done`
- failure button: `Try Again`

#### 3d. Validation

```bash
cd packages/webview-app && yarn build
```

**Definition of Done for PR 3:**

- [ ] `VerificationResultScreen` owns the disclose terminal callback
- [ ] `lifecycle.setResult()` no longer fires from the review screen
- [ ] success result uses `claims.resultType: 'proofRequested'`
- [ ] failure result sends a normalized error payload
- [ ] success closes the host session after result delivery
- [ ] failure can re-enter the review flow
- [ ] `yarn build` passes

## Files You Will Modify

| File                                                                    | Change                            | Risk       |
| ----------------------------------------------------------------------- | --------------------------------- | ---------- |
| `packages/webview-app/src/App.tsx`                                      | Add `/proving/generating` route   | **Low**    |
| `packages/webview-app/src/screens/proving/ProvingScreen.tsx`            | Review-only behavior + guards     | **Medium** |
| `packages/webview-app/src/screens/proving/VerificationResultScreen.tsx` | Terminal disclose result handling | **Medium** |
| `specs/projects/sdk/workstreams/webview/SPEC.md`                        | Link `WV-11` to this plan         | **None**   |
| `specs/projects/sdk/workstreams/webview/TICKET-PLAN.md`                 | Mark spec created                 | **None**   |

## Files You Will NOT Modify

| File                                                      | Why                                                       |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `packages/webview-app/src/screens/onboarding/**`          | Registration flow is already covered by `WV-09`           |
| `packages/webview-app/src/screens/tunnel/**`              | Tunnel proving flow stays the reference path from `WV-08` |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` | Engine behavior is consumed as-is                         |
| `packages/webview-bridge/**`                              | Host callback contract already defined in `WV-04`         |
| `packages/native-shell-android/**`                        | No native work required                                   |
| `packages/native-shell-ios/**`                            | No native work required                                   |

## Files You May Create

| File                                                                 | What                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/webview-app/src/screens/proving/ProofGenerationScreen.tsx` | Main disclose proving wrapper                                                        |
| `packages/webview-app/src/stores/discloseResultStore.ts`             | Optional module-scoped terminal result state if navigation state becomes too fragile |

## Constraints

- **Query params are the canonical disclose request source.** Do not invent a
  second request contract for `WV-11`.
- **No QR camera dependency in this spec.** `QRViewfinderScreen` remains
  inventory only. Browser QR scanning can be scoped later if product decides it
  is needed.
- **No lifecycle callback before proving completes.** The review screen is not
  a terminal state.
- **Use circuit type `disclose`.** The main disclose flow is not a register →
  disclose chain like the tunnel flow.
- **Result screens own teardown.** Follow the `WV-04` contract: terminal
  screens deliver the result, then dismiss the host session.

## Resolved Questions

1. **Is QR scanning part of `WV-11`?** No. The active disclose entry contract
   is the host-supplied verification request context in the launch URL/query
   string. QR capture remains deferred.

2. **Should `WV-11` reuse the tunnel flow files?** No. Tunnel remains the
   proving integration reference and separate route family. `WV-11` upgrades
   the main `/proving` path.

3. **Where should `lifecycle.setResult()` fire?** Only from the terminal
   result screen after proving succeeds or fails, never from the request review
   screen.

4. **What result type should disclose emit?** `claims.resultType:
'proofRequested'`.

5. **Does `WV-11` include receipt/history/dialogue surfaces?** No. Those stay
   in later support specs.

## Validation

```bash
cd packages/webview-app && yarn build
```

Manual validation checklist:

1. Launch with valid disclose query params and confirm `/proving` shows the
   requested proof items.
2. Confirm the CTA routes to `/proving/generating` instead of immediately
   sending a lifecycle result.
3. Verify proving progress advances through real proving-machine states.
4. Verify success lands on `/proving/result`, sends `self:result`, then
   dismisses the host session.
5. Verify cancel from the review screen dismisses the session.
6. Verify invalid direct navigation to `/proving` or `/proving/generating`
   redirects to `/`.

## Definition of Done

- [ ] Main disclose flow uses the route chain `/proving` → `/proving/generating` → `/proving/result`
- [ ] `/proving` is review-only and no longer sends terminal results
- [ ] `/proving/generating` is backed by `useProvingStore` with `disclose`
- [ ] `/proving/result` sends the final lifecycle result and dismisses the session
- [ ] invalid direct navigation is guarded
- [ ] `WV-11` backlog row links to this plan
- [ ] `yarn build` passes
