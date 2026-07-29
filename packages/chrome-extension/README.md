# Self browser extension

Holds a Self account transferred from the phone and generates disclosure proofs
in the browser. MV3 shell hosting the `webview-app` build; the extension owns
only the service worker, the bridge host, the vault, and the site shim.

Specs: `specs/projects/sdk/workstreams/chrome-extension/` (PRD, production,
UX, user journey, and the versioned transfer protocol under `plans/`).

## Build and load

```bash
# from the repo root, in order (the extension embeds these builds)
pnpm --filter @selfxyz/common build
pnpm --filter @selfxyz/mobile-sdk-alpha build:ts-only
pnpm --filter @selfxyz/webview-bridge build
pnpm --filter @selfxyz/webview-app build
pnpm --filter @selfxyz/chrome-extension build
```

Load `packages/chrome-extension/dist` unpacked at `chrome://extensions` with
developer mode on. The manifest pins a `key`, so the extension id is always
`ogmglcibieieclolmenndchnccbbmmcf` (the harnesses depend on that).

Store package: `node scripts/build.mjs --store` strips the dev `key`, stamps a
`YYYY.MM.DD.N` version (`STORE_BUILD_NUMBER` overrides `N`), and writes the
upload zip. Icons come from `scripts/make-icons.mjs`; rerun it when the brand
asset changes.

## Test it by hand

Prerequisites: a phone with a document registered on **staging** (all endpoints
here are staging), and the app running from this branch.

1. **Link.** Click the toolbar icon. Compare the 6 emojis on both screens, then
   press "Encrypt & send my account" on the phone. Choose Touch ID (no password
   is created in that mode) or set a password of 12+ characters.
2. **Documents.** Settings, then Manage Documents: every transferred document is
   listed, and tapping one makes it the active proving document.
3. **Disclose.** Run the demo relying party (`packages/extension-demo`, see its
   README: it needs an ngrok tunnel because the TEE must reach the verifier and
   `SelfAppBuilder` rejects localhost). Click through and watch the proof verify.
4. **Lock.** Right-click the toolbar icon, "Lock Self". Any open extension
   window closes and the next open asks to unlock. Same on OS lock, after 30
   minutes idle, after 12 hours, and on browser restart.
5. **Reset.** Unlock screen, "Forgot your password?": wipes this browser only
   and returns to the link screen. The phone is untouched.

## Automated checks

Run from this package. `RELAY_URL` points them at a local relayer; they use
staging by default.

| Command | Covers |
| --- | --- |
| `node harness/boot-check.mjs` | fresh install gates to the link page and renders a valid QR |
| `node harness/import-check.mjs` | the whole account transfer against the real relayer: SAS match on both sides, substituted-sender refusal, off-path envelope refusal, custody, lock eviction, idle expiry, unlock throttle, reset, worker-restart survival |
| `node harness/relayer-transfer.mjs` | relayer envelope relay in isolation |
| `node harness/disclose-check.mjs` | disclosure through the staging TEE (needs a linked account) |
| `node harness/demo-check.mjs` | demo relying party end to end (needs the tunnel) |

CI runs boot-check and import-check on every PR touching the extension,
`webview-app`, the bridge, the SDK, or `common`.

## Things that will bite you

- **Chrome for Testing is required** for the harnesses: branded Chrome 137+
  dropped `--load-extension`. Fetch it with
  `pnpm exec puppeteer browsers install chrome@stable --path ./chrome`.
- **The phone and the extension must be updated together.** The link QR is
  protocol v3; a v2 phone is refused by design rather than falling back to
  weaker authentication.
- **Session state is never in worker memory.** Chrome kills an idle MV3 worker
  in ~30s, so anything that must outlive the consent screen belongs in
  `chrome.storage.session` with a `chrome.alarms` timer.
- **The relayer drops a message whose peer has not joined yet** and does not
  buffer it, which makes some multi-session tests racy. self-infra PR #166 adds
  buffering; a few harness cases are waiting on that deploy.
