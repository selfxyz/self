# Core Value Proposition

## Problem

Identity verification today requires users to hand over sensitive personal data (passport scans, selfies, addresses) to centralized services. This data is stored, shared, and often breached. Users have no control over what's revealed or how it's used.

## Solution: Privacy-First Identity

Self lets users **prove identity attributes without revealing the underlying data**. Using zero-knowledge proofs:

- Prove you're over 18 **without revealing your date of birth**
- Prove your nationality **without revealing your passport number**
- Pass OFAC sanctions screening **without exposing your name**
- Complete KYC requirements **without uploading documents to a server**

## What Makes Self Different

| Traditional KYC | Self |
|-----------------|------|
| Upload passport photo to a server | Scan NFC chip locally on your device |
| Company stores your data | No data leaves your device (ZK proofs only) |
| Full identity revealed to verifier | Selective disclosure — reveal only what's needed |
| Trust the company with your data | Cryptographic verification — trust math, not companies |
| Re-verify for every new service | Prove once, reuse proof across services |

## Target Users

- **End users**: Anyone who needs to verify their identity online
- **Businesses**: Companies that need KYC/age/identity verification for their users
- **Developers**: Build identity verification into their apps via the Self SDK
