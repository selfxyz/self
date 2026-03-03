# Lottie → dotLottie Migration — Branch Review

**Branch:** `justin/lottie-dotlottie-conversion`
**Date:** 2026-02-26

## Summary

Migration from `lottie-react-native` (Lottie JSON) to `@lottiefiles/dotlottie-react-native` (dotLottie binary `.lottie` format). Also re-enables the iOS e2e CI job and bumps the iOS deployment target from 15.1 → 15.4.

## Scope

- **app/**: All animation imports switched from `.json` → `.lottie` (via `require()`)
- **packages/mobile-sdk-alpha/**: `DelayedLottieView` rewritten for DotLottie API; animation files converted; package exports updated; tsup externalization added
- **Metro/Vite config**: `.lottie` registered as asset ext; deduplication resolver added; web alias updated
- **iOS**: Deployment target 15.1 → 15.4; Podfile.lock updated for `dotlottie-react-native`
- **CI**: iOS e2e job re-enabled

## What looks good

1. **Conversion script** (`app/scripts/convert-to-dotlottie.mjs`) — clean, minimal, logs compression ratios.
2. **`DelayedLottieView` rewrite** — `onLoad`-based play is better than the old 100ms `setTimeout` hack. Legacy prop compat (`autoPlay`/`autoplay`, `onAnimationLoaded`/`onAnimationFinish`) is thoughtful.
3. **Metro deduplication resolver** — resolves SDK animation imports to app's copy to avoid duplicate assets, with fallback to SDK-only animations.
4. **tsup externalization** — correctly externalizes `.json`/`.lottie` so Metro handles them.
5. **Package exports** — `.lottie` exports added with correct condition order (`react-native` → `import` → `require`).
6. **Consistent migration pattern** — every screen follows the same `require()` + eslint-disable pattern.

## Issues to address

### 1. `autoplay` prop logic may cause unintended autoplay

**`DelayedLottieView.tsx:128`** — When `shouldAutoPlay` is true, `autoplay={false}` is passed (correct). When false, `autoplay={undefined}` is passed. If DotLottie defaults autoplay to truthy, this could cause unintended playback. Safer: always pass `autoplay={false}` and only trigger via `onLoad`.

### 2. `launch_onboarding.json` deleted with no `.lottie` replacement

`app/src/assets/animations/launch_onboarding.json` is removed but no `.lottie` counterpart was added. Verify whether this animation is still used or intentionally removed.

### 3. `AnimationSource` type duplicated in 3+ files

`type AnimationSource = string | { uri: string }` defined independently in `LoadingScreen.tsx`, `DevLoadingScreen.tsx`, `LoadingUI.tsx`, and `ProofRequestStatusScreen.tsx`. Should be exported from a shared location.

### 4. iOS deployment target bump (15.1 → 15.4) undocumented

User-facing change that drops support for iOS 15.1–15.3. Confirm this is a requirement of `dotlottie-react-native` and call it out in the PR description.

### 5. Removed LottieView undefined guard

Old `DelayedLottieView` had `if (typeof LottieView === 'undefined') return null`. New version removes this. Verify no build context (e.g., web) would hit a missing native module.

### 6. Ref type cast uses `unknown`

**`DelayedLottieView.tsx:108`** — `instance as Dotlottie | null` cast from `unknown`. If DotLottie provides the correct ref type, the cast is unnecessary. If it doesn't, this masks issues.

### 7. Web alias mismatch is currently non-blocking (known limitation)

**`vite.config.ts:38`** — Alias maps `@lottiefiles/dotlottie-react-native` → `@lottiefiles/dotlottie-react`.

Current behavior: the `.web.tsx` placeholder path renders an empty `<div />`, so this alias path is not exercised in normal flows.

Important clarification: fixing alias wiring alone will not make web animations work. A proper web implementation is needed using `DotLottieReact` (canvas-based API, `src` prop, and different lifecycle/control patterns vs RN `source` + imperative ref methods).

Treat this as a separate feature track, not a blocking defect in this migration branch.

### 8. iOS e2e re-enable is unrelated

Removing `if: false` from the iOS e2e job is a separate concern. Could be its own commit.

## Minor notes

- eslint-disable comments (`-- binary asset loaded by Metro`) are consistent and helpful
- Test mock change (`() => ({})` → `() => 1`) is correct — Metro `require()` returns numeric asset IDs
- `Gemfile.lock` and `Podfile.lock` diffs are correct for the dependency swap
