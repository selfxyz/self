# Browser Extension - UX Spec (production)

> Last updated: 2026-07-29
> Owner: Remi Colin
> Status: Draft for review
> Component citations reference `@selfxyz/euclid` **v1.4.6** (`packages/webview-app/node_modules/@selfxyz/euclid/src/`), the version webview-app compiles against. The `selfxyz/euclid` checkout at `../storybook` is 4+ months stale; do not spec against it.

## Principles

1. **Every click answers within 100ms.** Press feedback, then a state change or spinner. No control may be clickable twice for the same intent (buttons enter a loading state and disable).
2. **No dead air.** Every wait (relayer join, transfer, passkey prompt, proof generation) shows what is happening, how long it typically takes, and what the user can do if it stalls. Proof generation reuses the established "10-30 seconds" + "don't close" pattern (`ProofGeneration`, `CircuitProgressCard`).
3. **Security checks are gates, not decoration.** The SAS emoji comparison happens BEFORE any secret moves, and the send action lives on the phone, under the emojis, so the check is on the path, not beside it.
4. **Terminal states are explicit.** Success, failure, and cancel each get a distinct screen with one primary next action (`StatusState` variants). Silent timeouts are bugs.
5. **The extension feels like the app.** Same Euclid components, tokens, and motion as mobile; the popup is a small Self app, not a browser dialog.

## Flow 1: Link account (phone -> extension)

```
Extension                                 Phone
1. QR screen                              -
   [QR + "waiting for phone" pulse]
2. QR scanned                             2. Scan screen -> camera
   [QR dims, "phone connected"]           3. Emoji check screen
3. SAS screen                                [4 emojis, large]
   [same 4 emojis, large]                    "Verify these match the extension"
   "Confirm on your phone"                   [Cancel] [Encrypt & send my account]  <- the button
4. Receiving...                           4. Sending... [progress, KB count]
   [indeterminate -> received]            5. Success ("finish in the browser")
5. Custody screen
   [Secure with Touch ID]  <- primary
   [or set a password]     <- collapsed fallback
6. Success screen
   [n documents imported, Open Self]
```

- Step 3 is the user-confirmed pattern: **visual emoji check first, then one explicit button press ("Encrypt & send my account") fires the transfer.** The hello handshake (public key only) is what makes both sides able to show the emojis before any secret exists on the wire.
- QR screen needs states: `generating` (skeleton), `ready`, `phone-connected` (dim QR, swap status line), `expired` (regenerate CTA after 5 min), `error` (relayer unreachable, retry).
- Custody: passkey primary with the passkey ceremony's own OS prompt treated as the loading state (button shows `verifying` until resolve); password fallback collapsed behind a text link to keep one obvious path. Cancelled Touch ID returns to the choice, never to a half-created vault.
- Failure branches: decrypt/validation failure on the extension side must also fail the phone side (relayer nack) with matching copy on both screens - never one side success, one side error.

## Flow 2: Unlock

- Passkey vault: single "Unlock with Touch ID" button, auto-triggered on popup open (with the button as the retry affordance), password UI absent.
- Password vault: password field (secure input with reveal toggle), inline error message on wrong password + field shake, attempt counter after 3 failures, and "Unlock & enable Touch ID" upsell button when PRF is available.
- "Forgot password? Reset" stays a two-step destructive pattern: link -> explanation ("this browser only; your phone keeps everything") -> red confirm.

## Flow 3: Disclosure consent (embed)

- Best-covered flow today: keep `ProofRequestScreen` + `ProofButton` (press-and-hold) + `ProofGenerationScreen`/`ProofProgressScreen`.
- Additions: requesting-origin display (favicon + host, anti-phishing) pinned at the top of the consent screen; explicit cancelled state that closes the popup AND resolves the page promise with a typed failure.
- Proof generation: `CircuitProgressCard` with caller-controlled progress (TEE stages map to segments), estimated time, and "closing this window cancels the proof".

## Flow 4: Documents

- List = selection list: tapping a document makes it the active proving document (matches the spike behavior now in `ManageDocumentsScreen` in webview-app).
- Selected row shows a radio/check + "In use for proofs"; switching shows a row-scoped pending state until the catalog write confirms.
- Home ID card reflects the selection (already true) and deep-links to the list.

## Loading-state inventory (what must exist)

| Wait | Duration | Surface |
| --- | --- | --- |
| QR generation | <500ms | skeleton in QR frame |
| Phone joins relayer room | 1-30s | pulse on QR screen status line |
| Hello -> SAS displayed | <1s | emoji slots skeleton -> pop-in |
| Transfer payload | 1-5s | progress on both sides, KB count on phone |
| Passkey ceremony | OS-controlled | button `verifying` state |
| Vault decrypt on unlock | <1s | button `verifying` state |
| Proof generation | 10-30s | staged progress card (existing pattern) |
| Backend confirmation (RP page) | 1-10s | page-side; SDK exposes status stream |

## Euclid gap analysis (v1.4.6)

Convention note: Euclid models loading as a **state/variant union on the component** (`ProofButtonState`, `SwipeToSignState`, `StatusStateVariant`), not an `isLoading` boolean. New work follows that convention. Styling is inline style objects; there is no `className` escape hatch, so every gap below must land IN Euclid, not be patched from outside.

### Missing components (net new)

| Component | Need | Notes |
| --- | --- | --- |
| `Spinner` | exported, sized variants, `role="status"` | Today: two private duplicated keyframe spinners (`ProofButton.tsx`, `EmptyState.tsx`); `ProofButton`'s injects an unguarded `<style>` per import - fix while extracting |
| `QRDisplay` | value -> QR with `generating/ready/dimmed/expired` states, logo overlay | Nothing exists; only scanner-side viewfinder UI (`ViewFinder`, `QRViewfinderScreen`). Renderer lib is caller-supplied |
| `EmojiSas` | 4 large glyph slots, pending/redacted state, per-glyph `aria-label`, "must match other device" caption | `NovaPin` (4-slot PIN) had the right geometry but was deleted in 1.4.6; `SecretPhraseClip` is the nearest survivor |
| Secure `InputField` | `secure` mode, reveal toggle, error **message** slot (today `error` is a boolean border flag), `autoComplete` | Blocks password custody + unlock |
| Biometric icon/button | Touch ID / passkey affordance | `FaceIdIcon` existed pre-1.4.6 (`LivenessIcons.tsx`) and was removed; nearest live icons: `LockIcon`, `ShieldLockIcon` |
| `Toast` | transient confirmations (copied, saved) | Zero hits repo-wide; only ad-hoc pattern is `RecoveryPhrase`'s hardcoded `copied` variant |
| `Skeleton` | text/card/row shapes | Zero hits; `EmptyState loading` is a blocking spinner, not a skeleton |

### Existing components needing a state/variant

| Component | Gap |
| --- | --- |
| `Button` (`components/actions/Button.tsx`) | No loading state - the single biggest gap; add a `state` union (idle/loading/success?) with width-stable label, `aria-busy`, auto-disable. Also: press feedback binds mouse events only - add touch handlers |
| `ManageDocumentsScreen` (`screens/settings/ManageDocumentsScreen.tsx`) | `DocumentItem` has no `selected`/`activeDocumentId`; it is a navigation list, not a selection list. Add selection + row-scoped pending state |
| `DetailedTableViewCell` (`components/data-display/DetailedTableViewCell.tsx`) | `document-detail` variant lacks `selected`; only the non-document `radio*` variants select. Unify |
| `ProofRequestScreen` / `ProofButton` | Add requesting-origin slot; press-and-hold needs a keyboard-accessible equivalent |
| `ProofGeneration` (`components/proof/ProofGeneration.tsx`) | Steps/copy/estimated time hardcoded; parameterize or standardize on `CircuitProgressCard` (already caller-controlled) for extension stages |

### Covered today (reuse, do not rebuild)

- Consent + proving: `ProofRequestScreen`, `ProofButton` (waiting/preparing/ready/verifying/disabled + hold-to-confirm), `ProofGenerationScreen`, `ProofProgressScreen`, `CircuitProgressCard`.
- Terminal states: `StatusState` (success/fail/loading) + success screens family; needs caller-supplied Lottie (library ships no JSON assets - source a checkmark animation once, reuse everywhere).
- Custody choice layout: `GroupedButtons` + `Button` mega variants; `SocialSignOnMethodPickerScreen` is the structural precedent for a 2-option picker with a collapsed fallback.
- Selection sheet: `IDPicker` (`selectedId`, `onSelect`, `inline`) for document pickers inside consent.
- Press feedback convention: local pressed state, `opacity 0.75 / scale 0.993 / 0.15s ease` - keep for new components.

## Deliverables

1. CEP-06 (Euclid): the two tables above, in priority order - `Button` loading state, `Spinner`, `QRDisplay`, `EmojiSas`, secure `InputField`, biometric icon, document selection, `Toast`, `Skeleton`. Each with a Storybook story and touch+keyboard+screen-reader coverage.
2. CEP-07/CEP-08 (screens): link/unlock flows in webview-app and phone link flow, composed from the above; bespoke extension HTML pages deleted.
3. Copy review: one pass over all states with the "matching emojis = end-to-end encrypted with that browser and nothing in between" framing on both devices.
