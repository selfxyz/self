# Migration Prompts

Each chapter from the migration checklist includes granular tasks below. Pick tasks independently to parallelize work.

## 1. Scanning adapters & NFC lifecycle

:::task-stub{title="Create scanning adapter interface"}

1. In `src/adapters/`, add `scanner.ts` exporting TypeScript interfaces for `MRZScanner` and `NFCScanner`.
2. Reference React Native camera/NFC packages only through these interfaces.
3. Document usage in `README.md`.
   :::

:::task-stub{title="Implement React Native MRZ adapter"}

1. Add `mrz-rn.ts` in `src/adapters/` implementing `MRZScanner` via `react-native-vision-camera`.
2. Expose configuration for permissions, preview, and result handling.
3. Write unit tests under `tests/` mocking camera output.
   :::

:::task-stub{title="Implement React Native NFC adapter"}

1. Create `nfc-rn.ts` in `src/adapters/` implementing `NFCScanner` with `react-native-nfc-manager`.
2. Provide lifecycle hooks so the app can call `keepScreenOn(true|false)` during sessions.
3. Document app-level setup in `MIGRATION_CHECKLIST.md`.
   :::

:::task-stub{title="Add scanning sample"}

1. Under `samples/`, add a React Native demo showing MRZ then NFC scanning.
2. Include simple error handling and log output.
3. Reference the sample from `README.md`.
   :::

## 2. Processing helpers (MRZ & NFC)

:::task-stub{title="Test MRZ parsing utilities"}

1. In `tests/processing/`, add test cases for `extractMRZInfo` and `formatDateToYYMMDD` covering valid/invalid inputs.
2. Use sample MRZ strings from ICAO specs for fixtures.
   :::

:::task-stub{title="Add NFC response parser"}

1. Create `src/processing/nfc.ts` exporting a pure function to parse NFC chip responses into DG1/DG2 structures.
2. Write tests in `tests/processing/nfc.test.ts`.
3. Ensure no React Native dependencies.
   :::

:::task-stub{title="Expose processing utilities"}

1. Update `src/index.ts` to re-export MRZ and NFC helpers.
2. Document them in `README.md` under a “Processing utilities” section.
   :::

## 3. Validation module

:::task-stub{title="Port minimal document validation"}

1. Create `src/validation/document.ts`.
2. Port `isPassportDataValid` logic without analytics or store calls.
3. Type the function using `PassportData` from `src/types/public.ts`.
   :::

:::task-stub{title="Test document validation"}

1. Add `tests/validation/document.test.ts` with cases for missing metadata and hash mismatches.
2. Run via `yarn workspace @selfxyz/mobile-sdk-alpha test`.
   :::

## 4. Protocol synchronization

:::task-stub{title="Add paginated tree fetch"}

1. Under `src/client/`, create `treeFetcher.ts` with `fetchTreePaginated(url, pageSize)` returning concatenated pages.
2. Handle pagination tokens from the backend.
3. Include retries for transient network errors.
   :::

:::task-stub{title="Introduce tree cache with TTL"}

1. In `treeFetcher.ts`, wrap results with an in-memory cache keyed by URL and `pageSize`.
2. Allow TTL configuration through SDK options.
3. Expose `clearExpired()` to purge stale entries.
   :::

:::task-stub{title="Implement root verification"}

1. After assembling the full tree, compute its root and compare to the server-provided root.
2. Throw descriptive errors on mismatch.
3. Add tests with mock data ensuring verification triggers.
   :::

## 5. Proof input generation

:::task-stub{title="Port generateTEEInputsRegister"}

1. Copy logic from `app/src/utils/proving/provingInputs.ts` lines 106-117 into `src/proving/registerInputs.ts`.
2. Replace `useProtocolStore` calls with parameters for `dscTree` and environment.
3. Ensure types align with `PassportData`.
   :::

:::task-stub{title="Port generateTEEInputsDisclose"}

1. Move disclosure-related logic into `src/proving/discloseInputs.ts`.
2. Accept OFAC trees and other dependencies as function parameters instead of store lookups.
3. Write unit tests for both register and disclose generators with mocked trees.
   :::

## 6. TEE session management

:::task-stub{title="Implement TEE WebSocket wrapper"}

1. Add `src/tee/session.ts` exporting `openSession(url, options)`.
2. Accept an `AbortSignal` and timeout; reject if aborted or timed out.
3. Emit progress events via an `EventEmitter` interface.
   :::

:::task-stub{title="Test and document TEE session"}

1. Write tests using a mocked WebSocket server verifying abort/timeout handling.
2. Update `README.md` with example code showing progress listener usage.
   :::

## 7. Attestation verification

:::task-stub{title="Port basic attestation verification"}

1. In `src/attestation/verify.ts`, port `checkPCR0Mapping` and `getPublicKey` without logging.
2. Replace on-chain contract calls with parameters or pluggable providers.
3. Provide TypeScript types for attestation documents.
   :::

:::task-stub{title="Implement certificate chain check"}

1. Port simplified `verifyCertChain` from `attest.ts` ensuring no Node-specific APIs.
2. Add unit tests with mock certificates to cover success and failure paths.
   :::

## 8. Crypto adapters

:::task-stub{title="Create CryptoAdapter"}

1. In `src/crypto/`, add `adapter.ts` defining methods for hashing, random bytes, and asymmetric operations.
2. Document required methods (e.g., `digest`, `getRandomValues`, `subtle` operations).
   :::

:::task-stub{title="Implement crypto adapters"}

1. Add `webcrypto.ts` implementing the interface using `globalThis.crypto`.
2. Add `noble.ts` using `@noble/hashes` and `@noble/curves` where WebCrypto is unavailable.
3. Export a factory that chooses the appropriate adapter at runtime.
4. Provide tests ensuring both adapters yield identical results for sample inputs.
   :::

## 9. Artifact management

:::task-stub{title="Add artifact manifest schema"}

1. In `src/artifacts/`, create `manifest.ts` defining the JSON schema (name, version, urls, hashes).
2. Implement a function `verifyManifest(manifest, signature)` that validates hashes and schema.
   :::

:::task-stub{title="Download and cache artifacts"}

1. Create `downloader.ts` that fetches artifact files from a CDN, verifies integrity, and stores them via a pluggable storage adapter.
2. Support cache lookup before network fetch and provide `clearCache()` helper.
3. Add tests mocking fetch and storage layers.
   :::

## 10. Sample applications

:::task-stub{title="Add React Native sample"}

1. Under `samples/react-native/`, scaffold a bare-bones app using Expo or React Native CLI.
2. Demonstrate MRZ scanning, NFC reading, and registration flow using SDK APIs.
3. Include instructions in a `README.md`.
   :::

:::task-stub{title="Add web sample"}

1. Under `samples/web/`, set up a Vite/React project showing browser-based MRZ input and proof generation.
2. Document setup and build steps.
   :::

:::task-stub{title="Configure OpenPassport scheme"}

1. In the React Native sample’s iOS project, add URL type `OpenPassport` to `Info.plist`.
2. Document how the scheme is used for callback flows.
   :::

## 11. Integrate SDK into `/app`

:::task-stub{title="Integrate SDK in /app"}

1. Add `@selfxyz/mobile-sdk-alpha` to `app/package.json`.
2. Replace existing MRZ/NFC scanning modules with SDK adapters.
3. Wire app screens to SDK processing and validation helpers.
4. Validate builds and unit tests in the `app` workspace.
   :::

## 12. In-SDK lightweight demo

:::task-stub{title="Create embedded demo app"}

1. Scaffold `demo/` under the SDK as a minimal React Native project.
2. Use SDK APIs for MRZ → NFC → registration flow.
3. Expose simple theming configuration.
4. Add `demo/README.md` with build/run instructions.
   :::
