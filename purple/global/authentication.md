# Authentication

## Overview

Mnemonic-based wallet authentication secured by device biometrics. No traditional session tokens or server-side auth. The mnemonic is the root of identity — all keys are derived from it.

## Auth Flow

```
User opens app
    │
    ▼
Biometric prompt (fingerprint / Face ID / passcode fallback)
    │
    ▼
Keychain unlocks → mnemonic accessible
    │
    ▼
Session active (15-minute timeout)
    │
    ▼
Any secret access → _getSecurely() or _getWithBiometrics()
```

## Architecture

- `AuthProvider` (React Context) wraps the entire app
- Biometric login via `react-native-biometrics` with `allowDeviceCredentials: true`
- Mnemonic stored in native keychain via `react-native-keychain`
- Adaptive security: automatically uses the device's highest available security level
- Session timeout: 15 minutes of inactivity → requires re-authentication

## Key Derivation

```
BIP39 Mnemonic
    │
    ├── m/44'/60'/0'/0/0  →  Primary wallet (main account)
    └── m/44'/60'/0'/0/1  →  Points wallet (secondary)
```

## SDK Auth Adapter

The mobile SDK defines a minimal `AuthAdapter` interface:

```
AuthAdapter {
  getPrivateKey(): Promise<string | null>
}
```

Platform adapters implement this — React Native uses keychain, web uses volatile in-memory storage (development only).

## External Auth (Third-Party Services Only)

| Service        | Method       | Purpose              | Token Persistence |
|----------------|-------------|----------------------|-------------------|
| Google Drive   | OAuth 2.0   | Mnemonic backup      | Per-session       |
| Sumsub KYC     | API token   | Identity verification | Per-session       |
| Turnkey        | Google OAuth | Wallet backup        | DISABLED          |

## Keychain Security Levels (Adaptive)

```
Device has secure hardware?  → SECURE_HARDWARE + BIOMETRY_ANY_OR_DEVICE_PASSCODE
Device has biometrics only?  → SECURE_SOFTWARE + BIOMETRY_ANY_OR_DEVICE_PASSCODE
Device has passcode only?    → ANY + DEVICE_PASSCODE
None available?              → ANY (no access control)
```

Migration function `migrateToSecureKeychain()` upgrades old entries to the highest available level.

## DOs

- DO use `_getSecurely()` for ALL access to keychain-stored secrets
- DO check biometric availability before prompting
- DO use the adaptive keychain configuration from `integrations/keychain/`
- DO track auth events via the analytics service (AuthEvents constants)
- DO handle keychain errors by category (user cancellation vs crypto failure)
- DO use the `AuthAdapter` interface for SDK-level auth (not direct keychain access)

## DON'Ts

- DON'T store mnemonics, private keys, or secrets in AsyncStorage or Zustand
- DON'T create web fallbacks for keychain — native keychain is a security boundary
- DON'T transmit the mnemonic over the network
- DON'T bypass biometric auth to access secrets
- DON'T use OAuth tokens for core identity — they're only for third-party services
- DON'T store sensitive auth state in persisted Zustand stores (flags only, not secrets)

## Key Files

| File | Purpose |
|------|---------|
| `app/src/providers/authProvider.tsx` | Core biometric + keychain auth |
| `app/src/providers/authProvider.web.tsx` | Web stub (incomplete) |
| `app/src/integrations/keychain/index.ts` | Adaptive security config |
| `app/src/utils/keychainErrors.ts` | Error categorization |
| `packages/mobile-sdk-alpha/src/adapters/react-native/auth.ts` | SDK auth adapter |
