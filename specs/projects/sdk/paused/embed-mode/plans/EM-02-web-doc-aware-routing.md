## EM-02: Web — doc-aware embed routing + getConfig consumption

> Last updated: 2026-08-09
> Status: **PARKED — Part A code written, unmerged.** See the halt note in
> [embed-mode SPEC](../SPEC.md).

- Workstream: Embed Mode
- Backlog ID: EM-02
- Repo: `self` / `packages/webview-app`
- Linear: [SELF-3396](https://linear.app/selfprotocol/issue/SELF-3396) (Part A);
  Part B was [SELF-3397](https://linear.app/selfprotocol/issue/SELF-3397), cancelled
- Branch: `justin/wia-demo-rd1`
- PR: [selfxyz/self#2194](https://github.com/selfxyz/self/pull/2194) (draft)

### Why

- **Demo unblock.** A first-time user (no registered document) who opens a
  verification request lands on the proof screen and fails
  (`passport_data_not_found`, `screens/embed/EmbedProvingScreen.tsx:58`). There is
  no path from the verification entry into onboarding. They must be routed into the
  scan flow and resumed to disclose after registration.
- **Root cause (verified).** The SDK launches the WebView at
  `…/tunnel/tour/1?disclosures=…` (`QueryParamsBuilder` + `BUNDLED_TOUR_PATH`). The
  web app has no matching route, so React Router drops to the catch-all `path="*"`
  → `InitialRouteRedirect` → unconditional `<Navigate to="/disclose/request">` on
  the `disclosures` param, with **no document awareness**.

### Scope — two parts, demo-critical first

**Part A — demo-critical (independent of EM-01; this is what ships the demo).**
The fix lives entirely in `webview-app` and works at the catch-all regardless of
whether `getConfig`/embed mode is active, because the catch-all is the entry the
SDK's launch URL actually hits.

1. **Doc-aware `InitialRouteRedirect`.** On a verification-request param
   (`disclosures` | `proofItems`): run an async `loadSelectedDocument(client)`
   check behind a loading state.
   - `metadata.isRegistered === true` → `/disclose/request` (preserve `search`) —
     today's behavior, unchanged.
   - not registered / unknown / error → onboarding (`/tour/1`).
     Reuse the decision already in `screens/embed/TourScreen.tsx:29-39` — extract it
     into a shared helper so it is not duplicated.
2. **Sticky request capture.** BrowserRouter wipes the URL query during onboarding
   navigation (prod `TourScreen`/capture routes navigate without `search`), so the
   request would be lost before the user reaches `/disclose/request`. Capture the
   complete parsed `ParsedVerificationRequestContext` once at entry and retain the
   last valid value while `location.search` is empty. Do not reconstruct a subset
   of query fields: this must preserve `proofItems`-derived display labels and
   every request/config field parsed by `parseVerificationRequestContext`.
   In-memory is sufficient for the demo: the host re-supplies the URL on every
   WebView launch, so only _in-session_ navigation loses it. (Durable host-driven
   sourcing is Part B / EM-01, not here.)
3. **Request-aware registration completion.** `getConfig` is absent in the demo,
   so onboarding runs in self-app mode and `RegisteringScreen.goHomeRegistered`
   currently navigates to `/`. After registration, use the retained parsed
   request to navigate to `/disclose/request` when it contains disclose context;
   preserve the existing `/` redirect when no request was captured. Without this
   terminal redirect, sticky capture alone does not resume the demo flow.
4. **Tests.** Unit-test the doc-aware decision and the post-registration resume.
   Keep `decideBootRoute` **pure** —
   if the decision needs document state, pass it in as a `BootInputs` field rather
   than awaiting inside the pure function. The mock `getConfig` handler already
   exists (`tests/utils/renderWithBridge.tsx:65`, defaults self-app); the task is
   **embed-mode fixtures/overrides**, not adding the handler.

**Routing home — CONFIRMED via the demo host (self-webview-sdk PR #26):** the
demo host (KMP test app, `SdkLaunchScreen.kt`) launches with a real
`VerificationRequest` (`disclosures="ofac"`) but implements **no `getConfig`**, so
mode is always self-app and `BootDecision`'s embed branch never fires. The
doc-aware decision therefore lives in the **catch-all** (`InitialRouteRedirect`) —
that is the only boot path that runs without `getConfig`, so this is not
re-fragmentation vs NAV-03, it is the active path. Still extract the decision into
the shared `resolveEmbedEntry` helper so `BootDecision` can call the _same_ helper
later for a real `getConfig` host (rn-sdk) — but for the demo, the catch-all is
where it fires.

### ~~Part B — contract consumption~~ — CANCELLED 2026-07-29, DO NOT EXECUTE

> Part B was tracked as **EM-02b** ([SELF-3397](https://linear.app/selfprotocol/issue/SELF-3397)),
> **cancelled** with the EM track tail. It is retained below as historical design
> rationale only — it is **not** in this plan's scope and **not** in its Definition
> of Done. Do not implement it because you read it here; if embed mode is revived,
> re-derive the scope from [`../SPEC.md`](../SPEC.md) and open a fresh backlog ID
> (EM IDs are never reused).

**Part B — contract consumption (depends on EM-01; post-demo).** 4. Once EM-01 ships `getConfig` for the KMP/Swift shell, switch the embed
disclose/proving screens to read the request from the `OperatingMode` /
`VerificationRequest` context instead of the URL parser. Refactor
`parseVerificationRequestContext` (`utils/verificationRequest.ts:47`) to accept
a **structured object** (the raw `getConfig` payload) instead of
`URLSearchParams`, **preserving every derivation** (`normalizeEndpoint`,
`formatEndpointForDisplay`, `normalizeRequestType`, environment/chainID mapping,
`appName` default). Extend the existing `getConfig` mock
(`webview-app/tests/utils/renderWithBridge.tsx:65`) with embed-mode fixtures
rather than adding a handler.
See `../SPEC.md` invariants — `targetOrigin` stays URL-borne; `referenceId` is a
`getConfig` pass-through with a URL fallback.

### Out of Scope

- SDK `getConfig` handler — EM-01 (`self-webview-sdk`).
- 3-domain scope expansion / `nfc`+`cameraMrz` provider registration in
  `self-webview-sdk` (separate SDK/Platform owner call; see `../SPEC.md`).
- `/tunnel/tour/1` ↔ web-route reconciliation — absorbed by Part A (the catch-all
  decides for any entry path), and the terminology side is already done (NAV-12).

### Files to Modify (Part A — demo)

| File                                            | Change                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/InitialRouteRedirect.tsx`       | Make doc-aware + async with a loading state; defer to the shared embed-entry decision instead of the unconditional jump.                                                              |
| `src/utils/resolveEmbedEntry.ts` (new)          | Extract `loadSelectedDocument → isRegistered ? '/disclose/request' : '/tour/1'`; reused by `InitialRouteRedirect` and `embed/TourScreen`.                                             |
| `src/screens/embed/TourScreen.tsx`              | Replace the inline branch (`:29-39`) with the shared helper.                                                                                                                          |
| `src/providers/VerificationRequestProvider.tsx` | Sticky-capture the complete parsed request so it survives in-session navigation; never replace it with an empty-query parse.                                                          |
| `src/screens/onboarding/RegisteringScreen.tsx`  | After successful registration, resume to `/disclose/request` when retained disclose context exists; otherwise preserve the current home redirect.                                     |
| `src/components/decideBootRoute.ts`             | Only if the decision routes through here — add a doc-state input field; keep the function pure. (Default: keep routing in `InitialRouteRedirect`, leave `decideBootRoute` untouched.) |
| tests                                           | Cover both entry branches, complete `proofItems`/request retention, post-registration resume, and unchanged no-request home navigation.                                               |

### Validation

```bash
cd packages/webview-app && pnpm test && pnpm build
```

**On-device, via the demo host (self-webview-sdk PR #26 tooling):**

- `make web-app` serves this `webview-app` (from the `selfxyz/self` checkout) on
  Vite `:5173`; `make run-android` loads it on a **physical device** (NFC/camera
  need real hardware).
- Use the test app's **"Reset Documents (force scan flow)"** button to clear the
  document catalog, then launch with the verification request:
  - no registered doc → onboarding (`/tour/1` → capture/NFC), then resume
    `/disclose/request` with the request intact.
  - registered doc → `/disclose/request` (unchanged).
- This is the acceptance test: EM-02a is the missing half that makes "Reset
  Documents → next launch starts onboarding" actually work (today the catch-all
  force-jumps to `/disclose/request` regardless of document state).

### Definition of Done (Part A = demo)

- [ ] No registered document + verification request → onboarding, then proof
      request after registration, with the complete parsed request intact.
- [ ] Registered document + verification request → `/disclose/request` (unchanged).
- [ ] Normal self-app/browser navigation (catch-all entries **without** a
      `disclosures`/`proofItems` param) is unchanged — still redirects to `/`. The
      doc-aware change is scoped to catch-all entries that **carry** a
      verification-request param (the SDK launch shape). For those, the new
      behavior (no-doc → onboarding) is an **intentional** change: today they
      wrongly force-jump to `/disclose/request` regardless of document state.
- [ ] `decideBootRoute` stays pure/sync; existing tests pass; new doc-aware tests added.
- [ ] Registration completion resumes `/disclose/request` only when a retained
      disclose request exists; ordinary onboarding still returns home.

Part B is **not** in this Definition of Done — EM-02b was cancelled 2026-07-29
([SELF-3397](https://linear.app/selfprotocol/issue/SELF-3397)). This plan is Part A only.

### Status Log

- 2026-06-29: Drafted. Part A (doc-aware routing + sticky request) is the demo
  unblock and is independent of EM-01; Part B (getConfig consumption) depends on
  EM-01 and follows the demo.
