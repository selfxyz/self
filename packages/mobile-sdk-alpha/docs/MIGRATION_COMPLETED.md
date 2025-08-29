# Completed Mobile SDK Migration Tasks

This record lists migration and architecture tasks that are done. Remaining work lives in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

## Migration

### 1. Processing helpers (MRZ)

- Finalized MRZ utilities
- Re-exported helpers through the SDK entry point
- Created modular structure with `src/mrz/` and `src/qr/`
- Implemented error handling using `notImplemented`
- Used type aliases instead of empty interfaces

### 2. Validation module

- Ported stateless document checks
- Covered validation logic with unit tests

### 12. Integrate SDK into `/app`

- Consumed `@selfxyz/mobile-sdk-alpha` in the `app` workspace
- Wired app screens to SDK processing and validation helpers

## Architecture

### 1. Modular feature directories

- Grouped new capabilities in dedicated folders
- Re-exported from `src/index.ts` with explicit named exports
- Created `src/mrz/` and `src/qr/` modules
- Implemented error handling with `notImplemented`
- Used type aliases instead of empty interfaces

### 2. Bridge layer for native events

- Wrapped `NativeModules`/`NativeEventEmitter` with shared adapter
- Created unified event handling interface
- Implemented platform-specific event bridges

### 3. Exception classes

- Added typed errors (`InitError`, `LivenessError`, `NfcParseError`, `MrzParseError`)
- Surfaced typed errors instead of generic `Error`
- Ensured consistent error categorization

### 6. Dogfood in `/app`

- Integrated the SDK into the monorepo's `app` workspace
