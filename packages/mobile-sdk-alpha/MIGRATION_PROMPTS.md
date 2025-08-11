# Migration Prompts

Each chapter from the migration checklist includes granular tasks below. Pick tasks independently to parallelize work.

> **Note**: This document uses standard Markdown `<details>` and `<summary>` tags for collapsible task sections, ensuring proper rendering on GitHub and other Markdown viewers.

## 1. Processing helpers (MRZ & NFC)

<details>
<summary><strong>Test MRZ parsing utilities</strong></summary>

1. In `tests/processing/`, add test cases for `extractMRZInfo` and `formatDateToYYMMDD` covering valid/invalid inputs.
2. Use sample MRZ strings from ICAO specs for fixtures.

</details>

<details>
<summary><strong>Add NFC response parser</strong></summary>

1. Create `src/processing/nfc.ts` exporting a pure function to parse NFC chip responses into DG1/DG2 structures.
2. Write tests in `tests/processing/nfc.test.ts`.
3. Ensure no React Native dependencies.

</details>

<details>
<summary><strong>Expose processing utilities</strong></summary>

1. Update `src/index.ts` to re-export MRZ and NFC helpers.
2. Document them in `README.md` under a "Processing utilities" section.

</details>

## 2. Validation module

<details>
<summary><strong>Port minimal document validation</strong></summary>

1. Create `src/validation/document.ts`.
2. Port `isPassportDataValid` logic without analytics or store calls.
3. Type the function using `PassportData` from `src/types/public.ts`.

</details>

<details>
<summary><strong>Test document validation</strong></summary>

1. Add `tests/validation/document.test.ts` with cases for missing metadata and hash mismatches.
2. Run via `yarn workspace @selfxyz/mobile-sdk-alpha test`.

</details>

## 3. Proof input generation

<details>
<summary><strong>Port generateTEEInputsRegister</strong></summary>

1. Copy logic from `app/src/utils/proving/provingInputs.ts` lines 106-117 into `src/proving/registerInputs.ts`.
2. Replace `useProtocolStore` calls with parameters for `dscTree` and environment.
3. Ensure types align with `PassportData`.

</details>

<details>
<summary><strong>Port generateTEEInputsDisclose</strong></summary>

1. Move disclosure-related logic into `src/proving/discloseInputs.ts`.
2. Accept OFAC trees and other dependencies as function parameters instead of store lookups.
3. Write unit tests for both register and disclose generators with mocked trees.

</details>

## 4. Crypto adapters

<details>
<summary><strong>Create CryptoAdapter</strong></summary>

1. In `src/crypto/`, add `adapter.ts` defining methods for hashing, random bytes, and asymmetric operations.
2. Document required methods (e.g., `digest`, `getRandomValues`, `subtle` operations).
3. Add a constant-time `timingSafeEqual(a, b)` utility and document RNG requirements (cryptographically secure only).
4. Implement environment detection for WebCrypto (detect globalThis.crypto and feature-check subtle/digest/getRandomValues).
5. Provide fallback to react-native-get-random-values or noble-based adapter when WebCrypto unavailable.
6. Ensure all secret comparisons use constant-time comparison instead of ===.

</details>

<details>
<summary><strong>Implement crypto adapters</strong></summary>

1. Add `webcrypto.ts` implementing the interface using `globalThis.crypto`.
2. Add `noble.ts` using `@noble/hashes` and `@noble/curves` where WebCrypto is unavailable.
3. Export a factory that chooses the appropriate adapter at runtime.
4. Provide tests ensuring both adapters yield identical results for sample inputs.
5. In noble adapter: select well-known safe curves (secp256r1/ed25519) and recommended hash algorithms.
6. Ensure sensitive buffers are zeroized after use where possible.
7. Add tests for constant-time comparator and RNG fallback behavior.

</details>

## 5. TEE session management

<details>
<summary><strong>Implement TEE WebSocket wrapper</strong></summary>

1. Add `src/tee/session.ts` exporting `openSession(url, options)`.
2. Accept an `AbortSignal` and timeout; reject if aborted or timed out.
3. Emit progress events via an `EventEmitter` interface.

</details>

<details>
<summary><strong>Test and document TEE session</strong></summary>

1. Write tests using a mocked WebSocket server verifying abort/timeout handling.
2. Update `README.md` with example code showing progress listener usage.

</details>

## 6. Attestation verification

<details>
<summary><strong>Port basic attestation verification</strong></summary>

1. In `src/attestation/verify.ts`, port `checkPCR0Mapping` and `getPublicKey` without logging.
2. Replace on-chain contract calls with parameters or pluggable providers.
3. Provide TypeScript types for attestation documents.
4. Validate attestation timestamps against device clock with configurable skew tolerance.
5. Define trust anchors and key pinning strategy for PCR0/public key mapping.
6. Add optional OCSP/CRL checks with network fallbacks and clear opt-out rationale.

</details>

<details>
<summary><strong>Implement certificate chain check</strong></summary>

1. Port simplified `verifyCertChain` from `attest.ts` ensuring no Node-specific APIs.
2. Add unit tests with mock certificates to cover success and failure paths.

</details>

## 7. Protocol synchronization

<details>
<summary><strong>Add paginated tree fetch</strong></summary>

1. Under `src/client/`, create `treeFetcher.ts` with `fetchTreePaginated(url, pageSize)` returning concatenated pages.
2. Handle pagination tokens from the backend.
3. Include retries for transient network errors.

</details>

<details>
<summary><strong>Introduce tree cache with TTL</strong></summary>

1. In `treeFetcher.ts`, wrap results with an in-memory cache keyed by URL and `pageSize`.
2. Allow TTL configuration through SDK options.
3. Expose `clearExpired()` to purge stale entries.

</details>

<details>
<summary><strong>Implement root verification</strong></summary>

1. After assembling the full tree, compute its root and compare to the server-provided root.
2. Throw descriptive errors on mismatch.
3. Add tests with mock data ensuring verification triggers.

</details>

## 8. Artifact management

<details>
<summary><strong>Add artifact manifest schema</strong></summary>

1. In `src/artifacts/`, create `manifest.ts` defining the JSON schema (name, version, urls, hashes).
2. Implement `verifyManifest(manifest, signature, publisherKey)` that validates schema and signature using a pinned publisher key. Only then validate per-file hashes.
3. Verify manifest signature against pinned public key before any caching or storage access.
4. Enforce CDN/domain allowlist and validate response Content-Length header against expected sizes.
5. Compute and verify streaming hash while downloading to avoid buffering full files in memory.

</details>

<details>
<summary><strong>Download and cache artifacts</strong></summary>

1. Create `downloader.ts` that fetches artifact files from a CDN, verifies integrity, and stores them via a pluggable storage adapter.
2. Support cache lookup before network fetch and provide `clearCache()` helper.
3. Add tests mocking fetch and storage layers.
4. Stream HTTP responses into hash verifier (do not buffer full files).
5. Verify Content-Length matches bytes read to detect truncation.
6. Validate download host against allowed-domains whitelist.
7. Only write to persistent storage after both signature and per-file hash verification succeed.

</details>

## 9. Scanning adapters & NFC lifecycle

<details>
<summary><strong>Create scanning adapter interface</strong></summary>

1. In `src/adapters/`, add `scanner.ts` exporting TypeScript interfaces for `MRZScanner` and `NFCScanner`.
2. Reference React Native camera/NFC packages only through these interfaces.
3. Document usage in `README.md`. Include a "Privacy & PII" subsection: forbid logging MRZ/NFC data, enable on-device processing only, and provide redaction utilities for debug.
4. Never log MRZ strings, NFC APDUs, or chip contents anywhere (including telemetry).
5. Ensure camera frames and NFC/APDU processing occur on-device with analytics disabled for those paths by default.
6. Provide a redact/sanitize helper function for debug builds only.

</details>

<details>
<summary><strong>Implement React Native MRZ adapter</strong></summary>

1. Add `mrz-rn.ts` in `src/adapters/` implementing `MRZScanner` via `react-native-vision-camera`.
2. Expose configuration for permissions, preview, and result handling.
3. Write unit tests under `tests/` mocking camera output.

</details>

<details>
<summary><strong>Implement React Native NFC adapter</strong></summary>

1. Create `nfc-rn.ts` in `src/adapters/` implementing `NFCScanner` with `react-native-nfc-manager`.
2. Provide lifecycle hooks so the app can call `keepScreenOn(true|false)` during sessions.
3. Document app-level setup in `MIGRATION_CHECKLIST.md`.

</details>

<details>
<summary><strong>Add scanning sample</strong></summary>

1. Under `samples/`, add a React Native demo showing MRZ then NFC scanning.
2. Include simple error handling and log output.
3. Reference the sample from `README.md`.

</details>

## 10. Sample applications

<details>
<summary><strong>Add React Native sample</strong></summary>

1. Under `samples/react-native/`, scaffold a bare-bones app using Expo or React Native CLI.
2. Demonstrate MRZ scanning, NFC reading, and registration flow using SDK APIs.
3. Include instructions in a `README.md`.

</details>

<details>
<summary><strong>Add web sample</strong></summary>

1. Under `samples/web/`, set up a Vite/React project showing browser-based MRZ input and proof generation.
2. Document setup and build steps.

</details>

<details>
<summary><strong>Configure OpenPassport scheme</strong></summary>

1. In the React Native sample's iOS project, add URL type `OpenPassport` to `Info.plist`.
2. Document Android intent filters (AndroidManifest.xml). Ensure scheme uniqueness and validate redirect origins to prevent hijacking.
3. Choose a scheme unique to your app (e.g., using reverse-domain or app-identifier prefix).
4. Detect and handle collisions (fallback checks, verify caller package/signature).
5. Verify redirect domains and consider app-claimed links/Android App Links and iOS Universal Links for stronger security.

</details>

## 11. Integrate SDK into `/app`

<details>
<summary><strong>Integrate SDK in /app</strong></summary>

1. Add `@selfxyz/mobile-sdk-alpha` to `app/package.json`.
2. Replace existing MRZ/NFC scanning modules with SDK adapters.
3. Wire app screens to SDK processing and validation helpers.
4. Validate builds and unit tests in the `app` workspace.

</details>

## 12. In-SDK lightweight demo

<details>
<summary><strong>Create embedded demo app</strong></summary>

1. Scaffold `demo/` under the SDK as a minimal React Native project.
2. Use SDK APIs for MRZ → NFC → registration flow.
3. Expose simple theming configuration.
4. Add `demo/README.md` with build/run instructions.
5. Add publishing guardrails: exclude `demo/` from npm and add a CI step to verify the published tarball contents.

</details>
