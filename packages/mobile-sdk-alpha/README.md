# @selfxyz/mobile-sdk-alpha

Alpha SDK for registering and proving. Adapters-first, React Native-first with web shims. Minimal surface for scan → validate → generate proof → attestation verification.

- ESM-only with export conditions: `react-native`, `browser`, `default`.
  - `react-native` and `default` resolve to the core build in `dist/index.js`.
  - `browser` points to a web bundle that exposes shimmed adapters.
- Tree-shaking friendly: named exports only, `"sideEffects": false`.
- NFC lifecycle must remain app-controlled; never scan with screen off.
- Android NFC enablement workaround remains app-side/event-driven.
- Do not auto-start servers in dev flows; document commands only.

## Minimal API

- `createSelfClient({ config, adapters })`
- `scanDocument(opts)`, `validateDocument(input)`, `checkRegistration(input)`, `generateProof(req, { signal, onProgress, timeoutMs })`
- Eventing: `on(event, cb)`
- Web shim: `webScannerShim` (QR stub only)

## Environment shims

- The `browser` build replaces the scanner with `webScannerShim`, which only stubs QR scanning and throws for unsupported modes.

## Quick start (local, monorepo)

Provide `scanner`, `network`, and `crypto` adapters. `storage`, `clock`, and `logger` default to no-ops.

```ts
import { createSelfClient, webScannerShim, extractMRZInfo } from '@selfxyz/mobile-sdk-alpha';
const sdk = createSelfClient({
  config: {},
  adapters: {
    scanner: webScannerShim,
    network: yourNetworkAdapter,
    crypto: yourCryptoAdapter,
  },
});
```

## Processing utilities

```ts
import { extractMRZInfo, formatDateToYYMMDD, parseNFCResponse } from '@selfxyz/mobile-sdk-alpha';

const mrzInfo = extractMRZInfo(mrzString);
const compact = formatDateToYYMMDD('1974-08-12');
const nfc = parseNFCResponse(rawBytes);
```

## Migration checklist

Track progress in [MIGRATION_CHECKLIST.md](./docs/MIGRATION_CHECKLIST.md).

## Architecture checklist

Plan implementation with [ARCHITECTURE.md](./docs/ARCHITECTURE.md) and task prompts in [ARCHITECTURE_PROMPTS.md](./docs/ARCHITECTURE_PROMPTS.md).

## Testing

**IMPORTANT: Do NOT mock this package in tests!**

The purpose of the mobile-sdk-alpha migration is to test the REAL package methods, not mocked versions. When integrating this package into your application:

### ✅ DO: Use Real Package Methods
- Import and use the actual functions from `@selfxyz/mobile-sdk-alpha`
- Write integration tests that call the real validation logic
- Test actual passport data validation with `isPassportDataValid()`
- Verify real MRZ parsing with `extractMRZInfo()`

### ❌ DON'T: Mock the Package
- Don't mock `@selfxyz/mobile-sdk-alpha` in Jest setup
- Don't replace real functions with mock implementations
- Don't use `jest.mock('@selfxyz/mobile-sdk-alpha')` unless absolutely necessary

### Example: Real Integration Test
```ts
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

describe('Real mobile-sdk-alpha Integration', () => {
  it('should validate passport data with real logic', () => {
    const result = isPassportDataValid(realPassportData, callbacks);
    expect(result).toBe(true); // Real validation result
  });
});
```

## Dev scripts

- `npm run validate:exports` — ensure named exports only.
- `npm run validate:pkg` — check packaging and export conditions.
- `npm run report:exports` — output current public symbols.
