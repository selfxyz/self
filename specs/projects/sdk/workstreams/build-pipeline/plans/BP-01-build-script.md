## WebView Bundle Build + Copy Script

> Last updated: 2026-03-21
> Status: Done

- Workstream: build-pipeline
- Backlog IDs: BP-01
- Owner: TBD
- Branch: feat/webview-sdk
- PR: TBD

### Why

- Native shells need the webview-app Vite build output bundled into their asset directories.
- This must be automated so builds are reproducible and developers don't manually copy files.

### Scope

- `scripts/build-webview-bundle.sh` — builds webview-app, copies dist/ to both native shell asset dirs
- `.gitignore` entries for bundled assets
- Android Gradle `preBuild` validation task
- iOS `Package.swift` resource configuration
- npm scripts in root `package.json`

### Out of Scope

- CI/CD pipeline
- Publishing to registries
- WebView app source changes
- Native shell source changes

### Files Modified

- `scripts/build-webview-bundle.sh` — new build+copy script
- `packages/native-shell-android/.gitignore` — new, excludes bundled assets + Gradle artifacts
- `packages/native-shell-ios/.gitignore` — new, excludes bundled assets + Swift build artifacts
- `packages/native-shell-android/build.gradle.kts` — added `validateWebViewBundle` task wired to `preBuild`
- `packages/native-shell-ios/Package.swift` — already had `.copy("../../Resources/self-sdk-web")`, no change needed
- `package.json` (root) — added `build:sdk-bundle`, `build:sdk-android`, `build:sdk-ios` scripts

### Files Not Modified

- `packages/webview-app/` — upstream
- `packages/native-shell-android/` source (only asset gitignore + Gradle validation)
- `packages/native-shell-ios/` source (only resource gitignore)

### Validation

```bash
chmod +x ./scripts/build-webview-bundle.sh
./scripts/build-webview-bundle.sh
cd packages/native-shell-android && ./gradlew assembleDebug
cd packages/native-shell-ios && swift build
```

### Definition of Done

- [x] `scripts/build-webview-bundle.sh` builds webview-app and copies to both shell asset dirs
- [x] Both native builds fail-fast with clear error when assets are missing
- [x] `.gitignore` excludes bundled assets
- [x] Backlog row updated
- [x] Plan status updated

### Status Log

- 2026-03-20: Plan created.
- 2026-03-21: Implementation complete. Script, gitignores, Gradle validation, and root scripts all in place.
