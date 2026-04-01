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
- `packages/kmp-sdk-test-app/` — test app adaptation for 3-domain scope
- `packages/self-sdk-swift/` — ensure it integrates cleanly with scoped KMP

### Out of Scope

- Actual publishing to external Maven/SPM registries (that's a follow-up, equivalent to paused NS-08)
- `packages/native-shell-android/` and `packages/native-shell-ios/` — do not modify
- CI/CD pipeline changes

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
ls -la shared/build/XCFrameworks/
```

#### 3. Adapt kmp-sdk-test-app for 3-domain scope

**Location:** `packages/kmp-sdk-test-app/`

The test app currently exercises all KMP handlers including NFC and camera. Update it to only use the 3-domain scope.

**Android (`packages/kmp-sdk-test-app/androidApp/`):**

- Remove NFC and Camera permission requests from AndroidManifest.xml (if present)
- The app should rely on default providers (Activity auto-initializes `EncryptedSharedPreferencesProvider` and `AndroidKeystoreCryptoProvider` if not set). Alternatively, demonstrate explicit provider registration before launch:
  ```kotlin
  SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(context)
  SdkProviderRegistry.crypto = AndroidKeystoreCryptoProvider()
  ```
- Verify the app launches the SDK, loads the WebView, and handles lifecycle callbacks
- Verify crypto operations work (generateKey, getPublicKey, sign)
- Verify secure storage operations work (get, set, remove)

**iOS (`packages/kmp-sdk-test-app/iosApp/`):**

- Register only required providers: `secureStorage`, `crypto`, `webView`
- Remove registration of NFC, Camera, Biometric, Haptic, Documents providers
- Verify the app launches the SDK, loads the WebView, and handles lifecycle callbacks
- Ensure `self-sdk-web/` assets are in Copy Bundle Resources

#### 4. Run full test suite

```bash
# Common tests (bridge, routing, serialization, lifecycle)
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Verify no test failures from scoping changes
# Tests for NFC, Camera, MRZ should still pass (they test code, not registration)
```

#### 5. Update OVERVIEW.md module table

**File:** `specs/projects/sdk/OVERVIEW.md`

Update the module table (around line 110) to reflect KMP revival:

**Already done** — OVERVIEW.md module table was updated as part of the spec review on 2026-04-01. Verify it still reflects:

| Module                                       | Status                  | Notes                                                       |
| -------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| KMP Native Shell (`packages/kmp-sdk/`)       | Active (3-domain scope) | Serves KMP consumers, provider delegation on both platforms |
| Swift Providers (`packages/self-sdk-swift/`) | Active                  | iOS providers for KMP                                       |
| KMP Test App (`packages/kmp-sdk-test-app/`)  | Active                  | E2E harness                                                 |

### Files Modified

| File                                          | Change                               |
| --------------------------------------------- | ------------------------------------ |
| `packages/kmp-sdk-test-app/` (multiple files) | Scope to 3-domain handlers/providers |
| `specs/projects/sdk/OVERVIEW.md`              | Update module table with KMP status  |

### Files NOT Modified

- `packages/kmp-sdk/` — no code changes (KR-01 and KR-02 handle this)
- `packages/native-shell-*` — sibling implementations, unchanged

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
cd packages/kmp-sdk-test-app/androidApp && ../gradlew :androidApp:assembleDebug

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
- [ ] Crypto operations work in test app (generateKey, sign, getPublicKey)
- [ ] SecureStorage operations work in test app (get, set, remove)
- [ ] Lifecycle operations work in test app (ready, dismiss, setResult)
- [ ] OVERVIEW.md module table updated
- [ ] AAR size is smaller than pre-scoping (NFC/camera deps removed)
- [ ] Provider delegation works end-to-end on Android (default providers)
- [ ] Provider delegation works end-to-end on iOS (self-sdk-swift providers)

### Estimated PR Size

~200 LOC changed. Within the 1k–3k target.

### Status Log

- 2026-03-31: Plan created.
- 2026-04-01: Updated for provider delegation (KR-01 change). Added provider E2E validation. OVERVIEW.md already updated.
