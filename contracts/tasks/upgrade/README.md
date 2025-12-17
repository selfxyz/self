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
```

## The `upgrade` Command

Validates, deploys, and creates a Safe multisig proposal in one step.

```bash
npx hardhat upgrade \
  --contract <ContractId> \
  --network <network> \
  [--changelog <message>] \
  [--prepare-only]
```

**Options:**

- `--contract` - Contract to upgrade (IdentityVerificationHub, IdentityRegistry, etc.)
- `--network` - Target network (celo, sepolia, localhost)
- `--changelog` - Description of changes
- `--prepare-only` - Deploy implementation without creating Safe proposal

**What it does:**

1. ✅ Validates `@custom:version` increment
2. ✅ Checks `reinitializer(N)` matches expected version
3. ✅ Validates storage layout compatibility
4. ✅ Clears cache and compiles fresh
5. ✅ Compares bytecode (warns if unchanged)
6. ✅ Deploys new implementation
7. ✅ Updates deployment registry
8. ✅ Creates git commit and tag
9. ✅ Creates Safe proposal (or outputs manual instructions)

## Utility Commands

```bash
# Check current deployment status
npx hardhat upgrade:status --contract IdentityVerificationHub --network celo

# View version history
npx hardhat upgrade:history --contract IdentityVerificationHub
```

## Workflow

### For Developers

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. UPDATE CONTRACT CODE                                             │
│    - Make your changes                                              │
│    - Update @custom:version in NatSpec                              │
│    - Increment reinitializer(N) modifier                            │
│    - Add new storage fields at END of struct only                   │
├─────────────────────────────────────────────────────────────────────┤
│ 2. RUN: npx hardhat upgrade --contract X --network Y --changelog Z  │
│    - Validates all safety checks                                    │
│    - Deploys new implementation                                     │
│    - Updates registry.json                                          │
│    - Creates git commit + tag                                       │
│    - Creates Safe proposal                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 3. MULTISIG APPROVAL                                                │
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

    // Increment reinitializer(N) for each upgrade
    function initialize(...) external reinitializer(13) {
        // Initialize new fields if needed
        MyStorage storage $ = _getMyStorage();
        if ($.newField == 0) {
            $.newField = defaultValue;
        }
    }
}
```

## Configuration

### Deployment Registry

The registry (`deployments/registry.json`) tracks:

- Proxy addresses per network
- Current versions
- Implementation history
- Git commits and tags

### Governance Configuration

Multisig addresses are configured in `deployments/registry.json`:

```json
{
  "networks": {
    "celo": {
      "governance": {
        "securityMultisig": "0x...",
        "operationsMultisig": "0x...",
        "securityThreshold": "3/5",
        "operationsThreshold": "2/5"
      }
    }
  }
}
```

### Environment Variables

Required for deployments:

```bash
PRIVATE_KEY=0x...          # Deployer private key
CELO_RPC_URL=https://...   # RPC endpoint
```

## Supported Contracts

| Contract ID               | Contract Name                 | Type       |
| ------------------------- | ----------------------------- | ---------- |
| `IdentityVerificationHub` | IdentityVerificationHubImplV2 | UUPS Proxy |
| `IdentityRegistry`        | IdentityRegistryImplV1        | UUPS Proxy |
| `IdentityRegistryIdCard`  | IdentityRegistryIdCardImplV1  | UUPS Proxy |
| `IdentityRegistryAadhaar` | IdentityRegistryAadhaarImplV1 | UUPS Proxy |

## Safety Checks

| Check                  | What it Does                                | Failure Behavior     |
| ---------------------- | ------------------------------------------- | -------------------- |
| Version validation     | Ensures semantic version increment          | Blocks upgrade       |
| Reinitializer check    | Verifies `reinitializer(N)` matches version | Blocks upgrade       |
| Storage layout         | Detects breaking storage changes            | Blocks upgrade       |
| Bytecode comparison    | Warns if code unchanged                     | Prompts confirmation |
| Safe role verification | Confirms Safe has SECURITY_ROLE             | Blocks upgrade       |
| Constructor check      | Flags `_disableInitializers()`              | Prompts confirmation |

## Troubleshooting

| Issue                         | Solution                                  |
| ----------------------------- | ----------------------------------------- |
| "Version matches current"     | Update `@custom:version` in contract      |
| "Reinitializer mismatch"      | Update `reinitializer(N)` to next version |
| "Storage layout incompatible" | Don't remove/reorder storage variables    |
| "Safe not indexed"            | Submit manually via Safe UI               |
| "Bytecode unchanged"          | Ensure you saved contract changes         |
