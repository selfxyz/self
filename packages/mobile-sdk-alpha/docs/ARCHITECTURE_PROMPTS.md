# Architecture Prompts

Each item from the architecture checklist expands into concrete tasks. Pick items independently to parallelize work.

> **Note**: This document uses standard Markdown `<details>` and `<summary>` tags for collapsible sections.

## Pre-flight checks

Run these commands before committing changes:

```bash
yarn workspace @selfxyz/mobile-sdk-alpha nice
yarn workspace @selfxyz/mobile-sdk-alpha build
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn lint
yarn build
```

## 1. Modular feature directories

<details>
<summary><strong>Split features into dedicated folders</strong></summary>

1. Under `src/`, create folders like `mrz/` and `qr/` as features are added.
2. Re-export feature APIs from `src/index.ts` using explicit named exports to keep tree shaking intact.

</details>

## 2. Bridge layer for native events

<details>
<summary><strong>Introduce shared event bridge</strong></summary>

1. Add `src/bridge/nativeEvents.ts` wrapping `NativeModules` and `NativeEventEmitter`.
2. Expose `addListener` and `removeListener` helpers so modules can register without touching React Native directly.

</details>

## 3. Exception classes

<details>
<summary><strong>Add typed error hierarchy</strong></summary>

1. Create `src/errors/` with classes like `InitError` and `LivenessError` extending `Error`.
2. Replace generic throws with these classes and document them in the README.

</details>

## 4. SDK lifecycle management

<details>
<summary><strong>Move to an SDK class</strong></summary>

1. Convert `createSelfClient` into a class exposing `initialize()` and `deinitialize()`.
2. Store configuration and adapters on the instance to avoid global state.

</details>

## 5. Package targets

<details>
<summary><strong>Scaffold additional entry points</strong></summary>

1. Add build outputs for web, Capacitor, and Cordova under `dist/`.
2. Configure `package.json` `exports` to point to the new bundles.

</details>

## 6. Dogfood in `/app`

<details>
<summary><strong>Integrate with monorepo app</strong></summary>

1. Add `@selfxyz/mobile-sdk-alpha` to `app/package.json` and wire flows to use the SDK.
2. Validate builds and tests in the `app` workspace.

</details>

## 7. Android demo app

<details>
<summary><strong>Provide minimal Android sample</strong></summary>

1. Under `samples/android/`, scaffold a basic React Native project showing MRZ → proof generation.
2. Document setup steps in `samples/android/README.md`.

</details>
