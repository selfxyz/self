# Mobile SDK Migration Plan

This plan consolidates remaining migration and architecture tasks for the mobile SDK. Completed items are tracked in [MIGRATION_COMPLETED.md](./MIGRATION_COMPLETED.md).

## Migration tasks

### 3. Proof input generation

- [ ] Port register and disclose TEE input helpers

### 4. Crypto adapters

- [ ] Runtime-selectable adapter using WebCrypto with @noble/\* fallbacks
- [ ] Parity tests across implementations
- [ ] Detect WebCrypto availability on React Native/Hermes
- [ ] Ensure CSPRNG-backed random number generation
- [ ] Use timing-safe comparison for secret values

### 5. TEE session management

- [ ] WebSocket wrapper supporting abort, timeout, and progress events

### 6. Attestation verification

- [ ] PCR0 check and public-key extraction
- [ ] Minimal certificate-chain validation

### 7. Protocol synchronization

- [ ] Fetch protocol trees with pagination and a TTL cache
- [ ] Verify computed roots against server data
- [ ] Implement rate limiting with exponential backoff and jitter
- [ ] Set memory bounds for concatenated trees and honor Retry-After headers

### 8. Artifact management

- [ ] Manifest schema & integrity verification
- [ ] CDN downloads with caching and storage adapter
- [ ] Verify manifest signature with pinned public key before caching
- [ ] Enforce CDN allowlist and Content-Length checks
- [ ] Stream hashing to avoid buffering large files

### 9. React Native providers and hooks

- [ ] Decouple context providers and hooks from adapter implementations
- [ ] Ensure providers accept adapter instances via props to avoid tight coupling
- [ ] Map provider boundaries to architecture tasks for crypto, sessions, attestation, protocol sync, and artifact management

### 10. Batteries-included components

- [ ] Ship minimal components (e.g., scanners, buttons) that compose existing hooks and providers
- [ ] Expose configuration props for custom adapters while preserving sensible defaults
- [ ] Cross-reference component usage with architecture guidelines and adapter tasks

### 11. Sample applications

- [ ] React Native and web demos showcasing core flows
- [ ] iOS `OpenPassport` URL scheme

### 12. Integrate SDK into `/app`

- [ ] Replace MRZ modules with SDK adapters
- [ ] Validate builds and unit tests

### 13. In-SDK lightweight demo

- [ ] Embedded React Native demo inside the SDK with theming hooks
- [ ] Provide build and run instructions

## Architecture tasks

### 4. SDK lifecycle management

- [ ] Evolve `createSelfClient` into an SDK class
- [ ] Add `initialize`/`deinitialize` methods
- [ ] Implement stored config management

### 5. Package targets

- [ ] Keep React Native build first
- [ ] Scaffold entry points for web environments
- [ ] Prepare for future environments (Capacitor/Cordova)

### 6. Dogfood in `/app`

- [ ] Validate real flows
- [ ] Replace existing MRZ modules with SDK adapters

### 7. Android demo app

- [ ] Ship a minimal React Native Android project
- [ ] Demonstrate MRZ → proof generation flow
- [ ] Provide build and run instructions
