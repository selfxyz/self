## Validate Build Artifacts and Test App

> Last updated: 2026-04-01
> Status: Ready

- Workstream: kmp-revival
- Backlog IDs: KR-03
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

After KR-01 (Android parity) and KR-02 (iOS parity), you need to validate that the scoped KMP SDK produces clean publishable artifacts and that the test app exercises the full 3-domain WebView flow on both platforms. This validates that a KMP consumer can actually integrate the SDK end-to-end.

### Scope

- `packages/kmp-sdk/` — build artifact validation
- `packages/kmp-sdk-test-app/` — simplify the test harness to validate only the 3-domain contract end-to-end
- `packages/self-sdk-swift/` — ensure it integrates cleanly with scoped KMP without requiring registration of optional providers

### Out of Scope

- Actual publishing to external Maven/SPM registries (that's a follow-up, equivalent to paused NS-08)
- `packages/native-shell-android/` and `packages/native-shell-ios/` — do not modify
- CI/CD pipeline changes
- Android dependency trimming or Android manifest slimming inside `packages/kmp-sdk/` — that ownership belongs to KR-01; KR-03 validates the result
- Removing retained NFC / biometric Swift provider code or dependencies from `packages/self-sdk-swift/` — validate current integration shape, do not redesign it here

### Implementation Steps

#### 1. Validate Android AAR build

```bash
cd packages/kmp-sdk

# Debug build
./gradlew :shared:assembleDebug

# Release build
./gradlew :shared:assembleRelease

# Verify artifact exists and is reasonable size
ls -la shared/build/outputs/aar/shared-release.aar
# Should be significantly smaller than before (NFC/camera/biometric deps removed)

# Local Maven publish
./gradlew :shared:publishToMavenLocal
ls ~/.m2/repository/xyz/self/sdk/shared/
```

#### 2. Validate iOS XCFramework build

```bash
cd packages/kmp-sdk

# Framework build
./gradlew :shared:linkDebugFrameworkIosSimulatorArm64

# XCFramework (requires both arm64 and simulator targets)
./gradlew createXCFramework

# Verify output
ls -la shared/build/xcframework/
```

#### 3. Adapt kmp-sdk-test-app for 3-domain scope

**Location:** `packages/kmp-sdk-test-app/`

The current test app still contains a full MRZ/NFC-oriented verification flow. KR-03 should simplify the harness so its primary job is validating the 3-domain KMP contract, not preserving the older full-verification demo.

**Decision:** gut the MRZ/NFC-first flow from the default harness rather than gating it behind a flag. Keep the test app focused on `secureStorage`, `crypto`, and `lifecycle`.

**Expected harness behavior**

- The default app flow should expose a simple, repeatable smoke-test path for the 3 bridge domains.
- Avoid UI paths that require camera, NFC, biometrics, or documents to demonstrate success.
- Existing MRZ/NFC-specific state, screens, and tests may be removed or aggressively simplified if they do not serve the 3-domain validation goal.

**Android (`packages/kmp-sdk-test-app/composeApp/` and platform wrappers):**

- Remove test-app-level NFC and camera permission requests from Android manifests if they are only used by the deleted MRZ/NFC flows
- The app should rely on default providers (Activity auto-initializes `EncryptedSharedPreferencesProvider` and `AndroidKeystoreCryptoProvider` if not set). Alternatively, demonstrate explicit provider registration before launch:
  ```kotlin
  SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(context)
  SdkProviderRegistry.crypto = AndroidKeystoreCryptoProvider()
  ```
- Verify the app launches the SDK, loads the WebView, and handles lifecycle callbacks
- Provide a visible pass/fail mechanism for each scoped domain check

**iOS (`packages/kmp-sdk-test-app/iosApp/`):**

- Register only required providers: `secureStorage`, `crypto`, `webView`
- Remove registration of NFC, Camera, Biometric, Haptic, Documents providers
- Verify the app launches the SDK, loads the WebView, and handles lifecycle callbacks
- Ensure `self-sdk-web/` assets are in Copy Bundle Resources
- Do not require registration of retained optional providers from `self-sdk-swift`

#### 4. Add scripted domain smoke checks to the test app

Manual "launch and eyeball it" validation is not enough. Add one explicit smoke check per scoped domain, surfaced through the test app UI or logs so a human can run the same sequence on both platforms.

**Required checks**

- `secureStorage`: write a value, read it back, remove it, then confirm a subsequent read returns `null`
- `crypto`: generate a key, fetch the public key, sign a message, and log the returned artifacts
- `lifecycle`: trigger `ready`, then `setResult`, and confirm the Activity / view controller returns control to the host with the expected result payload

These do not need to be Espresso/XCUITest. A deterministic in-app smoke-test button or scripted harness flow is sufficient if it produces clear pass/fail output.

#### 5. Run full test suite

```bash
# Common tests (bridge, routing, serialization, lifecycle)
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Verify no test failures from scoping changes
# Tests for NFC, Camera, MRZ should still pass (they test code, not registration)
```

#### 6. Update OVERVIEW.md module table

**File:** `specs/projects/sdk/OVERVIEW.md`

Update the module table (around line 110) to reflect KMP revival:

**Already done** — OVERVIEW.md module table was updated as part of the spec review on 2026-04-01. Verify it still reflects:

| Module                                       | Status                  | Notes                                                       |
| -------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| KMP Native Shell (`packages/kmp-sdk/`)       | Active (3-domain scope) | Serves KMP consumers, provider delegation on both platforms |
| Swift Providers (`packages/self-sdk-swift/`) | Active                  | iOS providers for KMP                                       |
| KMP Test App (`packages/kmp-sdk-test-app/`)  | Active                  | E2E harness                                                 |

### Files Modified

| File                                          | Change                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/kmp-sdk-test-app/` (multiple files) | Remove MRZ/NFC-first default flow, scope harness to 3-domain handlers/providers, add scripted domain checks |
| `specs/projects/sdk/OVERVIEW.md`              | Update module table with KMP status                                                                         |

### Files NOT Modified

- `packages/kmp-sdk/` — no new feature work; KR-03 only validates the artifact shape produced by KR-01 and KR-02
- `packages/native-shell-*` — sibling implementations, unchanged
- `packages/self-sdk-swift/` retained optional provider code/dependencies — validate integration shape, do not slim package contents here

### Preconditions

- KR-01 complete (Android parity)
- KR-02 complete (iOS parity)

### Validation

```bash
# Full Android validation
cd packages/kmp-sdk && ./gradlew :shared:assembleRelease && ./gradlew :shared:jvmTest && ./gradlew :shared:publishToMavenLocal

# Full iOS validation
cd packages/kmp-sdk && ./gradlew createXCFramework
cd packages/self-sdk-swift && swift build

# Test app Android build
cd packages/kmp-sdk-test-app && ./gradlew :composeApp:assembleDebug

# Test app iOS build (Xcode required)
# Open packages/kmp-sdk-test-app/iosApp/ in Xcode and build for simulator
```

### Definition of Done

- [ ] Android AAR builds (debug + release) with no errors
- [ ] iOS XCFramework builds with no errors
- [ ] Local Maven publish succeeds
- [ ] All jvmTest tests pass
- [ ] Test app Android builds and runs
- [ ] Test app iOS builds and runs
- [ ] Default test-app flow no longer depends on MRZ/NFC/camera features
- [ ] Test app exposes deterministic smoke checks for each scoped domain
- [ ] Crypto smoke check passes in test app (generateKey, sign, getPublicKey)
- [ ] SecureStorage smoke check passes in test app (get, set, remove)
- [ ] Lifecycle smoke check passes in test app (`ready`, `setResult`, host returns to caller)
- [ ] OVERVIEW.md module table updated
- [ ] AAR size is smaller than pre-scoping (validated result of KR-01 Android slimming)
- [ ] Provider delegation works end-to-end on Android (default providers)
- [ ] Provider delegation works end-to-end on iOS (`self-sdk-swift` registers only the required providers for scoped flow)

### Estimated PR Size

~200 LOC changed. Within the 1k–3k target.

### Status Log

- 2026-03-31: Plan created.
- 2026-04-01: Updated for provider delegation (KR-01 change). Added provider E2E validation. OVERVIEW.md already updated.
- 2026-04-01: Clarified XCFramework output path, moved Android slimming ownership fully into KR-01, and made KR-03 require a simplified 3-domain test harness with explicit smoke checks.
