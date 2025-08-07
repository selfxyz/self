# @selfxyz/sdk-alpha

Alpha SDK for registering and proving. Adapters-first, React Native-first with web shims. Minimal surface for scan → validate → generate proof → attestation verification.

- ESM-only with export conditions: `react-native`, `browser`, `default`.
- Tree-shaking friendly: named exports only, `"sideEffects": false`.
- NFC lifecycle must remain app-controlled; never scan with screen off.
- Android NFC enablement workaround remains app-side/event-driven.
- Do not auto-start servers in dev flows; document commands only.

## Minimal API
- `createSelfClient({ config, adapters })`
- `scanDocument(opts)`, `validateDocument(input)`, `checkRegistration(input)`, `generateProof(req, { signal, onProgress, timeoutMs })`
- Eventing: `on(event, cb)`
- Web shim: `webScannerShim` (QR stub only)

## Quick start (local, monorepo)
```ts
import { createSelfClient, webScannerShim, extractMRZInfo } from "@selfxyz/sdk-alpha";
const sdk = createSelfClient({ config: {}, adapters: { scanner: webScannerShim } });
```

## Migration plan (incremental checklist)
- [ ] Scanning: define RN adapters for MRZ/NFC; keep NFC lifecycle in app (screen on).
- [ ] Processing: migrate pure helpers (MRZ parse, NFC response parsing) — first: `extractMRZInfo`, `formatDateToYYMMDD`.
- [ ] Validation: port minimal checks from `validateDocument.ts` (stateless subset).
- [ ] Protocol sync: add paginated tree fetch + TTL cache + root verification.
- [ ] Proof inputs: port `provingInputs.ts` (register/disclose first).
- [ ] TEE session: WS wrapper with `AbortSignal`, timeouts, progress.
- [ ] Attestation: essential verification from `attest.ts`.
- [ ] Crypto: WebCrypto-first via adapter; `@noble/*` fallback; no Node crypto.
- [ ] Artifacts: manifest schema + integrity checks; CDN download + cache (storage adapter).
- [ ] Samples: RN + web minimal flows; iOS scheme `OpenPassport`.

## Dev scripts
- `npm run validate:exports` — ensure named exports only.
- `npm run validate:pkg` — check packaging and export conditions.
