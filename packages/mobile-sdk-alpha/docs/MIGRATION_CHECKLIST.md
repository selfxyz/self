# Migration Checklist

> Detailed task prompts are listed in [MIGRATION_PROMPTS.md](./MIGRATION_PROMPTS.md).

- [x] Group new capabilities into modular directories and re-export them from `src/index.ts` using named exports (initial stubs: `mrz/`, `qr/`).

## 1. Processing helpers (MRZ) ✅ COMPLETED

- [x] Finalize MRZ utilities.
- [x] Re-export helpers through the SDK entry point.
- [x] Create modular structure with `src/mrz/` and `src/qr/` modules.
- [x] Implement proper error handling using `notImplemented` helper.
- [x] Use type aliases instead of empty interfaces for better tree shaking.

## 2. Validation module ✅ COMPLETED

- [x] Port stateless document checks.
- [x] Cover validation logic with unit tests.

## 3. Proof input generation

- Port register and disclose TEE input helpers.

## 4. Crypto adapters

- Runtime-selectable adapter using WebCrypto with `@noble/*` fallbacks.
- Parity tests across implementations.
- Detect WebCrypto availability on React Native/Hermes environments.
- Ensure CSPRNG-backed random number generation.
- Use timing-safe comparison for secret values.

## 5. TEE session management

- WebSocket wrapper supporting abort, timeout, and progress events.

## 6. Attestation verification

- PCR0 check and public-key extraction.
- Minimal certificate-chain validation.

## 7. Protocol synchronization

- Fetch protocol trees with pagination and a TTL cache.
- Verify computed roots against server data.
- Implement rate limiting with exponential backoff and jitter.
- Set memory bounds for concatenated trees and honor Retry-After headers.

## 8. Artifact management

- Manifest schema & integrity verification.
- CDN downloads with caching and storage adapter.
- Verify manifest signature with pinned public key before caching.
- Enforce CDN allowlist and Content-Length checks.
- Stream hashing to avoid buffering large files.

## 9. React Native providers and hooks

- Decouple context providers and hooks from adapter implementations.
- Ensure providers accept adapter instances via props to avoid tight coupling.
- Map provider boundaries to existing architecture tasks for crypto, sessions, attestation, protocol sync, and artifact management.

## 10. Batteries-included components

- Ship minimal components (e.g., scanners, buttons) that compose existing hooks and providers.
- Expose configuration props for custom adapters while preserving sensible defaults.
- Cross-reference component usage with architecture guidelines and adapter tasks.

## 11. Sample applications

- React Native and web demos showcasing core flows.
- iOS `OpenPassport` URL scheme.

## 12. Integrate SDK into `/app`

- Consume `@selfxyz/mobile-sdk-alpha` inside the `app` workspace.
- Replace MRZ modules with SDK adapters and wire processing helpers.
- Validate builds and unit tests.

## 13. In-SDK lightweight demo

- Embedded React Native demo inside the SDK with theming hooks.
- Provide build and run instructions.
