# Tech Stack Overview

## Runtime & Package Management

- Language: TypeScript (strict mode) everywhere except native code
- Runtime: Node.js >=22 <23
- Package manager: Yarn 4.12.0 (workspaces)
- License: BUSL-1.1 (converts to Apache-2.0 on 2029-06-11)

## Monorepo Layout

```
repos/self/
├── app/                        # React Native wallet app (main product)
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── screens/            # Screen components by feature
│   │   ├── navigation/         # React Navigation setup
│   │   ├── providers/          # Context providers (auth, db, etc.)
│   │   ├── stores/             # Zustand stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Analytics, backup, notifications, etc.
│   │   ├── proving/            # ZK proof generation logic
│   │   ├── integrations/       # Third-party integrations
│   │   ├── utils/              # Utilities
│   │   ├── config/             # App configuration
│   │   └── types/              # Type definitions
│   ├── ios/                    # Native iOS (Swift)
│   └── android/                # Native Android (Java/Kotlin)
│
├── packages/
│   ├── mobile-sdk-alpha/       # Embeddable SDK (WebView engine, platform-agnostic core)
│   ├── webview-app/            # WebView application (React + Vite)
│   ├── webview-bridge/         # Bidirectional WebView <-> native communication
│   ├── rn-sdk/                 # React Native SDK wrapper (consumer-facing)
│   ├── mobile-sdk-demo/        # SDK demo application
│   ├── kmp-sdk/                # Kotlin Multiplatform SDK (future architecture)
│   ├── kmp-test-app/           # KMP test application
│   └── self-sdk-swift/         # Swift SDK
│
├── sdk/
│   ├── core/                   # Backend SDK (@selfxyz/core) - proving & verification
│   ├── qrcode/                 # QR code generation (React)
│   ├── qrcode-angular/         # QR code generation (Angular)
│   ├── sdk-common/             # Shared SDK utilities
│   └── sdk-go/                 # Go SDK
│
├── contracts/                  # Solidity smart contracts (Hardhat)
├── circuits/                   # Zero-knowledge circuits (Circom/Noir)
├── common/                     # Shared types, constants, utilities (@selfxyz/common)
├── noir/                       # Noir circuit development
└── scripts/                    # Build, test, and utility scripts
```

## Architectural Direction

The project is migrating from React Native toward a **WebView-based architecture** with a **Kotlin Multiplatform (KMP) compatibility layer** for iOS and Android. Key packages driving this:

- `mobile-sdk-alpha` — Platform-agnostic SDK core (WebView engine)
- `webview-bridge` — Communication layer between WebView and native shells
- `webview-app` — The web UI rendered inside the WebView
- `kmp-sdk` — Kotlin Multiplatform native layer (replaces RN native modules)

```
  Current                          Target
  ───────                          ──────
  React Native App                 WebView App (web tech)
  + Native Modules (RN bridge)     + KMP Native Layer (iOS/Android)
  + Platform-specific JS           + webview-bridge (communication)
```

## Core Frameworks

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Mobile app         | React Native 0.77 + Expo ~52       |
| UI library         | Tamagui                             |
| State (simple)     | Zustand                             |
| State (workflows)  | XState (state machines)             |
| Navigation         | React Navigation 7 (native-stack)  |
| Web build          | Vite + React                        |
| Library bundling   | tsup (ESM/CJS dual)                |
| Smart contracts    | Solidity + Hardhat + OpenZeppelin   |
| ZK circuits        | Circom / Noir + snarkjs             |
| CI/CD              | GitHub Actions (20+ workflows)      |

## Git Branching Strategy

```
feature branches
    │
    ▼
   dev          ← All feature PRs target dev
    │
    ▼
  staging       ← QA / integration testing
    │
    ▼
   main         ← Production releases
```

- Feature branches fork off `dev` (source of truth)
- PRs always target `dev`
- `dev` merges into `staging` for QA
- `staging` merges into `main` for production releases

## DOs

- DO use TypeScript strict mode for all new packages
- DO use Yarn workspaces for dependency management
- DO use tsup for building library packages (ESM + CJS dual output)
- DO build new SDK features in the WebView/KMP architecture, not in the RN app directly
- DO use the `@selfxyz/common` package for shared types and utilities
- DO keep shared constants and types in `common/`

## DON'Ts

- DON'T add new React Native native modules — use the WebView bridge pattern instead
- DON'T use npm or pnpm — this is a Yarn workspace monorepo
- DON'T import from other workspace packages by relative path — use package names (`@selfxyz/*`)
- DON'T add dependencies to the workspace root unless they're dev-only tooling
- DON'T bypass the adapter layer for platform-specific code
