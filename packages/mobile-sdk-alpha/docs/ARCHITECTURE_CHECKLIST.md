# Architecture

> Detailed task prompts are listed in [ARCHITECTURE_PROMPTS.md](./ARCHITECTURE_PROMPTS.md).

## Overview

The alpha SDK follows an adapter-first, React Native–oriented design. Tree-shakable named exports and `"sideEffects": false` keep bundles lean. While React Native is the only supported platform today, the structure below leaves room to add web, Capacitor, or Cordova targets without major refactors.

## Architecture Checklist (easy → hard)

### 1. Modular feature directories ✅ COMPLETED

- [x] Group new capabilities (e.g., `mrz/`, `qr/`) in their own folders
- [x] Re-export from `src/index.ts` using explicit named exports (avoid `export *`)
- [x] Create `src/mrz/` and `src/qr/` modules
- [x] Implement proper error handling with `notImplemented` helper
- [x] Use type aliases instead of empty interfaces for better tree shaking

### 2. Bridge layer for native events

- [x] Wrap `NativeModules`/`NativeEventEmitter` so features register listeners through a shared adapter
- [x] Create unified event handling interface
- [x] Implement platform-specific event bridges

### 3. Exception classes

- [ ] Add typed errors (`InitError`, `LivenessError`, etc.)
- [ ] Surface typed errors instead of generic `Error`
- [ ] Ensure consistent error categorization

### 4. SDK lifecycle management

- [ ] Evolve `createSelfClient` into an SDK class
- [ ] Add `initialize`/`deinitialize` methods
- [ ] Implement stored config management

### 5. Package targets

- [ ] Keep React Native build first
- [ ] Scaffold entry points for web environments
- [ ] Prepare for future environments (Capacitor/Cordova)

### 6. Dogfood in `/app`

- [ ] Integrate the SDK into the monorepo's `app` workspace
- [ ] Validate real flows
- [ ] Replace existing MRZ modules with SDK adapters

### 7. Android demo app

- [ ] Ship a minimal React Native Android project
- [ ] Demonstrate MRZ → proof generation flow
- [ ] Provide build and run instructions

## Working in Parallel

Architecture tasks above can proceed alongside the SDK migration checklist. Steps completed in the migration doc (currently through step 2) unblock items 3–5, so teams can tackle architecture and migration independently.

## Additional Notes

- Favor small, sensical abstractions over premature generality.
- Maintain tree-shakability by avoiding side effects in new modules.
- Document new APIs and flows under `docs/` as they solidify.
