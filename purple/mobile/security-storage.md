# Security & Storage

## Security Model

The device keychain is the root of trust. No web fallbacks for security-critical operations.

```
┌─────────────────────────────────────────┐
│ SECURITY BOUNDARY                       │
│                                         │
│   Keychain (native only)                │
│   ├── Mnemonic phrase                   │
│   ├── Private keys                      │
│   └── Auth adapter secrets              │
│                                         │
│   Access requires:                      │
│   ├── Biometric auth OR device passcode │
│   └── Active session (15-min timeout)   │
│                                         │
│   NO web implementation.                │
│   NO AsyncStorage fallback.             │
│   NO in-memory fallback (prod).         │
└─────────────────────────────────────────┘
```

## Adaptive Security Levels

The keychain configuration automatically adapts to the device's highest available security:

| Device Capability | Security Level | Access Control |
|-------------------|---------------|----------------|
| Secure hardware (StrongBox/SE) | `SECURE_HARDWARE` | `BIOMETRY_ANY_OR_DEVICE_PASSCODE` |
| Biometrics only | `SECURE_SOFTWARE` | `BIOMETRY_ANY_OR_DEVICE_PASSCODE` |
| Passcode only | `ANY` | `DEVICE_PASSCODE` |
| None | NOT ALLOWED | Block secret storage; require device passcode or biometrics |

Detection functions in `app/src/integrations/keychain/index.ts`:
- `checkBiometricsAvailable()`
- `checkPasscodeAvailable()`
- `getMaxSecurityLevel()`
- `detectSecurityCapabilities()`

## Keychain Migration

`migrateToSecureKeychain()` upgrades existing entries to the device's highest available security level. Tracked via `hasCompletedKeychainMigration` flag in the settings store.

## Session Management

- Session starts on successful biometric auth
- Timeout: 15 minutes of inactivity
- Expired session requires re-authentication
- Tracked via `isAuthenticated` flag in AuthProvider

## Secure Access Pattern

All secret access must go through wrapper functions:

```
_getSecurely(fn, formatter, options)     ← Adaptive keychain access
_getWithBiometrics(fn, formatter, opts)  ← Explicit biometric prompt
```

These detect device capabilities, configure keychain options, and handle errors by category.

## Android-Specific

- **StrongBox**: Optional hardware security module
- Toggle: `useStrongBox` in settings store
- Some devices support StrongBox but have bugs — configurable per-device

## Error Recovery

| Error Type | Action |
|------------|--------|
| User cancellation | Show auth prompt again |
| Crypto failure | Show error modal, may need keychain reset |
| Biometric lockout | Fall back to device passcode |
| Hardware error | Log and degrade to software security |

Global callback: `setKeychainCryptoFailureCallback()` for centralized error handling.

## DOs

- DO use adaptive keychain configuration from `integrations/keychain/`
- DO handle all three error categories (cancellation, crypto, biometric)
- DO run keychain migration on app start for existing users
- DO check device capabilities before presenting biometric options
- DO use the `_getSecurely()` wrapper for ALL keychain access

## DON'Ts

- DON'T create web implementations for keychain operations
- DON'T store secrets outside the keychain (no AsyncStorage, no SQLite, no Zustand)
- DON'T skip error categorization — different errors need different recovery flows
- DON'T assume StrongBox works on all Android devices
- DON'T access the keychain without going through the AuthProvider's secure wrappers
- DON'T extend session timeout beyond 15 minutes without security review
