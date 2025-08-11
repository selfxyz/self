# Migration Checklist

> Detailed task prompts are listed in [MIGRATION_PROMPTS.md](./MIGRATION_PROMPTS.md).

## 1. Scanning adapters & NFC lifecycle

- Define cross-platform scanner interfaces.
- Implement React Native MRZ and NFC adapters with screen-on hooks.
- Provide a sample flow chaining MRZ to NFC scanning.

## 2. Processing helpers (MRZ & NFC)

- Finalize MRZ utilities and add an NFC response parser.
- Re-export helpers through the SDK entry point.

## 3. Validation module

- Port stateless document checks.
- Cover validation logic with unit tests.

## 4. Protocol synchronization

- Fetch protocol trees with pagination and a TTL cache.
- Verify computed roots against server data.

## 5. Proof input generation

- Port register and disclose TEE input helpers.

## 6. TEE session management

- WebSocket wrapper supporting abort, timeout, and progress events.

## 7. Attestation verification

- PCR0 check and public-key extraction.
- Minimal certificate-chain validation.

## 8. Crypto adapters

- Runtime-selectable adapter using WebCrypto with `@noble/*` fallbacks.
- Parity tests across implementations.

## 9. Artifact management

- Manifest schema & integrity verification.
- CDN downloads with caching and storage adapter.

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
