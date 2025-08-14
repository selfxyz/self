# Architecture

> Detailed task prompts are listed in [ARCHITECTURE_PROMPTS.md](./ARCHITECTURE_PROMPTS.md).

## Overview

The alpha SDK follows an adapter-first, React Native–oriented design. Tree-shakable named exports and `"sideEffects": false` keep bundles lean. While React Native is the only supported platform today, the structure below leaves room to add web, Capacitor, or Cordova targets without major refactors.

## Architecture Checklist (easy → hard)

1. **Modular feature directories** – group new capabilities (e.g., `liveness/`, `detection/`) in their own folders and re-export from `src/index.ts`.
2. **Bridge layer for native events** – wrap `NativeModules`/`NativeEventEmitter` so features register listeners through a shared adapter.
3. **Exception classes** – add typed errors (`InitError`, `LivenessError`, etc.) and surface them instead of generic `Error`.
4. **SDK lifecycle management** – evolve `createSelfClient` into an SDK class with `initialize`/`deinitialize` and stored config.
5. **Package targets** – keep React Native build first, but scaffold entry points for web and future environments (Capacitor/Cordova).
6. **Dogfood in `/app`** – integrate the SDK into the monorepo's `app` workspace to validate real flows.
7. **Android demo app** – ship a minimal React Native Android project demonstrating MRZ → NFC → proof generation.

## Working in Parallel

Architecture tasks above can proceed alongside the SDK migration checklist. Steps completed in the migration doc (currently through step 2) unblock items 3–5, so teams can tackle architecture and migration independently.

## Additional Notes

- Favor small, sensical abstractions over premature generality.
- Maintain tree-shakability by avoiding side effects in new modules.
- Document new APIs and flows under `docs/` as they solidify.
