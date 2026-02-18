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
- `scanNFC(opts)`, `validateDocument(input)`, `checkRegistration(input)`, `generateProof(req, { signal, onProgress, timeoutMs })`
- Eventing: `on(event, cb)`, `emit(event, payload)`
- Web shim: `webNFCScannerShim` (throws for unsupported NFC on web)

## Environment shims

- The `browser` build replaces the scanner with `webNFCScannerShim`, which throws for NFC scanning (not supported on web).

## Installation & Setup

### 1. Install the package

```bash
npm install @selfxyz/mobile-sdk-alpha
# or
yarn add @selfxyz/mobile-sdk-alpha
```

### 2. Link native dependencies and assets

The SDK includes custom fonts that need to be linked to your app:

#### Automatic Linking (Recommended)

React Native autolinking (RN 0.60+) does not link assets by default. First, configure your app's assets:

Create or update `react-native.config.js` at the app root:

```js
module.exports = {
  assets: ['./node_modules/@selfxyz/mobile-sdk-alpha/assets/fonts'],
};
```

Then run:

```bash
npx react-native-asset
# or (Yarn 2+)
yarn dlx react-native-asset
```

This copies the font files to your iOS and Android projects.

#### Manual Linking

If autolinking doesn't work or you need manual control:

**iOS:**

1. Add fonts to your Xcode project:
   - Open your Xcode workspace
   - Drag the font files from `node_modules/@selfxyz/mobile-sdk-alpha/assets/fonts/` to your project
   - Ensure "Copy items if needed" is checked
   - Add to your app target

2. Update `Info.plist` to include the fonts:
   ```xml
   <key>UIAppFonts</key>
   <array>
     <string>Advercase-Regular.otf</string>
     <string>DINOT-Medium.otf</string>
     <string>IBMPlexMono-Regular.otf</string>
   </array>
   ```

**Android:**

1. Ensure the `fonts` directory exists:

   ```bash
   mkdir -p android/app/src/main/assets/fonts
   ```

2. Copy font files to your Android project:
   ```bash
   cp node_modules/@selfxyz/mobile-sdk-alpha/assets/fonts/* android/app/src/main/assets/fonts/
   ```

The fonts will be automatically available to your app.

### 3. Install peer dependencies

This SDK requires `react-native-svg` as a peer dependency. Install it in your app:

```bash
npm install react-native-svg
# or
yarn add react-native-svg
```

**Minimum required version:** `react-native-svg@*` (any version compatible with your React Native version)

For iOS, run `pod install` after installation:

```bash
cd ios && pod install && cd ..
```

### 4. Initialize the SDK

Provide `scanner`, `network`, and `crypto` adapters. `storage`, `clock`, and `logger` default to no-ops.

```ts
import { createSelfClient, webNFCScannerShim, extractMRZInfo } from '@selfxyz/mobile-sdk-alpha';
const sdk = createSelfClient({
  config: {},
  adapters: {
    scanner: webNFCScannerShim, // Note: NFC not supported on web
    network: yourNetworkAdapter,
    crypto: yourCryptoAdapter,
  },
});
```

## Migration from Tamagui

If you're upgrading from a Tamagui-based version of this SDK, please note the following breaking changes:

### Breaking Changes

**1. UI Component System**

- **Removed:** Tamagui dependency and Tamagui-based components
- **Added:** Custom React Native components with direct styling
- **Impact:** Any custom theme overrides or Tamagui-specific configurations will need to be replaced

**2. Font System**

- **Changed:** Fonts are now bundled directly with the package
- **Required:** Manual font linking step (see installation section above)
- **Impact:** You must run `react-native-asset` or manually link fonts

**3. Peer Dependencies**

- **Added:** `react-native-svg` is now a required peer dependency
- **Required:** Install `react-native-svg` in your app
- **Impact:** SVG-based UI components now use `react-native-svg` directly

### Upgrade Steps

1. **Remove Tamagui dependencies** (if you installed them specifically for this SDK):

   ```bash
   # Only if these were installed solely for the SDK
   npm uninstall @tamagui/core @tamagui/config
   ```

2. **Install required peer dependencies:**

   ```bash
   npm install react-native-svg
   cd ios && pod install && cd ..
   ```

3. **Link fonts** following the asset linking instructions in the installation section above

4. **Update your imports** - Component imports remain the same, but internal implementation has changed:

   ```ts
   // These imports still work
   import { PrimaryButton, Title, Body } from '@selfxyz/mobile-sdk-alpha/components';
   ```

5. **Remove Tamagui configuration** - If you had Tamagui config specifically for this SDK, it's no longer needed

6. **Test your UI** - Components now use platform-native styling instead of Tamagui

### Style Customization

Component styling is no longer customizable via Tamagui themes. The SDK now uses fixed styles optimized for the verification flow. If you need to customize UI:

- Use the component composition patterns provided by the SDK
- Wrap SDK components with your own styled containers
- Use the `style` prop where available

## SDK Events

The SDK emits events throughout the verification lifecycle. Subscribe using `selfClient.on(event, callback)`.

### Document Selection Events

**`SdkEvents.DOCUMENT_COUNTRY_SELECTED`** - Emitted when user selects a country during document flow

```ts
selfClient.on(SdkEvents.DOCUMENT_COUNTRY_SELECTED, payload => {
  // payload: { countryCode: string, countryName: string, documentTypes: string[] }
  console.log(`Country selected: ${payload.countryName} (${payload.countryCode})`);
  console.log(`Available types: ${payload.documentTypes.join(', ')}`);
});
```

**`SdkEvents.DOCUMENT_TYPE_SELECTED`** - Emitted when user selects a document type

```ts
selfClient.on(SdkEvents.DOCUMENT_TYPE_SELECTED, payload => {
  // payload: { documentType: string, documentName: string, countryCode: string }
  console.log(`Document selected: ${payload.documentName} from ${payload.countryCode}`);
});
```

### Verification Flow Events

- **`PROVING_PASSPORT_DATA_NOT_FOUND`** - No passport data found; navigate to scanning screen
- **`PROVING_ACCOUNT_VERIFIED_SUCCESS`** - Identity verification successful
- **`PROVING_REGISTER_ERROR_OR_FAILURE`** - Registration failed; check `hasValidDocument` flag
- **`PROVING_PASSPORT_NOT_SUPPORTED`** - Unsupported country/document; includes `countryCode` and `documentCategory`
- **`PROVING_ACCOUNT_RECOVERY_REQUIRED`** - Document registered with different credentials

### System Events

- **`ERROR`** - SDK operation errors and timeouts
- **`PROGRESS`** - Long-running operation progress updates
- **`PROOF_EVENT`** - Detailed proof generation events (for debugging)
- **`NFC_EVENT`** - NFC scanning lifecycle events (for debugging)

See `SdkEvents` enum and `SDKEventMap` in `src/types/events.ts` for complete payload definitions.

## Processing utilities

```ts
import { extractMRZInfo, formatDateToYYMMDD, parseNFCResponse } from '@selfxyz/mobile-sdk-alpha';

const mrzInfo = extractMRZInfo(mrzString);
const compact = formatDateToYYMMDD('1974-08-12');
const nfc = parseNFCResponse(rawBytes);
```

## Error handling

The SDK surfaces typed errors for clearer diagnostics:

- `NfcParseError` and `MrzParseError` for NFC and MRZ parsing issues (category `validation`)
- `InitError` for initialization problems (category `init`)
- `LivenessError` for liveness failures (category `liveness`)

All errors extend `SdkError`, which includes a `code`, `category`, and `retryable` flag.

## Testing

**IMPORTANT: Do NOT mock this package in tests!**

Use the REAL package methods, not mocked versions. When integrating this package into your application:

### ✅ DO: Use Real Package Methods (PII-safe)

- Import and use the actual functions from `@selfxyz/mobile-sdk-alpha`
- Write integration tests that exercise the real validation logic
- Test `isPassportDataValid()` with realistic, synthetic passport data (NEVER real user data)
- Verify `extractMRZInfo()` using published sample MRZ strings (e.g., ICAO examples)
- Ensure `parseNFCResponse()` works with representative, synthetic NFC data

### ❌ DON'T: Mock the Package

- Don't mock `@selfxyz/mobile-sdk-alpha` in Jest setup
- Don't replace real functions with mock implementations
- Don't use `jest.mock('@selfxyz/mobile-sdk-alpha')` unless absolutely necessary

### Example: Real Integration Test (PII-safe)

```ts
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

describe('Real mobile-sdk-alpha Integration', () => {
  it('should validate passport data with real logic using synthetic fixtures', () => {
    // Use realistic, synthetic passport data - NEVER real user data
    const syntheticPassportData = {
      // ... realistic but non-PII test data
    };
    const result = isPassportDataValid(syntheticPassportData, callbacks);
    expect(result).toBe(true); // Real validation result
  });
});
```

**⚠️ IMPORTANT: Never commit real user PII to the repository or test artifacts. Use only synthetic, anonymized, or approved test vectors.**

## Dev scripts

- `npm run validate:exports` — ensure named exports only.
- `npm run validate:pkg` — check packaging and export conditions.
- `npm run report:exports` — output current public symbols.
