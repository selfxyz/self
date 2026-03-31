## iOS Publishing (SPM + CocoaPods)

> Last updated: 2026-03-30
> Status: Ready

- Workstream: sdk-distribution
- Backlog IDs: SD-05
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- After SD-02 removes the embedded bundle and resource copy rules, the Swift Package is lightweight and ready for distribution.
- Supporting both SPM and CocoaPods gives integrators flexibility — SPM is the modern default, but many projects still use CocoaPods.
- Both mechanisms point to the same source files. A `.podspec` file is the only addition for CocoaPods support — no code changes, no separate maintenance burden.

### Scope

- Verify `Package.swift` is clean after SD-02 (no resource copy, no stale paths)
- Verify `swift build` succeeds from a clean checkout
- Add a `.podspec` file for CocoaPods distribution
- Tag a release and verify consumption via both SPM and CocoaPods
- Ensure `.gitignore` excludes any build artifacts from the package directory

### Out of Scope

- CI/CD automated tagging/publishing (separate follow-up)
- Android publishing (SD-04)
- Binary framework (XCFramework) distribution (follow-up if needed)
- Version management strategy (follow-up)

### Files to Modify

- `packages/native-shell-ios/Package.swift` — Verify clean state after SD-02. If any stale references remain, remove them. Ensure `platforms: [.iOS(.v15)]` or appropriate minimum is set.
- `packages/native-shell-ios/.gitignore` — Ensure `.build/` and any generated artifacts are excluded.

### Files to Create

- `packages/native-shell-ios/SelfSDK.podspec` — CocoaPods spec pointing to the same Swift source files as `Package.swift`.

### Files NOT to Modify

- `packages/native-shell-ios/Sources/` — No source code changes (SD-02 handled URL loading)
- `packages/webview-app/` — Upstream, do not change
- `packages/native-shell-android/` — Separate workstream item

### Preconditions

- SD-02 is complete (resource copy removed, `loadFileURL` replaced)

### Implementation Details

1. **Verify `Package.swift` cleanliness**:
   - No `resources:` parameter on the target (or empty if Swift requires it)
   - No references to `self-sdk-web`, `Resources/`, or bundle paths
   - `products:` declares a single library target
   - `dependencies:` lists only runtime dependencies (if any)

2. **Verify `.gitignore`**:
   - `.build/` excluded
   - No committed build artifacts in the package directory

3. **Add `SelfSDK.podspec`**:

   ```ruby
   Pod::Spec.new do |s|
     s.name         = 'SelfSDK'
     s.version      = '0.1.0'
     s.summary      = 'Self identity verification SDK for iOS'
     s.homepage     = 'https://self.xyz'
     s.license      = { :type => 'MIT', :file => 'LICENSE' }
     s.author       = 'Self'
     s.source       = { :git => 'https://github.com/selfxyz/self.git', :tag => s.version.to_s }
     s.platform     = :ios, '15.0'
     s.swift_version = '5.9'
     s.source_files = 'packages/native-shell-ios/Sources/**/*.swift'
   end
   ```

   Adjust `source`, `source_files`, and module name to match the actual repo structure and naming.

4. **Tag and test SPM consumption**:
   - Create a Git tag (e.g., `native-shell-ios/0.1.0`)
   - In a fresh Xcode project, add the package via SPM using the repo URL and tag
   - Verify the package resolves, builds, and `import SelfSDK` (or the module name) works
   - Verify the resolved package does NOT download bundled web assets

5. **Test CocoaPods consumption**:
   - Run `pod lib lint SelfSDK.podspec` to validate the podspec
   - In a fresh Xcode project with a `Podfile`, add `pod 'SelfSDK'` pointing to the local path
   - Verify `pod install` succeeds and the project builds

### Validation

```bash
cd packages/native-shell-ios

# Clean build from scratch
rm -rf .build && swift build

# Verify no resource references
grep -r "self-sdk-web" Package.swift && echo "FAIL" || echo "PASS"
grep -r "Resources" Package.swift && echo "FAIL" || echo "PASS"

# Validate podspec
pod lib lint SelfSDK.podspec --allow-warnings

# Verify package source size (should be small — no bundled web assets)
du -sh Sources/
```

### Definition of Done

- [ ] `swift build` passes from clean checkout
- [ ] `Package.swift` has no resource copy rules or stale references
- [ ] `.gitignore` excludes `.build/` and artifacts
- [ ] `SelfSDK.podspec` exists and passes `pod lib lint`
- [ ] Git tag created for release
- [ ] Fresh Xcode project can add package via SPM and build
- [ ] Fresh Xcode project can add pod via CocoaPods and build
- [ ] Package resolution does not download bundled web assets
- [ ] Backlog row updated
- [ ] Plan status updated

### Status Log

- 2026-03-30: Plan created.
