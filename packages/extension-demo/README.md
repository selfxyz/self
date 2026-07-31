# Self Chrome Extension Demo (spike)

Demo relying party for the Chrome extension disclosure spike: an 18+ check
verified end-to-end - extension popup, TEE proof on staging, and real
server-side verification with `SelfBackendVerifier`.

Spec: `specs/projects/sdk/workstreams/chrome-extension/SPEC.md`.

## Prerequisites

1. Build and load the extension (`packages/chrome-extension`):
   ```bash
   pnpm --filter @selfxyz/common build && pnpm --filter @selfxyz/mobile-sdk-alpha build:ts-only \
     && pnpm --filter @selfxyz/webview-bridge build && pnpm --filter @selfxyz/webview-app build
   pnpm --filter @selfxyz/chrome-extension build
   ```
   Load `packages/chrome-extension/dist` unpacked at `chrome://extensions` (Chrome for Testing
   or any Chromium that still supports `--load-extension` / manual unpacked loading).
2. Link an account: click the extension toolbar icon, scan the QR from the Self app
   (dev Debug menu → "Link Browser Extension"). The account must hold a document
   registered on **staging**.
3. The proof endpoint must be reachable by the TEE, so tunnel the backend:
   ```bash
   ngrok http 3111
   ```

## Run

```bash
# terminal 1 - backend (real SelfBackendVerifier, staging registry)
VERIFY_ENDPOINT=https://<tunnel>/api/verify pnpm --filter @selfxyz/extension-demo backend

# terminal 2 - frontend
VITE_VERIFY_ENDPOINT=https://<tunnel>/api/verify pnpm --filter @selfxyz/extension-demo dev
```

Open http://localhost:5199 and click "Verify with the Self extension". Without a
tunnel the flow still runs, but the TEE cannot deliver the proof to the backend,
so the page's backend-confirmation line stays pending.

## What happens

1. The page builds a `SelfApp` with the standard `SelfAppBuilder` (`minimumAge: 18`,
   staging) and registers the session on the relayer via `SelfQRcodeWrapper`
   (which doubles as the QR fallback when the extension is absent).
2. The shim (`@selfxyz/chrome-extension/sdk`) posts the request; the content
   script relays it to the extension background, which opens the approval popup.
3. The popup runs the real proving flow (inputs in-page, proof in the staging TEE);
   the TEE POSTs the proof to the backend, where `SelfBackendVerifier` checks it.
4. The extension reports `proof_verified` on the relayer session (page `onSuccess`)
   and returns the lifecycle result through the shim; the page then polls the
   backend for the server-side confirmation.
