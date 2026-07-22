# RSP-05 — Expo Config Plugin + Asset Wiring

> Last updated: 2026-07-20
> Status: Ready

- Workstream: rn-sdk-packaging
- Backlog IDs: RSP-05
- Owner: SDK / Platform
- Depends on: —

## Why

- `@selfxyz/rn-sdk` bundles the webview-app into `assets/self-wallet/` (`package.json:26-27`), but the
  bundle is **not auto-wired into the platforms**: Android loads a hardcoded
  `file:///android_asset/self-wallet/index.html`, and iOS resolves via `react-native-fs`
  `MainBundlePath` or the host-injected `bundleRootUri` (`packages/rn-sdk/src/bundlePath.ts`).
- Bare-RN hosts must hand-edit gradle `sourceSets` / an iOS copy-files phase; Expo-managed hosts cannot
  make those edits at all without a config plugin. This blocks turnkey external adoption.

## Scope

- Add an Expo config plugin (`app.plugin.js`) to `@selfxyz/rn-sdk` using `@expo/config-plugins`:
  - `withDangerousMod` (Android) to copy `assets/self-wallet/` into `android/app/src/main/assets/self-wallet/` at prebuild.
  - `withDangerousMod`/`withXcodeProject` (iOS) to add `self-wallet` as a bundled resources group so
    `MainBundlePath` resolution finds `self-wallet/index.html`.
- Document the bare-RN manual path (gradle `sourceSets`, iOS copy-files build phase) in the SDK README/HANDOFF.
- Note that SD-01–05 hosted-URL loading (`sdk-distribution`) is the eventual replacement that removes
  asset wiring entirely — this plugin is the interim solution for embedded-bundle consumers.

## Out of Scope

- Hosted-URL loading itself (tracked in `sdk-distribution`).
- Native capture packages (RSP-03/04).

## Files to Modify / Create

- `packages/rn-sdk/app.plugin.js` (+ any `plugin/` sources) — the config plugin.
- `packages/rn-sdk/package.json` — add `@expo/config-plugins` (peer/dev) and ensure `app.plugin.js` is in `files`.
- `packages/rn-sdk/HANDOFF.md` (or a README) — bare-RN manual wiring + Expo plugin usage.

## Files Not to Modify

- `app/**` (the Self app uses its own prebuild/EAS setup; must remain unaffected).

## Preconditions

- `assets/self-wallet/` is produced by the existing `copy-assets` build step.

## Input / Output

**Input:**

```text
An Expo-managed consumer adds "@selfxyz/rn-sdk" to plugins and runs expo prebuild.
```

**Output:**

```text
assets/self-wallet lands in android_asset and the iOS app bundle; SelfVerification loads the WebView
with no manual native edits. Bare-RN consumers follow documented manual steps.
```

## Validation

```bash
# In a managed Expo test app with the plugin enabled:
expo prebuild
# Verify assets present:
#   android/app/src/main/assets/self-wallet/index.html
#   ios <app>.app/self-wallet/index.html (post-build)
```

- WebView loads on both platforms in the Expo test app without hand-editing native projects.
- Bare-RN manual steps documented and verified in a bare test app.

## Definition of Done

- [ ] `app.plugin.js` copies/registers `self-wallet` assets on Android + iOS at prebuild.
- [ ] `@expo/config-plugins` declared; `app.plugin.js` shipped in `files`.
- [ ] Bare-RN manual wiring documented.
- [ ] Expo test app loads the WebView with no manual native edits.
- [ ] Hosted-URL (SD-01–05) noted as the eventual replacement.
- [ ] SPEC.md backlog status updated.

## Status Log

- 2026-07-20: Spec drafted.
