# Mobile SDK Migration Plan

Here’s the running list of work left for the mobile SDK. When something is finished, move it to [MIGRATION_COMPLETED.md](./MIGRATION_COMPLETED.md).

## Migration tasks

### 3. Proof input generation

- [ ] Port helpers that prepare register and disclose inputs for the TEE

### 4. Crypto adapters

- [ ] Choose between WebCrypto and noble implementations at runtime
- [ ] Cross-check results between implementations
- [ ] Detect WebCrypto support on React Native/Hermes
- [ ] Guarantee random bytes come from a CSPRNG
- [ ] Compare secrets with a timing-safe helper

### 5. TEE session management

- [ ] Wrap WebSockets to handle aborts, timeouts, and progress events

### 6. Attestation verification

- [ ] Check PCR0 and extract the public key
- [ ] Add a lightweight certificate chain check

### 7. Protocol synchronization

- [ ] Fetch protocol trees with pagination and a TTL cache
- [ ] Verify computed roots against server data
- [ ] Rate-limit with exponential backoff and jitter
- [ ] Cap memory use and honor `Retry-After` headers

### 8. Artifact management

- [ ] Define a manifest schema and verify integrity
- [ ] Download from a CDN with caching and a storage adapter
- [ ] Verify manifest signatures with a pinned public key before caching
- [ ] Enforce an allowlist and validate `Content-Length`
- [ ] Hash streams to avoid buffering large files

### 9. React Native providers and hooks

- [ ] Decouple context providers and hooks from adapter implementations
- [ ] Accept adapter instances via props to avoid tight coupling
- [ ] Map provider boundaries to the architecture tasks for crypto, sessions, attestation, protocol sync, and artifacts

### 10. Batteries-included components

- [ ] Ship minimal components (e.g., scanners, buttons) that compose existing hooks and providers
- [ ] Expose configuration props for custom adapters while keeping sane defaults
- [ ] Link component usage to architecture guidelines and adapter tasks

### 11. Sample applications

- [ ] React Native and web demos showcasing core flows
- [ ] iOS `OpenPassport` URL scheme

### 12. Integrate SDK into `/app`

- [ ] Replace MRZ modules with SDK adapters
- [ ] Validate builds and unit tests

### 13. In-SDK lightweight demo

- [ ] Embed a small React Native demo inside the SDK with theming hooks
- [ ] Provide build and run instructions

## Architecture tasks

### 4. SDK lifecycle management

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
