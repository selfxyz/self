# SC-02: Expose `generateKey()` and `getPublicKey()` in Crypto Adapter Surface

> Last updated: 2026-03-12
> Status: Done
> Priority: Medium
> Depends on: SC-01 (Done)

- Workstream: sdk-core
- Backlog ID: SC-02
- Owner: SDK Core
- Branch: TBD
- PR: TBD

## Context

You are closing a gap in the `CryptoAdapter` interface. The bridge protocol
already defines `generateKey` and `getPublicKey` as valid `CryptoMethod` values
(`packages/webview-bridge/src/types.ts:71`), and the iOS native handler already
implements both operations (`packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/CryptoBridgeHandler.kt:55-92`).
But the TypeScript adapter interface (`CryptoAdapter` in
`packages/mobile-sdk-alpha/src/types/public.ts:85-100`) only exposes `hash()`
and `sign()`. This means:

1. The WebView bridge crypto adapter (`packages/webview-bridge/src/adapters/crypto.ts`)
   cannot offer `generateKey`/`getPublicKey` because the interface it implements
   doesn't declare them.
2. Any SDK consumer that needs key generation must work around the adapter
   contract — defeating the purpose of the abstraction.

### Current state of each layer

| Layer                 | File                                                   |   `generateKey`    |   `getPublicKey`   |    `sign`    |    `hash`     |
| --------------------- | ------------------------------------------------------ | :----------------: | :----------------: | :----------: | :-----------: |
| Bridge protocol types | `webview-bridge/src/types.ts:71`                       |      Declared      |      Declared      |   Declared   |       —       |
| iOS native handler    | `kmp-sdk/.../CryptoBridgeHandler.kt`                   |    Implemented     |    Implemented     | Implemented  |       —       |
| Swift crypto provider | `self-sdk-swift/.../CryptoProviderImpl.swift`          | EC P-256, Keychain | Base64 DER pub key | ECDSA-SHA256 |       —       |
| SDK public interface  | `mobile-sdk-alpha/src/types/public.ts:85-100`          |    **Missing**     |    **Missing**     |   Declared   |   Declared    |
| Bridge adapter (TS)   | `webview-bridge/src/adapters/crypto.ts`                |    **Missing**     |    **Missing**     | Bridge call  |  Web Crypto   |
| Browser adapter       | `mobile-sdk-alpha/src/adapters/browser/crypto.ts`      |    **Missing**     |    **Missing**     |    Throws    |  Web Crypto   |
| RN adapter            | `mobile-sdk-alpha/src/adapters/react-native/crypto.ts` |    **Missing**     |    **Missing**     |    Throws    | @noble/hashes |

## What You Will Do

### 1. Extend `CryptoAdapter` interface

**File:** `packages/mobile-sdk-alpha/src/types/public.ts:85-100`

Add two methods to the existing `CryptoAdapter` interface:

```typescript
export interface CryptoAdapter {
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
  generateKey(keyRef: string): Promise<{ keyRef: string }>;
  getPublicKey(keyRef: string): Promise<Uint8Array>;
}
```

**Design notes:**

- `generateKey(keyRef)` returns `{ keyRef }` to match the iOS native handler
  response shape (`CryptoBridgeHandler.kt:70-73`). The keyRef is an opaque
  reference that native code uses to locate the key in secure storage.
- `getPublicKey(keyRef)` returns `Uint8Array` (raw public key bytes). The bridge
  adapter will decode the base64 string from the native response.
- Both methods must use `keyRef` as the parameter name to align with the bridge
  protocol param names used in `CryptoBridgeHandler.kt`.

### 2. Update bridge crypto adapter

**File:** `packages/webview-bridge/src/adapters/crypto.ts`

Add `generateKey` and `getPublicKey` implementations that delegate to the bridge:

```typescript
async generateKey(keyRef: string): Promise<{ keyRef: string }> {
  const result = await bridge.request<{ keyRef: string; success: boolean }>(
    'crypto',
    'generateKey',
    { keyRef },
  );
  return { keyRef: result.keyRef };
},

async getPublicKey(keyRef: string): Promise<Uint8Array> {
  const result = await bridge.request<{ publicKey: string }>(
    'crypto',
    'getPublicKey',
    { keyRef },
  );
  return base64ToUint8Array(result.publicKey);
},
```

Also update the `BridgeCryptoAdapter` interface in the same file to include the
new methods, keeping it aligned with `CryptoAdapter`.

### 3. Update browser crypto adapter

**File:** `packages/mobile-sdk-alpha/src/adapters/browser/crypto.ts`

Add throwing stubs, same pattern as `sign()`:

```typescript
async generateKey(_keyRef: string): Promise<{ keyRef: string }> {
  throw new Error(
    'Key generation is not implemented in the browser crypto adapter. ' +
      'Key generation requires native keychain access via the bridge.',
  );
},

async getPublicKey(_keyRef: string): Promise<Uint8Array> {
  throw new Error(
    'Public key retrieval is not implemented in the browser crypto adapter. ' +
      'Public key retrieval requires native keychain access via the bridge.',
  );
},
```

### 4. Update RN crypto adapter

**File:** `packages/mobile-sdk-alpha/src/adapters/react-native/crypto.ts`

Add throwing stubs, same pattern as the existing `sign()`:

```typescript
async generateKey(_keyRef: string): Promise<{ keyRef: string }> {
  throw new Error(
    'Key generation is not implemented in the default crypto adapter. ' +
      'Provide a custom CryptoAdapter with a generateKey implementation for your platform.',
  );
},

async getPublicKey(_keyRef: string): Promise<Uint8Array> {
  throw new Error(
    'Public key retrieval is not implemented in the default crypto adapter. ' +
      'Provide a custom CryptoAdapter with a getPublicKey implementation for your platform.',
  );
},
```

### 5. Update SPEC.md backlog

**File:** `specs/projects/sdk/workstreams/sdk-core/SPEC.md`

- Mark SC-02 row status as `Done`
- Check the `[ ]` on line 62 as complete

## Files You Will Modify

| File                                                            | Change                                                   | Risk                                                |
| --------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `packages/mobile-sdk-alpha/src/types/public.ts`                 | Add `generateKey`, `getPublicKey` to `CryptoAdapter`     | **Medium** — public API surface                     |
| `packages/webview-bridge/src/adapters/crypto.ts`                | Add bridge-delegating implementations + update interface | **Low** — follows existing `sign()` pattern exactly |
| `packages/mobile-sdk-alpha/src/adapters/browser/crypto.ts`      | Add throwing stubs                                       | **Low** — same pattern as `sign()`                  |
| `packages/mobile-sdk-alpha/src/adapters/react-native/crypto.ts` | Add throwing stubs                                       | **Low** — same pattern as existing `sign()`         |
| `specs/projects/sdk/workstreams/sdk-core/SPEC.md`               | Update backlog status                                    | **None**                                            |

## Files You Will NOT Modify

| File                                      | Why                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/webview-bridge/src/types.ts`    | `CryptoMethod` already includes `'generateKey' \| 'getPublicKey'` — no change needed |
| `packages/kmp-sdk/**`                     | iOS handler already implements both methods — no change needed                       |
| `packages/self-sdk-swift/**`              | Swift crypto provider already implements both — no change needed                     |
| `packages/mobile-sdk-alpha/src/client.ts` | `SelfClient` doesn't expose crypto directly; consumers use adapters                  |
| `app/**`                                  | RN app doesn't call `generateKey`/`getPublicKey` through the adapter today           |

## Constraints

- **Key material stays native-managed.** `generateKey` and `getPublicKey` are
  bridge calls, not browser-local operations. The browser and RN default adapters
  must throw, not silently no-op.
- **No regressions in the RN app.** Adding optional methods would avoid type
  errors in existing code, but both methods are **required** on the interface —
  every adapter must implement them (even as throwing stubs). This keeps the
  contract honest.
- **Match the native response shapes exactly.** The `generateKey` response must
  include `{ keyRef }` and `getPublicKey` must return the raw bytes. The bridge
  adapter handles base64 decoding.

## Validation

```bash
# SDK core types + tests
cd packages/mobile-sdk-alpha && yarn types && yarn test

# Bridge package types + build
cd packages/webview-bridge && yarn build && yarn test

# Full lint pass
yarn lint
```

**Expected:** All pass with zero errors.

## Definition of Done

- [x] `CryptoAdapter` interface in `public.ts` exposes `generateKey(keyRef)` and `getPublicKey(keyRef)`
- [x] Bridge crypto adapter delegates both methods through `bridge.request()`
- [x] Browser crypto adapter has throwing stubs for both methods
- [x] RN crypto adapter has throwing stubs for both methods
- [x] `yarn types` clean in both `mobile-sdk-alpha` and `webview-bridge`
- [x] `yarn test` passes in both packages
- [x] Backlog row updated in SPEC.md
