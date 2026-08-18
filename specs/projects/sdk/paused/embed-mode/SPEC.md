## Embed Mode (getConfig bridge contract)

> Last updated: 2026-08-09
> Owner: Seshanth Saravanakumar (was Justin Hernandez; SELF-3395 / SELF-3396
> reassigned 2026-08-09 — land-or-archive is his call, neither is cancelled)
> Status: **HALTED 2026-08.** Implementation is parked, not lost: the web side
> lives on `justin/wia-demo-rd1` ([selfxyz/self#2194](https://github.com/selfxyz/self/pull/2194),
> draft) and the KMP/Swift side on `chore/run-android-locally`
> ([selfxyz/self-webview-sdk#26](https://github.com/selfxyz/self-webview-sdk/pull/26),
> draft). Neither is merged. This document and the `plans/` beneath it were
> cherry-picked onto `self-3708` for landing on `dev`, so the track's written
> record survives branch deletion — see
> [SELF-3708](https://linear.app/selfprotocol/issue/SELF-3708). Until that lands,
> `justin/wia-demo-rd1` is still the only other copy.
> EM-03 (SELF-3398) and EM-02b (SELF-3397) were cancelled 2026-07-29.

### Context

- The web app (`@selfxyz/webview-app`) decides whether it is running **inside the
  SDK ("embed" mode)** or **standalone ("self-app" mode)** by calling
  `lifecycle.getConfig` over the native bridge (`OperatingModeProvider.tsx:60`).
- **The contract is canonical in [SPEC-MODES](../../workstreams/webview-in-app/SPEC-MODES.html)** and **live
  for the RN host** (WIA-16, Done). This workstream is not a new contract — it is
  KMP/Swift-shell parity + the web routing that consumes it.
- **No KMP/Swift host implements `getConfig`.** `self-webview-sdk`'s
  `LifecycleBridgeHandler` (android/ios) handles only `ready` / `dismiss` /
  `setResult`. A whole-repo search for `getConfig` returns zero matches there.
- Consequence: against the real SDK, `getConfig` never resolves → the 800ms
  timeout fires → the web **defaults to self-app**. `ModeDispatch` then always
  picks the self-app variant, and the verification request (today carried only in
  the launch URL `…/tunnel/tour/1?disclosures=…`) is read by a URL parser, not the
  bridge. **Embed mode is effectively unreachable.** The "straight to Proof
  Requested, no scan" symptom is downstream of this: the catch-all
  `InitialRouteRedirect` jumps to `/disclose/request` on the `disclosures` param
  with no document/mode awareness.
- This workstream defines and implements the one contract that activates embed
  mode. It is the keystone: it subsumes problem #2 (mode detection) and lets the
  web-side routing fix absorb #1/#3 (the `/tunnel/tour/1` ↔ no-web-route mismatch).

### Architecture

```text
  SDK host (self-webview-sdk)                 Web app (self / webview-app)
  ────────────────────────────                ────────────────────────────
  SelfVerificationActivity                    OperatingModeProvider
    holds SelfSdkConfig + VerificationRequest    └─ bridge.request('lifecycle',
    (from EXTRA_CONFIG / EXTRA_VERIFICATION_         'getConfig', {}, 800ms)
     REQUEST intents)                                     │
        │                                                 ▼
  LifecycleBridgeHandler                        { mode, verificationRequest, … }
    "ready" / "dismiss" / "setResult"                     │
    + "getConfig"  ◄────── bridge request ────────────────┘
        returns { mode:'embed',                  mode==='embed' → embed surface
                  verificationRequest:{…},        else          → self-app surface
                  … }
```

### Invariants

- **`getConfig` is the source of truth for operating mode + the verification
  request _data_** — i.e. the raw fields in `VerificationRequest` +
  `SelfSdkConfig`. It is **not** a replacement for the web's parsing/derivation.
- **`getConfig` carries RAW fields; the web keeps its derivation.** The contract
  delivers the same raw inputs the SDK encodes into the URL today (see
  `QueryParamsBuilder`). The web's `parseVerificationRequestContext`
  (`utils/verificationRequest.ts:47`) does NOT consume raw fields directly — it
  normalizes and derives: `normalizeEndpoint(appEndpoint, endpointType)`,
  `formatEndpointForDisplay`, `normalizeRequestType(resultType)`,
  `environment→'prod'|'stg'`, `chainID` filtered to `42220`/`11142220`,
  `appName ?? 'Verification'`, `displayLabels` from `proofItems`, `timestamp`.
  **So EM-02 refactors `parseVerificationRequestContext` to accept a structured
  object instead of `URLSearchParams`, preserving every derivation** — it does NOT
  pre-derive in Kotlin and does NOT drop normalization (the `appEndpoint`
  normalization is security-relevant).
- **Transport-bootstrap + security params stay URL-borne — `getConfig` is NOT
  their source.** `targetOrigin` is read from the URL in `BridgeProvider.tsx:28`
  to set the `postMessage` target _before_ any bridge round-trip is possible
  (chicken-and-egg), and the `referenceId` URL fallback likewise. These MUST
  remain on the URL; the "stop reading the URL" rule applies only to the
  verification-request _data_, never to transport/origin pinning.
- **Handler registration happens before WebView load** (verified:
  `SelfVerificationActivity.registerHandlers()` runs at line 103, before
  `createWebView()`/`loadUrl()` at 108–109), so the handler exists when the web
  calls `getConfig`. See the mode-signal robustness decision below for the
  remaining device-timing risk.
- **Fail-safe**: any `getConfig` reject/timeout MUST leave the web in
  self-app / standalone-browser mode. Hosts without `getConfig` keep working
  unchanged. `getConfig` must be callable before `ready` and be idempotent.

### The contract

`lifecycle.getConfig` — params: `{}` — resolves to `HostConfigResponse`:

```jsonc
{
  "mode": "embed", // "embed" | "self-app"
  "verificationRequest": {
    // null when mode != "embed"; RAW fields only
    // request fields (verbatim from VerificationRequest)
    "userId": "string|null",
    "scope": "string|null",
    "disclosures": ["ofac"], // string[]; web derives displayLabels from this
    "verificationId": "string|null",
    "resultType": "string|null", // RAW; web maps via normalizeRequestType
    "excludedCountries": [], // string[]
    "userIdType": "string|null",
    "userDefinedData": "string|null",
    "selfDefinedData": "string|null",
    // config fields (verbatim from SelfSdkConfig — web normalizes these)
    "endpoint": "string",
    "appEndpoint": "string", // RAW; web runs normalizeEndpoint (security-relevant)
    "environment": "string", // SelfEnvironment.queryValue; web maps to 'prod'|'stg'
    "endpointType": "string|null",
    "appName": "string|null", // web defaults to 'Verification' when null
    "chainID": 42220, // number|null; web keeps only 42220/11142220 (others filtered out)
    "version": 2, // from config.version (NOT hardcoded)
  },
  "debug": false, // optional
  "platform": "android", // optional: "android" | "ios"
  "capabilities": {
    "nfc": true,
    "mrzCamera": true,
    "biometrics": false,
    "secureStorage": true,
  },
}
```

The field set is the raw union of `VerificationRequest` + the
`QueryParamsBuilder`-encoded `SelfSdkConfig` fields — **delivered raw, not
pre-derived**. EM-02 feeds this object through the (refactored)
`parseVerificationRequestContext` so all normalization/derivation is preserved.

New hosts MUST return the complete `capabilities` map for the handlers they
actually register. The web preserves backward compatibility by treating the
field as optional for older hosts, but omission defaults to all capabilities and
is therefore unsafe for a new shell with missing native domains.

**Optional pass-through (RN parity):**

- `referenceId` — the RN host emits it in `getConfig` and WIA-14 threads it
  (web prefers `getConfig`, falls back to URL). EM-01 MUST carry `referenceId?`
  as an optional pass-through to match the RN shape, even if the KMP host does not
  populate it yet. Omitting the field diverges from the settled contract. (This
  supersedes the earlier "drop referenceId" guidance.)

**Deliberately NOT in the contract:**

- `targetOrigin` — transport/security bootstrap; stays URL-borne (see Invariants).
- `proofItems` — not an SDK concept; `QueryParamsBuilder` never emits it. For
  SDK-originated requests `displayLabels` is null and the web falls back to
  `disclosures` (`hasDiscloseRequestContext`, verificationRequest.ts:39). No SDK
  field needed.
- `timestamp` — web defaults to its own clock when absent; SDK need not supply it.

### Dependencies

Spec home is this repo (`self`). EM-01's code lands in `self-webview-sdk`.

| Depends On                                                              | Type                            | Status                    | Notes                                |
| ----------------------------------------------------------------------- | ------------------------------- | ------------------------- | ------------------------------------ |
| `LifecycleBridgeHandler` (android+ios)                                  | `self-webview-sdk` (EM-01 code) | Exists                    | add `getConfig` method               |
| `SelfVerificationActivity` holds the request/config                     | `self-webview-sdk` (EM-01 code) | Exists                    | source of the payload                |
| `webview-app` `OperatingModeProvider`                                   | This repo (EM-02)               | Calls `getConfig` already | consume payload; stop URL-parsing    |
| `renderWithBridge` mock (`webview-app/tests/utils/`)                    | This repo (EM-02)               | Exists                    | add embed-mode fixtures/overrides    |
| [SPEC-MODES](../../workstreams/webview-in-app/SPEC-MODES.html) contract | This repo                       | Settled (WIA-16 Done)     | canonical contract; do not re-derive |

### Backlog

Both remaining items are **Deferred**, not Ready: the code is written and passing
its own checks but unmerged, and the land-or-archive decision is open. Neither is
pick-up-and-execute work — read the halt note above first.

| ID     | Title                                                            | Status   | Priority | Depends On | Plan                                   | PR                                                                    |
| ------ | ---------------------------------------------------------------- | -------- | -------- | ---------- | -------------------------------------- | --------------------------------------------------------------------- |
| EM-02a | Web: doc-aware embed routing + sticky request (**demo unblock**) | Deferred | High     | -          | `plans/EM-02-web-doc-aware-routing.md` | [self#2194](https://github.com/selfxyz/self/pull/2194) (draft)        |
| EM-01  | SDK: implement `lifecycle.getConfig` (KMP/Swift-shell parity)    | Deferred | High     | -          | `plans/EM-01-getconfig-handler.md`     | [sdk#26](https://github.com/selfxyz/self-webview-sdk/pull/26) (draft) |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

### Cancelled

IDs are never reused.

| ID     | Title                                                         | Cancelled  | Why                                                                                                                        |
| ------ | ------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| EM-02b | Web: consume `getConfig` (switch screens off URL parser)      | 2026-07-29 | EM track tail; cancelled with the track ([SELF-3397](https://linear.app/selfprotocol/issue/SELF-3397)). Depended on EM-01. |
| EM-03  | Integration: embed e2e on device (scan → register → disclose) | 2026-07-29 | EM track tail; cancelled with the track ([SELF-3398](https://linear.app/selfprotocol/issue/SELF-3398)).                    |

### Plans

| Plan                                   | IDs    | Status                                             |
| -------------------------------------- | ------ | -------------------------------------------------- |
| `plans/EM-02-web-doc-aware-routing.md` | EM-02a | Parked — Part A written; Part B (EM-02b) cancelled |
| `plans/EM-01-getconfig-handler.md`     | EM-01  | Parked — written, unmerged, iOS unverified         |

### Design decisions

1. **Mode-signal robustness (DECISION, not an open question).** Today embed mode
   hangs entirely on a single 800ms `getConfig` round-trip. If bridge readiness is
   slow on a real device, a genuine embed session silently degrades to self-app
   (wrong surface, no verification). Handler-registration-before-load is already
   guaranteed (verified above), which removes the registration race — but not the
   transport-readiness race. **Decide before EM-02 ships one of:**
   - (a) keep single-shot `getConfig` but make the timeout configurable + add a
     bounded retry on the web side; and/or
   - (b) add a deterministic load-time embed signal (injected JS global or a URL
     flag the SDK already controls) that sets mode immediately, with `getConfig`
     only _enriching_ the request data.
     Recommendation: (a) for EM-01/EM-02 (cheap, no contract change), evaluate (b)
     if device testing (EM-03) shows the timeout is marginal.

### Open questions (product/architecture — not code)

1. **`/tunnel/tour/1` entry.** Keep the SDK constant and add a web route/basename,
   OR change `SdkConstants.BUNDLED_TOUR_PATH` to `/tour/1`. If EM-02 makes the
   catch-all do the embed boot decision for _any_ entry path, this mismatch is
   absorbed and neither change is strictly required.
