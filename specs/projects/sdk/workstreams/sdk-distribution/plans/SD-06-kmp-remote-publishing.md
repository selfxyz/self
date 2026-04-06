## KMP Remote Publishing (Maven + SPM)

> Last updated: 2026-04-06
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-06
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The KMP SDK (`packages/kmp-sdk/`) already has `maven-publish` configured and produces both AAR and XCFramework artifacts (validated by KR-03). What's missing is the remote publishing configuration: a Maven repository target for Android consumers and a hosted XCFramework URL for iOS/SPM consumers. Without this, integrators must build from source or use local artifacts.

### Scope

- Add remote Maven repository configuration to `packages/kmp-sdk/shared/build.gradle.kts`
- Switch `createXCFramework` task from debug to release variants
- Update `packages/kmp-sdk/Package.swift` from local path to remote URL + checksum

### Out of Scope

- Maven Central account setup / GPG signing (ops task, not code)
- CI/CD automated publishing pipeline
- CDN or hosting infrastructure for XCFramework ZIP
- KMP source code changes (owned by kmp-revival workstream)
- Native shell publishing (SD-04, SD-05)
- NFC / biometric handler registration or dependency changes
- NFCPassportReader fork accessibility (known limitation, does not block 3-domain distribution)

### Preconditions

- KR-03 complete (build artifacts validated locally, `publishToMavenLocal` succeeds, XCFramework builds)

### Files to Modify

- `packages/kmp-sdk/shared/build.gradle.kts` — Add `publishing { repositories { maven { ... } } }` block for remote Maven repo. Switch `createXCFramework` task dependencies from `linkDebugFramework*` to `linkReleaseFramework*` and update framework paths from `debugFramework` to `releaseFramework`.
- `packages/kmp-sdk/Package.swift` — Change `.binaryTarget` from local `path:` to remote `url:` + `checksum:`.

### Files NOT to Modify

- `packages/kmp-sdk/shared/src/` — No source code changes
- `packages/native-shell-android/` — Separate publishing (SD-04)
- `packages/native-shell-ios/` — Separate publishing (SD-05)
- `packages/webview-app/` — Upstream, do not change
- `packages/self-sdk-swift/` — iOS provider package, unchanged

### Implementation Details

#### 1. Add remote Maven repository configuration

**File:** `packages/kmp-sdk/shared/build.gradle.kts`

The `maven-publish` plugin is already applied (line 7). `publishLibraryVariants("release")` is already set (line 17). The Gradle module name defaults to `shared` (the module directory name), which would publish as `xyz.self.sdk:shared`. Override the `artifactId` to `self-sdk-kmp` so the final Maven coordinate is `xyz.self.sdk:self-sdk-kmp:0.1.0`. Add a `publishing` block with the artifactId override and remote repository target:

```kotlin
publishing {
    publications.withType<MavenPublication> {
        artifactId = "self-sdk-kmp"
    }
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/selfxyz/self")
            credentials {
                username = project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_ACTOR")
                password = project.findProperty("gpr.key") as String? ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}
```

This adds ~13 LOC. The `groupId` (`xyz.self.sdk`) and `version` (`0.1.0`) are already set at lines 10-11. The published Maven coordinate will be `xyz.self.sdk:self-sdk-kmp:0.1.0`.

#### 2. Switch XCFramework to release variants

**File:** `packages/kmp-sdk/shared/build.gradle.kts`

Update the `createXCFramework` task (lines 145-175):

- Change `dependsOn` from `linkDebugFrameworkIosArm64` / `linkDebugFrameworkIosSimulatorArm64` to `linkReleaseFrameworkIosArm64` / `linkReleaseFrameworkIosSimulatorArm64`
- Update framework paths from `debugFramework` to `releaseFramework`

```kotlin
tasks.register("createXCFramework") {
    group = "build"
    description = "Creates XCFramework for iOS distribution"

    dependsOn(
        ":shared:linkReleaseFrameworkIosArm64",
        ":shared:linkReleaseFrameworkIosSimulatorArm64",
    )

    doLast {
        val buildDir = layout.buildDirectory.get().asFile
        val frameworkPath = "$buildDir/bin/iosArm64/releaseFramework/SelfSdk.framework"
        val simulatorFrameworkPath = "$buildDir/bin/iosSimulatorArm64/releaseFramework/SelfSdk.framework"
        val xcframeworkPath = "$buildDir/xcframework/SelfSdk.xcframework"

        // Remove existing XCFramework if present
        project.delete(xcframeworkPath)

        project.exec {
            commandLine(
                "xcodebuild",
                "-create-xcframework",
                "-framework", frameworkPath,
                "-framework", simulatorFrameworkPath,
                "-output", xcframeworkPath,
            )
        }

        println("XCFramework created at: $xcframeworkPath")
    }
}
```

~3 LOC changed (debug → release in 3 places).

#### 3. Update Package.swift for remote distribution

**File:** `packages/kmp-sdk/Package.swift`

Change the `.binaryTarget` from a local path to a remote URL with checksum:

```swift
targets: [
    .binaryTarget(
        name: "SelfSdk",
        url: "https://github.com/selfxyz/self/releases/download/kmp-sdk-v0.1.0/SelfSdk.xcframework.zip",
        checksum: "<SHA256_CHECKSUM>"
    )
]
```

The checksum is computed from the zipped XCFramework:

```bash
cd packages/kmp-sdk
zip -r SelfSdk.xcframework.zip shared/build/xcframework/SelfSdk.xcframework
swift package compute-checksum SelfSdk.xcframework.zip
```

The actual URL and checksum values will be set during the first release. Use placeholder values with a `// TODO: Update on first release` comment until then.

### Validation

```bash
cd packages/kmp-sdk

# Verify remote Maven repo is configured
./gradlew tasks --all | grep -i publish
# Should show publishAllPublicationsToGitHubPackagesRepository (or similar)

# Verify release XCFramework builds
./gradlew createXCFramework
ls -la shared/build/xcframework/SelfSdk.xcframework

# Verify Package.swift is valid
swift package dump-package

# Existing tests still pass
./gradlew :shared:jvmTest
```

### Consumer Setup

The Maven package on GitHub Packages is **private** — it is not publicly resolvable. Consumers must configure credentials to pull the dependency.

#### Android (Gradle)

Add the GitHub Packages Maven repository to `settings.gradle.kts` (or root `build.gradle.kts`):

```kotlin
dependencyResolutionManagement {
    repositories {
        maven {
            url = uri("https://maven.pkg.github.com/selfxyz/self")
            credentials {
                username = project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_ACTOR")
                password = project.findProperty("gpr.key") as String? ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}
```

Then add the dependency:

```kotlin
implementation("xyz.self.sdk:self-sdk-kmp:0.1.0")
```

Consumers need a GitHub personal access token with `read:packages` scope. Set in `~/.gradle/gradle.properties`:

```properties
gpr.user=GITHUB_USERNAME
gpr.key=ghp_YOUR_TOKEN
```

Or set `GITHUB_ACTOR` / `GITHUB_TOKEN` environment variables in CI.

#### iOS (SPM)

The XCFramework ZIP hosted on GitHub Releases can also be private. If the repo is private, consumers must authenticate for `swift package resolve` to download the binary target. Xcode handles this via the logged-in GitHub account in **Xcode > Settings > Accounts**. CI environments need a `netrc` entry or `GITHUB_TOKEN` for authentication.

### Known Limitations

- **GitHub Packages Maven:** Consumers need a GitHub token with `read:packages` scope to resolve dependencies (see Consumer Setup above). If public access is required, migration to Maven Central is a follow-up.

### Definition of Done

- [ ] `publishing` block added to `build.gradle.kts` with `artifactId = "self-sdk-kmp"` and GitHub Packages repository
- [ ] `createXCFramework` uses release variants (not debug)
- [ ] `Package.swift` uses `.binaryTarget(url:checksum:)` instead of `path:`
- [ ] `./gradlew :shared:jvmTest` passes
- [ ] `./gradlew createXCFramework` produces a release XCFramework
- [ ] `swift package dump-package` succeeds
- [ ] Backlog row updated
- [ ] Plan status updated

### Estimated PR Size

~50-80 LOC changed. Well within the 1k-3k target.

### Status Log

- 2026-04-06: Plan created. Based on NS-03 audit findings and KR-03 deferred publishing scope.
