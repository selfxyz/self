# Contracts — Agent Instructions

## V1 Contracts — DO NOT USE

All V1 contracts are fully deprecated and never used in production. **Do not read, edit, reference, or extend any V1 files.** This includes:

- `IdentityVerificationHubImplV1.sol`
- `IdentityRegistryImplV1.sol`, `IdentityRegistryIdCardImplV1.sol`, `IdentityRegistryAadhaarImplV1.sol`, `IdentityRegistryKycImplV1.sol`
- `IIdentityVerificationHubV1.sol`, `IIdentityRegistryV1.sol`, `IIdentityRegistryIdCardV1.sol`, `IIdentityRegistryAadhaarV1.sol`, `IIdentityRegistryKycV1.sol`
- `CircuitConstants.sol` (V1), `CircuitAttributeHandler.sol` (V1)
- Any test mock with `V1` in its name

When writing new contracts or integrations, always use V2 contracts, V2 interfaces, and V2 libraries (`CircuitConstantsV2`, `CircuitAttributeHandlerV2`, `IIdentityVerificationHubV2`, `IdentityVerificationHubImplV2`).

## Setup

### Prerequisites

- Node.js 22.x (`nvm use`)
- Yarn v4 (from monorepo root: `corepack enable && yarn install`)

### Environment

Copy `.env.example` to `.env` and configure:

```bash
NETWORK=localhost          # or celo, celo-sepolia, sepolia, mainnet
PRIVATE_KEY='0x...'        # Deployer private key
CELO_RPC_URL=...           # Use Alchemy — NOT celo.drpc.org (unreliable)
CELOSCAN_API_KEY=...       # For contract verification
```

### Build & Test

```bash
yarn build                 # Clean + compile all contracts (hardhat)
yarn test                  # All tests
yarn test:unit             # Unit tests only
yarn test:integration      # Integration tests only
yarn test:v2               # V2 verification flow on localhost
yarn test:coverage         # Coverage report
```

## Architecture

### Core Components (V2)

| Contract | Purpose |
|----------|---------|
| `IdentityVerificationHub.sol` | UUPS proxy — entry point for all verification |
| `IdentityVerificationHubImplV2.sol` | Hub implementation — routes proofs, manages configs |
| `registry/IdentityRegistry.sol` | UUPS proxy for identity registries |
| `abstract/SelfVerificationRoot.sol` | Base contract integrators inherit from (non-upgradeable) |
| `abstract/SelfVerificationRootUpgradeable.sol` | Base contract for upgradeable integrations |

### Verification Flow

```
User submits proof
  → Integrator contract (extends SelfVerificationRoot)
    → calls verifySelfProof(proofPayload, userContextData)
      → encodes scope + configId + proof → calls Hub V2
        → Hub validates: register proof, DSC proof, vc_and_disclose proof
          → Hub calls back onVerificationSuccess(output, userData)
            → Integrator's customVerificationHook() runs
```

### Attestation Types

| ID | Type | Constant |
|----|------|----------|
| 1 | E-Passport (NFC chip) | `AttestationId.E_PASSPORT` |
| 2 | EU ID Card (NFC chip) | `AttestationId.EU_ID_CARD` |
| 3 | Aadhaar | `AttestationId.AADHAAR` |
| 4 | KYC (SumSub) | `AttestationId.KYC` |

### Governance (Celo Mainnet)

- **SECURITY_ROLE** (3/5 multisig): `0x738f0bb37FD3b6C4Cdf8eb6FcdFaAA0CA208CB4A` — upgrades, role management
- **OPERATIONS_ROLE** (2/5 multisig): `0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0` — CSCA root, OFAC list updates
- **Safe TX service**: `https://safe-transaction-celo.safe.global/api`

## Writing Integrations

### The Pattern

Every integrating contract must:

1. **Inherit** `SelfVerificationRoot` (or `SelfVerificationRootUpgradeable`)
2. **Pass hub address + scopeSeed** to the constructor/initializer
3. **Override `getConfigId()`** — return the `configId` that matches a config registered on the hub
4. **Override `customVerificationHook()`** — your business logic runs here after proof verification succeeds
5. **Store a `verificationConfigId`** (bytes32) and provide an owner-only setter

See `contracts/example/SelfIdentityERC721.sol`, `contracts/example/Airdrop.sol`, or `contracts/example/HappyBirthday.sol` for complete reference implementations. (`SelfPassportERC721.sol` is a simpler example that does not implement `getConfigId()`.)

### Common Integration Pitfalls

#### Scope Mismatch

The scope is computed on-chain via Poseidon hashing and includes both the contract address and a seed string. The SDK must generate proofs with the **same scope** the contract computes.

Scope calculation (in `SelfVerificationRoot._calculateScope()`):
1. Convert contract address to hex string (42 chars: `"0x" + 40 hex digits`)
2. Split into 2 chunks: chars 0–30 (31 chars) and chars 31–41 (11 chars)
3. Convert each chunk to a BigInt via `SelfUtils.stringToBigInt()`
4. `addressHash = PoseidonT3.hash([chunk1BigInt, chunk2BigInt])`
5. `scopeSeedAsUint = SelfUtils.stringToBigInt(scopeSeed)`
6. `scope = PoseidonT3.hash([addressHash, scopeSeedAsUint])`

On local/dev networks (where PoseidonT3 is not deployed), scope returns 0. For local testing, create a setter to set the scope manually.

Common causes of scope mismatch:
- Using a different `scopeSeed` string in the SDK vs the constructor argument
- Deploying to a different address than expected (scope includes the contract address)
- Redeploying a contract without updating the SDK's scope — the new address changes the scope
- For upgradeable contracts: scope is set in the initializer via `__SelfVerificationRoot_init()`, not the constructor

**Debug:** Call `contract.scope()` on-chain and compare to what the SDK is generating.

#### Config Mismatch

The `configId` is `sha256(abi.encode(VerificationConfigV2))`. Both the hub and the integrating contract must agree on the exact same config.

`VerificationConfigV2` fields:
```solidity
struct VerificationConfigV2 {
    bool olderThanEnabled;
    uint256 olderThan;
    bool forbiddenCountriesEnabled;
    uint256[4] forbiddenCountriesListPacked;
    bool[3] ofacEnabled;       // [passport, name+DOB, name+year]
}
```

Common causes of config mismatch:
- Config not registered on the hub — call `hub.setVerificationConfigV2(config)` first, it returns the `configId`
- Integrator's `getConfigId()` returns a stale or wrong `configId` — verify with `hub.verificationConfigV2Exists(configId)`
- SDK sends a proof with config expectations that differ from what the hub has stored
- OFAC flags ordered incorrectly — the `bool[3]` array is `[passport, name+DOB, name+year]`, not arbitrary

**Debug:** Call `hub.generateConfigId(config)` with your expected config to get the `configId`, then verify it matches what your contract returns from `getConfigId()` and what the SDK is using.

## Deployment

### Full Fresh Deployment (Celo)

```bash
yarn run deploy:allverifiers:celo   # Deploy all ZK verifier contracts
yarn run deploy:registry:celo       # Deploy registry proxy + implementation
yarn run deploy:hub:celo            # Deploy hub proxy + implementation
yarn run update:cscaroot:celo       # Set CSCA root in registry
yarn run update:ofacroot:celo       # Set OFAC list root
yarn run update:hub:celo            # Link registry to hub
```

### Upgrades

See `UPGRADE_GUIDE.md` for the full workflow. Summary:

1. Update contract source (bump `@custom:version`, increment `reinitializer(N)`, append-only storage)
2. Run: `npx hardhat upgrade --contract IdentityVerificationHub --network celo --changelog "..."`
3. Script validates version, storage layout, deploys new implementation, creates Safe multisig proposal
4. SECURITY_ROLE (3/5) approves in Safe UI

### Deployed Addresses (Celo Mainnet)

- Hub proxy: `0x77117D60eaB7C044e785D68edB6C7E0e134970Ea`
- Registry proxy: `0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968`
- Full verifier list: see `README.md`

## Critical Gotchas — Celo + Hardhat

### Hardhat Provider Returns Stale ERC1967 Storage on Celo

`ethers.provider.getStorage(proxy, ERC1967_SLOT)` returns wrong/stale data on Celo. This causes `onlyProxy` modifier checks to appear to fail during `staticCall`/`estimateGas`.

**Workaround:** Pass explicit `{ gasLimit: 200000 }` on all `onlyProxy` function calls. On-chain execution works correctly — only the estimate is broken.

### OZ Upgrades Plugin Manifest

`.openzeppelin/celo.json` can become stale from failed deployments. `upgrades.deployProxy` may reuse cached implementations incorrectly. If the manifest is corrupt, back it up and delete it to start fresh. Prefer Ignition over `upgrades.deployProxy` for production deploys.

### Celo RPC Reliability

`celo.drpc.org` is unreliable for deploy confirmations ("Unknown block" errors). Use Alchemy — set `CELO_RPC_URL` in `.env`.

## Pre-Commit Checklist

- [ ] `yarn build` compiles without errors
- [ ] `yarn test` passes (or `yarn test:v2` for V2-specific changes)
- [ ] No V1 contracts were modified or extended
- [ ] Storage fields added append-only (end of struct only)
- [ ] `@custom:version` bumped if modifying hub/registry implementations
- [ ] `reinitializer(N)` incremented if adding new initializer logic

## Key File Paths

| What | Where |
|------|-------|
| Hub V2 implementation | `contracts/IdentityVerificationHubImplV2.sol` |
| Integration base (non-upgradeable) | `contracts/abstract/SelfVerificationRoot.sol` |
| Integration base (upgradeable) | `contracts/abstract/SelfVerificationRootUpgradeable.sol` |
| Verification config struct | `contracts/libraries/SelfStructs.sol` |
| Attestation ID constants | `contracts/constants/AttestationId.sol` |
| V2 circuit constants | `contracts/constants/CircuitConstantsV2.sol` |
| V2 attribute handler | `contracts/libraries/CircuitAttributeHandlerV2.sol` |
| Example integrations | `contracts/example/` |
| Deployment modules | `ignition/modules/` |
| Upgrade tooling | `tasks/upgrade/` |
| Deployment registry | `deployments/registry.json` |
| Upgrade guide | `UPGRADE_GUIDE.md` |
| Integration guide | `README.md` |
