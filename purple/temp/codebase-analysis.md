# Codebase Analysis - Self XYZ

## Project Overview
Identity verification wallet using NFC passport scanning + zero-knowledge proofs. Yarn 4.12.0 monorepo.

## Key Tech Stack
- **Mobile**: React Native 0.77.0 + Expo ~52.0.40
- **UI**: Tamagui 1.126.14
- **State**: Zustand + XState (state machines)
- **Navigation**: React Navigation 7
- **Database**: SQLite (mobile), Blockchain (contracts)
- **Auth**: Passkey, Biometric, Turnkey wallet, OAuth
- **Testing**: Jest (app), Vitest (packages), Hardhat/Mocha (contracts), Detox (E2E)
- **Linting**: ESLint + Prettier + Knip
- **Build**: Vite (web), Metro (RN), tsup (libraries), Hardhat (contracts)
- **CI/CD**: GitHub Actions (20+ workflows)
- **ZK**: Circom/Noir circuits + snarkjs
- **Contracts**: Solidity + Hardhat + OpenZeppelin
- **Native**: Swift (iOS), Java/Kotlin (Android)
- **Analytics**: Segment + Sentry
- **Node**: >=22 <23
- **License**: BUSL-1.1

## Monorepo Structure
- `/app/` - React Native mobile app (main product)
- `/packages/mobile-sdk-alpha/` - Embeddable SDK (WebView engine)
- `/packages/webview-bridge/` - WebView-native communication
- `/packages/webview-app/` - WebView application
- `/packages/rn-sdk/` - React Native SDK wrapper
- `/sdk/core/` - Backend SDK for verification
- `/contracts/` - Solidity smart contracts
- `/circuits/` - ZK circuits (Circom/Noir)
- `/common/` - Shared utilities/types/constants

## Architecture Patterns
- Platform adapter pattern (RN adapters wrap platform-specific APIs)
- WebView bridge for SDK distribution
- Provider pattern for context/state injection
- XState for complex workflows (proof generation)
- Zustand for simple global state
- Strict ESLint: no `export *`, enforced import sorting

## Database
- SQLite via react-native-sqlite-storage
- Single DB: proof_history.db with proof_history table
- Keychain for secure storage (native only)
- AsyncStorage for non-sensitive state

## No Traditional Backend
- No Express/Nest/etc server
- Smart contracts serve as "backend"
- SDK core package handles proving/verification
- External services: Firebase, Segment, Sentry, Sumsub KYC
