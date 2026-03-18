# NFC & Biometrics

## NFC Passport Reading

### Flow

```
1. MRZ Scan (optical)         ← Camera reads Machine Readable Zone
    │
    ▼
2. Extract MRZ Key            ← Document number + DOB + expiry
    │
    ▼
3. NFC Chip Read              ← Authenticate and read passport chip
    │
    ▼
4. Extract Data Groups        ← DG1 (MRZ data), DG2 (photo), etc.
    │
    ▼
5. Validate Signatures        ← Verify certificate chain (DSC → CSCA)
    │
    ▼
6. Generate Circuit Inputs    ← Prepare for ZK proof generation
```

### NFC Implementation

- **Package**: `react-native-nfc-manager`
- **Protocol**: ICAO 9303 (Machine Readable Travel Documents)
- **SDK adapter**: `packages/mobile-sdk-alpha/src/adapters/react-native/nfc-scanner.ts`
- **Bridge domain**: `nfc` (methods: `scan`, `cancelScan`, `isSupported`)
- **iOS framework**: `NFCPassportReader.xcframework` (native chip reading)

### Supported Documents

| Type | NFC Support | MRZ Format |
|------|-------------|------------|
| E-Passport | Full (ICAO chip) | TD3 (2 lines, 44 chars) |
| EU ID Card | Full (ICAO chip) | TD1 (3 lines, 30 chars) |
| Aadhaar | Special handling | Custom |

### Error Handling

NFC errors are categorized for recovery:
- Tag connection lost → retry prompt
- Authentication failed → MRZ mismatch
- User cancelled → clean abort via AbortSignal
- Unsupported tag → document not compatible

## Biometric Authentication

### Implementation

- **Package**: `react-native-biometrics`
- **Config**: `allowDeviceCredentials: true` (passcode fallback)
- **Prompt**: "Confirm your identity to access the stored secret"

### Biometric Types

| Platform | Method |
|----------|--------|
| iOS | Face ID, Touch ID |
| Android | Fingerprint, face unlock |
| Both | Device passcode (fallback) |

### Error Categories

Defined in `app/src/utils/keychainErrors.ts`:
- **User cancellation**: User dismissed the prompt
- **Crypto failure**: Keychain decryption failed (may need reset)
- **Biometric-specific**: Hardware errors (codes 5, 10 on Android)

## Haptic Feedback

- **Package**: `react-native-haptic-feedback`
- **Usage**: Success/error feedback, button presses, NFC scan events

## DOs

- DO support AbortSignal for NFC scan cancellation
- DO validate MRZ checksum before attempting NFC read
- DO always allow passcode fallback for biometric prompts
- DO categorize biometric errors (cancellation vs hardware failure)
- DO test NFC on physical devices with real passports
- DO use haptic feedback for NFC scan success/failure

## DON'Ts

- DON'T attempt NFC without first extracting MRZ data (key material needed)
- DON'T assume biometrics are available — always check first
- DON'T block the UI during NFC scan — show progress via bridge events
- DON'T store NFC-read data in plain text — process and discard raw chip data
- DON'T skip certificate chain validation after NFC read
