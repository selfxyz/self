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
import {
  createSelfClient,
  webScannerShim,
  extractMRZInfo,
} from '@selfxyz/sdk-alpha';
const sdk = createSelfClient({
  config: {},
  adapters: { scanner: webScannerShim },
});
```

## Migration checklist

Track progress in [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md).

## Dev scripts

- `npm run validate:exports` — ensure named exports only.
- `npm run validate:pkg` — check packaging and export conditions.
- `npm run report:exports` — output current public symbols.
