# Completed Mobile SDK Migration Tasks

This log captures what’s already landed. Everything still in flight lives in [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

## Migration

### 1. MRZ processing helpers

- MRZ utilities are in place and re‑exported through the SDK.
- The code now lives under `src/mrz/` and `src/qr/`.
- `notImplemented` guards unfinished paths.
- Type aliases keep things lean.

### 2. Validation module

- Stateless document checks were ported and covered by unit tests.

### 3. Integrate SDK into `/app`

- The `app` workspace consumes `@selfxyz/mobile-sdk-alpha`.
- Screens are wired to SDK processing and validation helpers.

## Architecture

### 1. Modular feature directories

- New capabilities sit in dedicated folders and are re‑exported via `src/index.ts`.
- Error paths use `notImplemented`.
- Type aliases replaced empty interfaces.

### 2. Bridge layer for native events

- `NativeModules` and `NativeEventEmitter` are wrapped in a shared adapter.
- Platforms share a unified event interface.

### 3. Exception classes

- Added typed errors (`InitError`, `LivenessError`, `NfcParseError`, `MrzParseError`).
- The SDK now surfaces these instead of generic `Error`.
