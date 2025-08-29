# Task Prompts

This file offers quick pointers for anyone picking up work from the [migration plan](./MIGRATION_PLAN.md). Use it to get oriented, then dive into the code.

## Pre-flight checks

Run these before opening a PR:

```bash
yarn workspace @selfxyz/mobile-sdk-alpha nice
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn workspace @selfxyz/mobile-sdk-alpha build
yarn lint
yarn build
```

## Migration tasks

### 3. Integrate SDK into `/app`

- In `app/src/providers/passportDataProvider.tsx` replace local MRZ helpers with `extractMRZInfo` from `@selfxyz/mobile-sdk-alpha/mrz` and `parseNFCResponse` from `@selfxyz/mobile-sdk-alpha/nfc`.
- Update `app/src/components/native/PassportCamera.tsx` and `app/src/utils/nfcScanner.ts` to use the SDK exports.
- Run `yarn workspace @selfxyz/mobile-app build && yarn workspace @selfxyz/mobile-app test`.

### 4. Proof input generation

- Move `generateTEEInputsRegister` and `generateTEEInputsDisclose` from `app/src/utils/proving/provingInputs.ts` into new files under `packages/mobile-sdk-alpha/src/proving/register.ts` and `packages/mobile-sdk-alpha/src/proving/disclose.ts`.
- Replace `useProtocolStore` with a `getTree(document, kind)` callback so helpers are stateless.
- Add tests in `packages/mobile-sdk-alpha/tests/proving.{register,disclose}.test.ts`.

### 5. Crypto adapters

- Create `src/adapters/crypto/index.ts` exporting a `CryptoAdapter` interface with `getRandomValues`, `digest` and `timingSafeEqual`.
- Implement `src/adapters/crypto/webcrypto.ts` and `src/adapters/crypto/noble.ts` and wire runtime detection in `src/adapters/crypto/index.ts`.
- Add parity tests in `tests/crypto.test.ts` ensuring both adapters produce identical results.

### 6. TEE session management

- Implement `WsAdapter` in `src/adapters/ws/websocket.ts` wrapping `WebSocket` with abort, timeout, and progress callbacks.
- Export the adapter through `src/adapters/index.ts`.
- Add tests under `tests/ws.test.ts` using a mocked server in `tests/ws.server.ts`.

### 7. Attestation verification

- Port `parseCertificateSimple` and PCR0 utilities from `common/src/utils/certificate_parsing/` into `src/attestation/verify.ts`.
- Expose `verifyAttestation(cert: ArrayBuffer, quote: ArrayBuffer)` that returns the public key.
- Cover the verifier with unit tests in `tests/attestation.test.ts`.

### 8. Protocol synchronization

- Add `src/protocol/sync.ts` with `fetchProtocolTrees(fetchPage, cache)` to paginate and cache trees.
- Verify roots against `@selfxyz/common/utils/proving` and honor `Retry-After` headers.
- Write tests in `tests/protocol.test.ts` with a fake server.

### 9. React Native providers and hooks

- Move `app/src/providers/selfClientProvider.tsx` into `src/context.tsx` and expose a `SelfClientProvider` that accepts adapter instances (`crypto`, `ws`, `storage`, `logger`).
- Add hooks like `useSelfClient` and `useDocuments` in `src/hooks/`.
- Remove the wrapper from the app and import the provider directly from the SDK.

### 10. Batteries-included components

- Create `src/components/Scanner.tsx` using `useScanner` and `SelfClientProvider`.
- Add `src/components/ScanButton.tsx` that triggers MRZ and NFC flows with optional adapter props.
- Document usage in `docs/components.md`.

### 11. Sample applications

- Scaffold `examples/react-native/` and `examples/web/` showcasing scan → proof flows.
- Include iOS `OpenPassport` URL scheme setup in `examples/react-native/README.md`.
- Ensure both samples use the published SDK rather than local files.

### 12. In-SDK lightweight demo

- Add `demo/` inside the package with `App.tsx` using `SelfClientProvider` and theming hooks.
- Provide run instructions in `demo/README.md` for `yarn demo ios` and `yarn demo android`.
- Wire demo entry in `package.json` scripts.

## Architecture tasks

### 4. SDK lifecycle management

- Refactor `src/client.ts` so `createSelfClient` becomes `class SelfClient` with `initialize()` and `deinitialize()` methods.
- Persist configuration on the instance rather than module globals.
- Update exports in `src/index.ts`.

### 5. Package targets

- Add a `"./web"` entry to `package.json#exports` pointing to `dist/web/index.js` while keeping React Native as the default.
- Update `tsup.config.ts` to produce a web build target.
- Note possible future targets (Capacitor, Cordova) in comments.

### 6. Dogfood in `/app`

- Update `app/src/utils/proving/provingMachine.ts` and screens in `app/src/screens/prove/` to consume SDK methods.
- Remove deprecated MRZ utilities from the app and import from `@selfxyz/mobile-sdk-alpha`.
- Confirm flows via `yarn workspace @selfxyz/mobile-app test`.

### 7. Android demo app

- Create `examples/android-demo/` with React Native CLI, wiring scanning and proof generation through the SDK.
- Provide setup instructions in `examples/android-demo/README.md`.
- Link the demo in the main `README.md`.

## Consolidation toward `@selfxyz/common`

- Move `calculateContentHash` and related catalog helpers from `app/src/providers/passportDataProvider.tsx` to `common/src/utils/documents/` and re-export via `@selfxyz/common`.
- Pull keychain wrappers like `storeDocument` into `common/src/utils/storage/passport.ts`.
- Publish shared analytics/auth adapters (currently in `app/src/utils/analytics.ts` and `app/src/providers/authProvider.tsx`) through a new package and re-export types from `@selfxyz/common`.
