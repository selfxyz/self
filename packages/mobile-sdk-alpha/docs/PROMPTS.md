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

- Swap MRZ modules for SDK adapters.
- Ensure the app still builds and tests.

### 4. Proof input generation

- Move register and disclose helpers into `src/proving/`.
- Accept trees and other deps as function arguments.
- Cover both helpers with unit tests.

### 5. Crypto adapters

- Define a `CryptoAdapter` interface and a `timingSafeEqual` helper.
- Implement WebCrypto and noble versions and pick at runtime.
- Add parity tests between implementations.

### 6. TEE session management

- Wrap WebSockets with abort, timeout, and progress support.
- Test with a mocked server and document usage.

### 7. Attestation verification

- Port PCR0 check and public-key extraction.
- Add a minimal certificate-chain verifier.

### 8. Protocol synchronization

- Fetch protocol trees page by page and cache them.
- Verify computed roots and respect `Retry-After`.

### 9. Artifact management

- Define a manifest format and verify signatures.
- Download artifacts from an allow-listed CDN and stream-hash data.

### 10. React Native providers and hooks

- Extract `SelfClientProvider` and other contexts from the app.
- Expose hooks that consume these providers and accept adapter overrides.

### 11. Batteries-included components

- Build starter pieces (scanner, buttons) from existing hooks.
- Allow adapter overrides while keeping defaults.

### 12. Sample applications

- Create React Native and web demos showing core flows.
- Document the `OpenPassport` URL scheme for iOS.

### 13. In-SDK lightweight demo

- Embed a tiny demo app under the SDK with theming hooks.
- Include build and run docs.

## Architecture tasks

### 4. SDK lifecycle management

- Turn `createSelfClient` into a class with `initialize` and `deinitialize`.
- Store config on the instance.

### 5. Package targets

- Add exports for web builds and keep RN build first.
- Plan for future targets like Capacitor or Cordova.

### 6. Dogfood in `/app`

- Exercise real flows in the monorepo app.
- Replace remaining MRZ modules with SDK adapters.

### 7. Android demo app

- Scaffold a minimal RN Android project showing MRZ → proof.
- Document setup steps.

## Consolidation toward `@selfxyz/common`

- Extract document catalog helpers and keychain wrappers into `@selfxyz/common`.
- Move analytics and auth adapters to a shared package.
- Re-export storage types for reuse outside the mobile app.
