# General Description

## What is Self?

Self is an identity verification wallet. Users scan their passport or ID card via NFC, and the app generates zero-knowledge proofs that verify identity attributes without revealing the underlying data.

## How It Works

```
1. User scans passport/ID (NFC chip)
2. App extracts identity data locally
3. ZK proof generated (proves attributes without revealing raw data)
4. Proof verified on-chain via smart contracts
5. Third-party apps verify identity via SDK integration
```

## Product Surfaces

| Surface | Description |
|---------|-------------|
| **Self Wallet** | Mobile app (iOS/Android) — user-facing identity wallet |
| **Self SDK** | Embeddable SDK for third-party apps to request and verify identity |
| **Smart Contracts** | On-chain verification infrastructure |
| **KYC Service** | Full KYC coverage via third-party provider for 100% document support |

## Supported Documents

| Document | Method | Coverage |
|----------|--------|----------|
| E-Passport | NFC chip reading | ICAO-compliant countries |
| EU ID Card | NFC chip reading | EU member states |
| Aadhaar | Special handling | India |
| KYC (all others) | Third-party provider | Global (100% coverage) |

## Key Capabilities

- **Selective disclosure**: Reveal only specific attributes (age, nationality, name)
- **Privacy-preserving**: Zero-knowledge proofs — verifier never sees raw data
- **On-chain verification**: Cryptographic proof verified by smart contracts
- **OFAC screening**: Sanctions list checking without exposing identity
- **Age verification**: Prove "older than X" without revealing date of birth
- **Country restrictions**: Verify nationality without revealing passport data
