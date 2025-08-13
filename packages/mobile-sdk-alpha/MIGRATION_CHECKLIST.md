# Migration Checklist

> Detailed task prompts are listed in [MIGRATION_PROMPTS.md](./MIGRATION_PROMPTS.md).

## 1. Processing helpers (MRZ & NFC)

- [x] Finalize MRZ utilities and add an NFC response parser.
- [x] Re-export helpers through the SDK entry point.

## 2. Validation module

- Port stateless document checks.
- Cover validation logic with unit tests.

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

## 9. Scanning adapters & NFC lifecycle

- Define cross-platform scanner interfaces.
- Implement React Native MRZ and NFC adapters with screen-on hooks.
- Provide a sample flow chaining MRZ to NFC scanning.

## 10. Sample applications

- React Native and web demos showcasing core flows.
- iOS `OpenPassport` URL scheme.

## 11. Integrate SDK into `/app`

- Consume `@selfxyz/mobile-sdk-alpha` inside the `app` workspace.
- Replace MRZ/NFC modules with SDK adapters and wire processing helpers.
- Validate builds and unit tests.

## 12. In-SDK lightweight demo

- Embedded React Native demo inside the SDK with theming hooks.
- Provide build and run instructions.

## 13. Partner feedback

- OAuth-style branding: logo, colors, copy, optional fonts.
- Callback hook so the host app can trigger push notifications after async proof verification.
- Expand ID document coverage for US digital licenses and AADHAR.
- Document bundle size targets and provide a runnable integration example.
