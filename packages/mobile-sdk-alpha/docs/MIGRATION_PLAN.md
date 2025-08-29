# Mobile SDK Migration Plan

This is the running to‑do list for the mobile SDK. When you wrap up a task, move it to [MIGRATION_COMPLETED.md](./MIGRATION_COMPLETED.md) so we keep a record.

## Migration tasks

### 3. Bring the SDK into `/app`

- [ ] Swap the MRZ modules for the SDK’s adapters
- [ ] Make sure the app still builds and the unit tests pass

### 4. Generate proof inputs

- [ ] Port helpers that prep register and disclose inputs for the TEE

### 5. Crypto adapters

- [ ] Pick WebCrypto or noble at runtime
- [ ] Cross‑check outputs between the two
- [ ] Detect WebCrypto support when running on React Native/Hermes
- [ ] Guarantee random bytes come from a CSPRNG
- [ ] Compare secrets with a timing-safe helper

### 6. TEE session management

- [ ] Wrap WebSockets so we can handle aborts, timeouts, and progress events

### 7. Attestation verification

- [ ] Check PCR0 and extract the public key
- [ ] Add a lightweight certificate chain check

### 8. Protocol synchronization

- [ ] Fetch protocol trees with pagination and a short TTL cache
- [ ] Verify computed roots against server data
- [ ] Rate‑limit with exponential backoff and jitter
- [ ] Cap memory use and honor `Retry‑After` headers

### 9. React Native providers and hooks

- [ ] Decouple context providers and hooks from adapter implementations
- [ ] Move `SelfClientProvider` and its adapters into the SDK, exposing adapter props
- [ ] Accept adapter instances via props to avoid tight coupling
- [ ] Map provider boundaries to the architecture tasks for crypto, sessions, attestation, protocol sync, and artifacts

### 10. Batteries‑included components

- [ ] Ship minimal components (e.g., scanners, buttons) that compose existing hooks and providers
- [ ] Expose configuration props for custom adapters while keeping sensible defaults
- [ ] Link component usage to architecture guidelines and adapter tasks

### 11. Sample applications

- [ ] React Native and web demos showcasing core flows
- [ ] iOS `OpenPassport` URL scheme

### 12. In‑SDK lightweight demo

- [ ] Embed a small React Native demo inside the SDK with theming hooks
- [ ] Provide build and run instructions

## Architecture tasks

### 4. Manage the SDK lifecycle

- [ ] Turn `createSelfClient` into a class
- [ ] Add `initialize()` and `deinitialize()` hooks
- [ ] Keep config on the instance instead of globals

### 5. Package targets

- [ ] Keep the React Native build first
- [ ] Add entry points for web builds
- [ ] Lay groundwork for future targets like Capacitor or Cordova

### 6. Dogfood in `/app`

- [ ] Validate real flows
- [ ] Replace MRZ modules with SDK adapters

### 7. Android demo app

- [ ] Ship a minimal React Native Android project
- [ ] Demonstrate MRZ → proof generation flow
- [ ] Provide build and run instructions

## Consolidation toward `@selfxyz/common`

- [ ] Pull document catalog helpers and keychain wrappers out of the app and into `@selfxyz/common`
- [ ] Share analytics and auth adapters through a common or dedicated package
- [ ] Re-export storage types so other apps can reuse them without the mobile app context
