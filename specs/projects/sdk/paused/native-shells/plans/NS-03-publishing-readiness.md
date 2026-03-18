# Publishing Readiness for AAR and XCFramework

> Last updated: 2026-03-10
> Status: Done (audit complete)

- Workstream: native-shells
- Backlog IDs: NS-03
- Owner: Native Shells
- Branch: N/A (audit-only, no code changes)
- PR: N/A

## Goal

Answer one question: **can MiniPay (or another host app) integrate the KMP SDK today?** Document what works, what doesn't, and the shortest path to a shippable artifact.

## Out of Scope

- Enterprise publishing (Maven Central signing, full POM compliance, CocoaPods).
- RN npm publishing.
- Feature changes to handlers or bridge contracts.

---

## Audit Results

### Android AAR

**Status: Builds and publishes to local Maven. Not yet configured for a remote repository.**

**Validated (ran locally on 2026-03-10):**

| Step                   | Command                                 | Result                                                                                                  |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Release AAR            | `./gradlew :shared:assembleRelease`     | `shared/build/outputs/aar/shared-release.aar`                                                           |
| Maven local publish    | `./gradlew :shared:publishToMavenLocal` | Installs AAR + POM + sources + Gradle metadata to `~/.m2/repository/xyz/self/sdk/shared-android/0.1.0/` |
| POM transitive deps    | Inspected generated POM                 | Declares kotlin-stdlib, webkit, jmrtd, bouncycastle, mlkit, camera, biometrics with correct scopes      |
| WebView asset bundling | `copyWebViewAssets` (runs on preBuild)  | Copies `webview-app/dist/` into Android assets                                                          |

**Not validated:** Consumer resolution (a separate Gradle project resolving `xyz.self.sdk:shared-android:0.1.0` from mavenLocal and compiling against it). The POM and Gradle metadata look correct but this hasn't been tested end-to-end from a clean consumer project.

**To ship to MiniPay:**

1. Add a `publishing { repositories {} }` block pointing to GitHub Packages (or any Maven repo MiniPay can reach). ~10 lines of Gradle config.
2. Bump version from `0.1.0` when ready.
3. Ideally, validate consumer resolution from a clean project before the first external handoff.

**Later (not blocking):** ProGuard consumer rules, CI publish job, Maven Central migration if needed.

### iOS KMP Framework / XCFramework

**Status: Builds. Shippable via local SPM path or manual XCFramework handoff.**

**What works:**

| Step                | Command                                                 | Result                                                 |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| XCFramework         | `./gradlew createXCFramework`                           | `SelfSdk.xcframework` (arm64 device + arm64 simulator) |
| SPM Package.swift   | Exists                                                  | Points to local XCFramework binary target              |
| Simulator framework | `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64` | Works                                                  |

**To ship to an iOS host app:**

1. Switch `createXCFramework` from debug to release framework variants. In `build.gradle.kts`, change `linkDebugFrameworkIos*` → `linkReleaseFrameworkIos*` in the `createXCFramework` task's `dependsOn` and path strings (~3 lines).
2. Build: `./gradlew createXCFramework` → `shared/build/xcframework/SelfSdk.xcframework`.
3. Zip + checksum: `zip -r SelfSdk-0.1.0.xcframework.zip SelfSdk.xcframework && swift package compute-checksum SelfSdk-0.1.0.xcframework.zip`.
4. Upload the zip to a GitHub Release (e.g., `kmp-sdk@0.1.0`) or any HTTPS-reachable location.
5. Update `packages/kmp-sdk/Package.swift` to use `.binaryTarget(name: "SelfSdk", url: "<release-url>", checksum: "<sha256>")` instead of the local path.
6. Tag the release. SPM consumers add the repo URL with the version tag.

**Ownership:** Whoever cuts the release owns steps 2–6. Version naming follows `packages/kmp-sdk/shared/build.gradle.kts` `version` field. Git tag format: `kmp-sdk@<version>`.

**Not yet decided:** Whether the host app consumes `SelfSdk.xcframework` (KMP) directly and adds `self-sdk-swift` as a separate SPM dependency, or whether a wrapper package bundles both. Current default: two separate dependencies — KMP XCFramework + Swift companion SPM package. This is fine for MiniPay (single known consumer) but should be revisited if the consumer count grows.

**Later (not blocking):** x86_64 simulator slice (Intel Macs), CocoaPods podspec, CI automation.

### Swift Companion Package (`self-sdk-swift`)

**Status: Works in Xcode and on real devices. `swift build` CLI fails (irrelevant for iOS distribution).**

**What works:**

- CI builds via `xcodebuild` for iOS Simulator
- Real-device NFC validated through KMP test app
- Providers wire into KMP iOS via `SdkProviderRegistry`

**Known issue:** `swift build` fails because OpenSSL headers don't resolve under SPM CLI on macOS. This doesn't affect iOS distribution (always goes through Xcode).

**To ship:**

1. The `NFCPassportReader` fork is private (`git@github.com:selfxyz/NFCPassportReader.git`). Any external consumer needs access. Simplest fix: make the fork public, or vendor it.
2. That's the only real blocker. Everything else (versioning, CI) is polish.

---

## Summary: What Blocks Shipping

| What                                                        | Effort         | Blocks                          |
| ----------------------------------------------------------- | -------------- | ------------------------------- |
| Add Maven repository target to Gradle                       | ~10 LOC config | Android distribution to MiniPay |
| Switch XCFramework to release variants                      | ~3 LOC config  | iOS production builds           |
| Host XCFramework somewhere reachable + update Package.swift | Small          | iOS SPM distribution            |
| Make NFCPassportReader fork accessible                      | Decision       | Any external iOS consumer       |

Everything else (Maven Central, GPG signing, full POM metadata, ProGuard rules, x86_64 slices, CocoaPods, CI publish jobs, version automation) is real work but doesn't block getting artifacts into MiniPay's hands.

---

## Validated Commands

```bash
cd packages/kmp-sdk && ./gradlew :shared:assembleRelease                      # ✅ AAR
cd packages/kmp-sdk && ./gradlew :shared:publishToMavenLocal                  # ✅ AAR + POM + sources + metadata to ~/.m2
cd packages/kmp-sdk && ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64   # ✅ iOS framework
cd packages/kmp-sdk && ./gradlew createXCFramework                            # ✅ XCFramework
cd packages/self-sdk-swift && swift build                                     # ❌ Known OpenSSL header issue (not a distribution blocker)
```

**Not yet validated:** Consumer resolution from a clean Gradle project. POM and metadata look correct but no end-to-end consume test has been run.

## Definition of Done

- [x] AAR generation path documented and validated
- [x] XCFramework or framework packaging path documented and validated
- [x] Remaining blockers explicitly listed
- [x] Backlog row updated

## Status Log

- 2026-03-10: Created from SDK publishing follow-up.
- 2026-03-10: Audit complete. Artifacts build. Four items block shipping to external consumers; all are small config or decision items.
