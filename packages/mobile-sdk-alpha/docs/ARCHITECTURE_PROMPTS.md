# Architecture Prompts

The [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) tracks remaining architecture work alongside migration tasks. The sections below expand those items so agents can take on tasks independently. Completed items are documented in [MIGRATION_COMPLETED.md](./MIGRATION_COMPLETED.md).

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

1. Validate builds and tests in the `app` workspace.
2. Replace existing MRZ modules with SDK adapters.

</details>

## 7. Android demo app

<details>
<summary><strong>Provide minimal Android sample</strong></summary>

1. Under `samples/android/`, scaffold a basic React Native project showing MRZ → proof generation.
2. Document setup steps in `samples/android/README.md`.

</details>
