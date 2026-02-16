# Upgrade Tooling

A comprehensive toolset for safely upgrading UUPS proxy contracts in the Self Protocol.

## Overview

The upgrade tooling provides:

- **Safety checks** - Storage layout validation, version validation, reinitializer verification
- **Safe multisig integration** - Creates proposals for SECURITY_ROLE approval
- **Version tracking** - Automatic registry updates and git tagging
- **Audit trail** - Complete deployment history with changelogs

## Quick Start

```bash
# Single command to validate, deploy, and propose
npx hardhat upgrade --contract IdentityVerificationHub --network celo --changelog "Added feature X"

# Dry run first to validate without deploying
npx hardhat upgrade --contract IdentityRegistryKyc --network celo-sepolia --dry-run
```

## Commands

### `upgrade`

Validates, deploys, and creates a Safe multisig proposal in one step.

```bash
npx hardhat upgrade \
  --contract <ContractId> \
  --network <network> \
  [--changelog <message>] \
  [--prepare-only] \
  [--dry-run] \
  [--skip-commit]
```

**Options:**

| Flag             | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `--contract`     | Contract to upgrade (see [Supported Contracts](#supported-contracts)) |
| `--network`      | Target network: `celo`, `celo-sepolia`                                |
| `--changelog`    | Description of changes for the version history                        |
| `--prepare-only` | Deploy implementation without creating Safe proposal                  |
| `--dry-run`      | Simulate the full flow without deploying or proposing                 |
| `--skip-commit`  | Skip automatic git commit after deployment                            |

**What it does:**

1. Validates `@custom:version` increment
2. Checks `reinitializer(N)` matches expected version
3. Validates storage layout compatibility
4. Clears cache and compiles fresh
5. Compares bytecode (warns if unchanged)
6. Deploys new implementation (+ PoseidonT3 library for registry contracts)
7. Verifies on block explorer
8. Updates `deployments/registry.json`
9. Creates git commit and tag
10. Creates Safe proposal (or outputs manual instructions)

### `upgrade:prepare`

Deploys the new implementation only, without creating a Safe proposal.

```bash
npx hardhat upgrade:prepare \
  --contract <ContractId> \
  --network <network> \
  [--changelog <message>] \
  [--dry-run] \
  [--skip-commit]
```

### `upgrade:propose`

Creates a Safe multisig proposal for an already-deployed implementation.

```bash
npx hardhat upgrade:propose \
  --contract <ContractId> \
  --network <network> \
  [--dry-run]
```

### `upgrade:status`

Check current deployment status for a contract.

```bash
npx hardhat upgrade:status --contract IdentityVerificationHub --network celo
```

### `upgrade:history`

View the full version history for a contract.

```bash
npx hardhat upgrade:history --contract IdentityVerificationHub
```

## Workflow

### For Developers

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. UPDATE CONTRACT CODE                                             │
│    - Make your changes                                              │
│    - Update @custom:version in NatSpec                              │
│    - Increment reinitializer(N) modifier (if new storage/init)      │
│    - Add new storage fields at END of struct only                   │
├─────────────────────────────────────────────────────────────────────┤
│ 2. DRY RUN: npx hardhat upgrade --contract X --network Y --dry-run  │
│    - Validates all safety checks without deploying                  │
├─────────────────────────────────────────────────────────────────────┤
│ 3. DEPLOY: npx hardhat upgrade --contract X --network Y --changelog │
│    - Deploys new implementation                                     │
│    - Updates registry.json                                          │
│    - Creates git commit + tag                                       │
│    - Creates Safe proposal                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 4. MULTISIG APPROVAL                                                │
│    - Signers review in Safe UI                                      │
│    - Once threshold met, click Execute                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Contract Update Pattern

```solidity
/**
 * @title MyContract
 * @custom:version 2.13.0  // <-- Update this
 */
contract MyContract is ImplRoot {

    struct MyStorage {
        uint256 existingField;
        uint256 newField;  // <-- Add new fields at end only
    }

    // Increment reinitializer(N) for each upgrade that needs initialization
    function initialize(...) external reinitializer(13) {
        // Initialize new fields if needed
        MyStorage storage $ = _getMyStorage();
        if ($.newField == 0) {
            $.newField = defaultValue;
        }
    }
}
```

Note: If an upgrade is code-only (no new storage, no initialization needed), you can bump `@custom:version` without
adding a new `reinitializer`. The script handles both cases.

## Supported Contracts

| Contract ID               | Source Contract               | Type            | Notes                                    |
| ------------------------- | ----------------------------- | --------------- | ---------------------------------------- |
| `IdentityVerificationHub` | IdentityVerificationHubImplV2 | UUPS Proxy      | Main verification hub                    |
| `IdentityRegistry`        | IdentityRegistryImplV1        | UUPS Proxy      | Passport registry (links PoseidonT3)     |
| `IdentityRegistryIdCard`  | IdentityRegistryIdCardImplV1  | UUPS Proxy      | EU ID Card registry (links PoseidonT3)   |
| `IdentityRegistryAadhaar` | IdentityRegistryAadhaarImplV1 | UUPS Proxy      | Aadhaar registry (links PoseidonT3)      |
| `IdentityRegistryKyc`     | IdentityRegistryKycImplV1     | UUPS Proxy      | KYC registry (links PoseidonT3)          |
| `PCR0Manager`             | PCR0Manager                   | Non-upgradeable | TEE PCR0 value management (tracked only) |
| `VerifyAll`               | VerifyAll                     | Non-upgradeable | SDK verification helper (tracked only)   |
| `DummyContract`           | DummyContract                 | UUPS Proxy      | Testing contract                         |

The four registry contracts (Passport, IdCard, Aadhaar, KYC) all use the PoseidonT3 library for their internal Lean IMT.
The upgrade script automatically deploys and links PoseidonT3 when deploying a new implementation for these contracts.

## Supported Networks

| Network        | Chain ID | Governance                   | Use Case   |
| -------------- | -------- | ---------------------------- | ---------- |
| `celo`         | 42220    | 3/5 security, 2/5 operations | Production |
| `celo-sepolia` | 11142220 | 1/1 single signer            | Testnet    |

## Configuration

### Deployment Registry

The registry (`deployments/registry.json`) tracks:

- Contract definitions (source contract name, type)
- Proxy addresses per network
- Current versions and implementation addresses
- Governance multisig configuration per network
- Full version history with deployment details and git commits

### Governance Configuration

Multisig addresses are configured per network in `deployments/registry.json`:

```json
{
  "networks": {
    "celo": {
      "governance": {
        "securityMultisig": "0x738f...",
        "operationsMultisig": "0x067b...",
        "securityThreshold": "3/5",
        "operationsThreshold": "2/5"
      }
    },
    "celo-sepolia": {
      "governance": {
        "securityMultisig": "0x82D8...",
        "operationsMultisig": "0x82D8...",
        "securityThreshold": "1/1",
        "operationsThreshold": "1/1"
      }
    }
  }
}
```

### Environment Variables

Required for deployments:

```bash
PRIVATE_KEY=0x...              # Deployer private key
CELO_RPC_URL=https://...       # Celo mainnet RPC endpoint
CELO_SEPOLIA_RPC_URL=https://... # Celo Sepolia RPC endpoint
```

## Safety Checks

| Check                  | What it Does                                         | Failure Behavior     |
| ---------------------- | ---------------------------------------------------- | -------------------- |
| Version validation     | Ensures semantic version increment vs registry       | Blocks upgrade       |
| Reinitializer check    | Verifies `reinitializer(N)` matches expected version | Blocks upgrade       |
| Storage layout         | Detects breaking storage changes                     | Blocks upgrade       |
| Bytecode comparison    | Warns if code unchanged from current impl            | Prompts confirmation |
| Safe role verification | Confirms Safe has SECURITY_ROLE on proxy             | Blocks upgrade       |
| Constructor check      | Flags `_disableInitializers()`                       | Prompts confirmation |

## Troubleshooting

| Issue                                  | Solution                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| "Version matches current"              | Update `@custom:version` in contract NatSpec                                               |
| "Reinitializer mismatch"               | Update `reinitializer(N)` to next version                                                  |
| "Storage layout incompatible"          | Don't remove/reorder storage variables                                                     |
| "Safe not indexed"                     | Submit manually via Safe UI                                                                |
| "Bytecode unchanged"                   | Ensure you saved contract changes                                                          |
| "No proxy deployed for X on network Y" | Add the contract's proxy address to `registry.json` under `networks.<network>.deployments` |
| "Invalid contract"                     | Contract ID not in `CONTRACT_IDS` array in `types.ts`                                      |
