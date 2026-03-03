# Smart Contracts

## Overview

Solidity smart contracts for on-chain identity verification using zero-knowledge proofs. Deployed via Hardhat with UUPS upgradeable proxy pattern.

## Architecture

```
IdentityVerificationHub (ERC1967 Proxy)
    │
    ▼
IdentityVerificationHubImplV2 (UUPS Implementation)
    │
    ├── Registries (per attestation type)
    │   ├── IdentityRegistry (E-Passport)
    │   ├── IdentityRegistryIdCard (EU-ID)
    │   ├── IdentityRegistryAadhaar
    │   └── IdentityRegistryKyc
    │
    ├── Register Verifiers (32 variants)
    │   └── One per hash/signature algorithm combo
    │
    ├── DSC Verifiers (24 variants)
    │   └── Document Signing Certificate chain verification
    │
    └── Disclose Verifiers (4 variants)
        └── Selective attribute disclosure
```

## Contract Patterns

- **Proxy**: ERC1967 via `ProxyRoot` (extends `ERC1967Proxy`)
- **Upgradeable**: UUPS via `ImplRoot` (extends `UUPSUpgradeable + AccessControlUpgradeable`)
- **Storage**: ERC-7201 namespaced storage (V2 contracts only)
- **Governance**: Two roles — `SECURITY_ROLE` (upgrade authority) and `OPERATIONS_ROLE` (configuration)

## Attestation Types

| ID | Type | Constant |
|----|------|----------|
| 1 | E-Passport | `AttestationId.E_PASSPORT` |
| 2 | EU ID Card | `AttestationId.EU_ID_CARD` |
| 3 | Aadhaar | `AttestationId.AADHAAR` |
| 4 | KYC | `AttestationId.KYC` |

## Deployment

- **Tool**: Hardhat Ignition (declarative deployment modules)
- **Modules location**: `contracts/ignition/modules/`
- **Networks**: Hardhat (local), Sepolia (testnet), Ethereum mainnet, Celo, Celo-Sepolia
- **Compiler**: Solidity 0.8.28, EVM target: Cancun, optimizer: 200 runs

## Key Libraries

| Library | Purpose |
|---------|---------|
| `SelfStructs` | Shared data structures |
| `CustomVerifier` | Proof verification logic |
| `Formatter` / `GenericFormatter` | Data packing/unpacking |
| `CircuitAttributeHandler(V2)` | Attribute extraction |
| `PoseidonT3` | Merkle tree hashing |
| `RootCheckLib` | Merkle root validation |
| `OfacCheckLib` | Sanctions screening |

## Testing

- Framework: Hardhat (Mocha + Chai + ethers.js)
- Pattern: `deploySystemFixtures()` + EVM snapshots for isolation
- Location: `contracts/test/unit/`, `contracts/test/integration/`, `contracts/test/v2/`
- Run: `yarn test` (all), `yarn test:hub` (hub only), `yarn test:coverage`

## DOs

- DO use Hardhat Ignition modules for deployments
- DO use ERC-7201 namespaced storage for new contract state
- DO extend `ImplRoot` for new upgradeable implementations
- DO use `ProxyRoot` for new proxy contracts
- DO use `deploySystemFixtures()` for test setup with EVM snapshots
- DO add verifier contracts for new hash/signature algorithm combinations
- DO use the `SelfStructs` library for shared data types

## DON'Ts

- DON'T modify V1 storage layout — it's frozen (causes catastrophic storage collisions)
- DON'T deploy directly — always use Ignition modules
- DON'T bypass UUPS upgrade authorization
- DON'T use `allowUnlimitedContractSize` outside of local development
- DON'T hardcode network addresses — use environment variables and deployment artifacts
- DON'T create new proxy patterns — reuse `ProxyRoot`
