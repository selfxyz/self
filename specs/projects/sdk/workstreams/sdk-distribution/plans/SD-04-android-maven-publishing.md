## Android Maven Publishing

> Last updated: 2026-03-30
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-04
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- After SD-01 removes the embedded bundle, the Android AAR contains only compiled Kotlin — no bundled web assets.
- Publishing to Maven Central (or a private Maven repo) lets integrators add the SDK as a Gradle dependency instead of copying the AAR manually.
- This is the standard Android library distribution mechanism.

### Scope

- Add `maven-publish` Gradle plugin to `packages/native-shell-android/build.gradle.kts`
- Configure publication with `groupId: xyz.self.sdk`, `artifactId: native-shell-android`
- Generate POM with correct dependencies
- Verify `publishToMavenLocal` produces a working AAR

### Out of Scope

- Maven Central account setup / GPG signing (ops task, not code)
- CI/CD automated publishing (separate follow-up)
- iOS publishing (SD-05)
- AAR ProGuard/R8 rules (follow-up if needed)
- Version management strategy (follow-up)

### Files to Modify

- `packages/native-shell-android/build.gradle.kts` — Add `maven-publish` plugin. Add `publishing` block with `MavenPublication` configuration. Set `groupId`, `artifactId`, `version`. Configure POM metadata (name, description, URL, license).

### Files NOT to Modify

- `packages/native-shell-android/src/` — No source code changes
- `packages/webview-app/` — Upstream, do not change
- `packages/native-shell-ios/` — Separate workstream item

### Preconditions

- SD-01 is complete (embedded bundle removed, AAR is lightweight)

### Implementation Details

1. **Add `maven-publish` plugin**:

   ```kotlin
   plugins {
       // existing plugins...
       id("maven-publish")
   }
   ```

2. **Configure publication**:

   ```kotlin
   afterEvaluate {
       publishing {
           publications {
               create<MavenPublication>("release") {
                   from(components["release"])
                   groupId = "xyz.self.sdk"
                   artifactId = "native-shell-android"
                   version = "0.1.0"

                   pom {
                       name.set("Self SDK Android")
                       description.set("Self identity verification SDK for Android")
                       url.set("https://self.xyz")
                       licenses {
                           license {
                               name.set("MIT")
                               url.set("https://opensource.org/licenses/MIT")
                           }
                       }
                   }
               }
           }
       }
   }
   ```

3. **Verify transitive dependencies**:
   - POM must declare `androidx.security:security-crypto` and `kotlinx-serialization-json` as dependencies

### Validation

```bash
cd packages/native-shell-android

# Publish to local Maven repo
./gradlew publishToMavenLocal

# Verify AAR does not contain bundled web assets
unzip -l $(find ~/.m2/repository/xyz/self/sdk/native-shell-android -name "*.aar") | grep -E "self-wallet|self-sdk-web" && echo "FAIL: bundled assets found" || echo "PASS"

```

### Definition of Done

- [ ] `./gradlew publishToMavenLocal` succeeds
- [ ] AAR does not contain bundled web assets (`self-wallet/`, `self-sdk-web/`)
- [ ] POM includes correct `groupId` and `artifactId`
- [ ] POM declares runtime dependencies (security-crypto, kotlinx-serialization)
- [ ] A fresh Android project can add the Maven local dependency and resolve it
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-30: Plan created.
