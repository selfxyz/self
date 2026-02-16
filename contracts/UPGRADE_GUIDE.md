# Contract Upgrade Guide

## Quick Start

### 1. Update Your Contract

```solidity
// Update version in NatSpec
* @custom:version 2.13.0

// Update reinitializer modifier (increment by 1)
function initialize(...) external reinitializer(13) {
    // Add any new initialization logic
}
```

### 2. Run the Upgrade Script

```bash
cd contracts
npx hardhat upgrade --contract IdentityVerificationHub --network celo --changelog "Added feature X"
```

### 3. Approve in Safe

The script outputs instructions to submit to the Safe multisig. Once 3/5 signers approve, execute the transaction.

---

## Governance Roles

| Role              | Threshold | Purpose                              |
| ----------------- | --------- | ------------------------------------ |
| `SECURITY_ROLE`   | 3/5       | Contract upgrades, role management   |
| `OPERATIONS_ROLE` | 2/5       | CSCA root updates, OFAC list updates |

---

## Detailed Workflow

### Step 1: Modify the Contract

1. Make your code changes
2. Update `@custom:version` in the contract's NatSpec comment
3. Increment the `reinitializer(N)` modifier (e.g., `reinitializer(12)` → `reinitializer(13)`)
4. Add any new storage fields **at the end** of the storage struct

**Example:**

```solidity
/**
 * @title IdentityVerificationHubImplV2
 * @custom:version 2.13.0
 */
contract IdentityVerificationHubImplV2 is ImplRoot {

    struct HubStorage {
        // Existing fields...
        uint256 newField;  // Add new fields at the end only
    }

    function initialize(...) external reinitializer(13) {
        // Initialize new fields if needed
        HubStorage storage $ = _getHubStorage();
        $.newField = defaultValue;
    }
}
```

### Step 2: Run the Upgrade Script

```bash
npx hardhat upgrade --contract <ContractName> --network <network> --changelog "Description"
```

**Options:**

- `--contract` - Contract name (e.g., `IdentityVerificationHub`)
- `--network` - Target network (`celo`, `sepolia`, `localhost`)
- `--changelog` - Brief description of changes
- `--prepare-only` - Deploy implementation without creating Safe proposal

### Step 3: Script Execution

The script automatically:

1. **Validates version** - Ensures `@custom:version` is incremented correctly
2. **Checks reinitializer** - Verifies `reinitializer(N)` matches expected version
3. **Validates storage** - Ensures no breaking storage layout changes
4. **Compiles fresh** - Clears cache to prevent stale bytecode
5. **Compares bytecode** - Warns if implementation hasn't changed
6. **Deploys implementation** - Deploys new implementation contract
7. **Updates registry** - Records deployment in `deployments/registry.json`
8. **Creates git commit & tag** - Auto-commits changes with version tag
9. **Creates Safe proposal** - If you're a signer, auto-proposes to Safe

### Step 4: Multisig Approval

**If you're a Safe signer:**

- Script auto-proposes the transaction
- Other signers approve in Safe UI
- Execute once threshold (3/5) is met

**If you're not a signer:**

- Script outputs transaction data for manual submission
- Copy data to Safe Transaction Builder
- Signers approve and execute

---

## Safety Checks

The upgrade script performs these automatic checks:

| Check                  | What it Does                       | Failure Behavior     |
| ---------------------- | ---------------------------------- | -------------------- |
| Version validation     | Ensures semantic version increment | Blocks upgrade       |
| Reinitializer check    | Verifies modifier matches version  | Blocks upgrade       |
| Storage layout         | Detects breaking storage changes   | Blocks upgrade       |
| Bytecode comparison    | Warns if code unchanged            | Prompts confirmation |
| Safe role verification | Confirms Safe has `SECURITY_ROLE`  | Blocks upgrade       |
| Constructor check      | Flags `_disableInitializers()`     | Prompts confirmation |

---

## Registry Structure

All deployments are tracked in `deployments/registry.json`:

```json
{
  "contracts": {
    "ContractName": {
      "source": "ContractSourceFile",
      "type": "uups-proxy"
    }
  },
  "networks": {
    "celo": {
      "deployments": {
        "ContractName": {
          "proxy": "0x...",
          "currentVersion": "2.12.0",
          "currentImpl": "0x..."
        }
      }
    }
  },
  "versions": {
    "ContractName": {
      "2.12.0": {
        "initializerVersion": 12,
        "changelog": "...",
        "gitTag": "contractname-v2.12.0",
        "deployments": { ... }
      }
    }
  }
}
```

---

## Utility Commands

```bash
# Check current deployment status
npx hardhat upgrade:status --contract IdentityVerificationHub --network celo

# View version history
npx hardhat upgrade:history --contract IdentityVerificationHub
```

---

## Rollback

If issues occur after upgrade:

1. Deploy the previous implementation version
2. Create Safe transaction calling `upgradeToAndCall(previousImpl, "0x")`
3. Execute with 3/5 multisig approval

---

## Environment Setup

Required in `.env`:

```bash
CELO_RPC_URL=https://forno.celo.org
PRIVATE_KEY=0x...  # Deployer wallet (needs ETH for gas)
```

Optional for contract verification:

```bash
CELOSCAN_API_KEY=...
ETHERSCAN_API_KEY=...
```

---

## Troubleshooting

| Issue                         | Solution                                  |
| ----------------------------- | ----------------------------------------- |
| "Version matches current"     | Update `@custom:version` in contract      |
| "Reinitializer mismatch"      | Update `reinitializer(N)` to next version |
| "Storage layout incompatible" | Don't remove/reorder storage variables    |
| "Safe not indexed"            | Submit manually via Safe UI               |
| "Bytecode unchanged"          | Ensure you saved contract changes         |
