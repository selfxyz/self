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

## Prover Key Config (Hub + KYC Registry)

`IdentityVerificationHubImplV2.registerProverKey` and `IdentityRegistryKycImplV1.registerPubkeyCommitment` both verify a
GCP Confidential Space attestation, and each contract holds its **own** copy of the config that verification depends on:
a GCP root CA pubkey hash and a `PCR0Manager` pointer. This duplication was an accepted design cost (see
`docs/superpowers/specs/2026-08-18-hub-register-prover-key-design.md`) in exchange for the hub not depending on the KYC
registry at runtime. It means every rotation below must touch both contracts, and the two `PCR0Manager` instances must
never be the same one.

### (a) Rotating the root CA hash or PCR0Manager pointer

Both values live independently on each contract. Rotating one and forgetting the other leaves them inconsistent — one
contract keeps verifying against stale config while the other verifies against the new one.

| Config value            | Hub setter                                 | KYC registry setter                  |
| ----------------------- | ------------------------------------------ | ------------------------------------ |
| GCP root CA pubkey hash | `updateProverGCPRootCAPubkeyHash(uint256)` | `updateGCPRootCAPubkeyHash(uint256)` |
| PCR0Manager pointer     | `updateProverPCR0Manager(address)`         | `updatePCR0Manager(address)`         |
| GCP JWT verifier        | `updateProverGCPJWTVerifier(address)`      | `updateGCPJWTVerifier(address)`      |
| Attested TEE address    | `updateProverTEE(address)`                 | `updateTEE(address)`                 |

Every setter above is `onlyRole(SECURITY_ROLE)` and emits an event, so drift between the two contracts is observable
off-chain by diffing the latest event per config value on each contract. When rotating, call the matching pair together
and verify both events landed before considering the rotation done.

### (b) Keep prover and KYC PCR0Manager instances separate

**This is the security-relevant rule, not just tidiness.** `PCR0Manager` is a flat set of approved image digests — it
has no notion of enclave _role_. If the hub's `_pcr0Manager` pointer is ever set to the **same instance** the KYC
registry points at (or prover image digests are added to that shared instance for convenience), then a prover
attestation replayed into `IdentityRegistryKycImplV1.registerPubkeyCommitment` passes the image check. That path has no
length assertion on the decoded value (unlike `GCPJWTHelper.unpackAndDecodeAddress`, which enforces exactly 40 hex
characters), so it would register the prover's address value as a KYC pubkey commitment. Exploiting this still requires
the KYC registry's `_tee` signing key and a commitment preimage, so it's a garbage-write, not an auth bypass — but it
re-introduces exactly the cross-role hazard that keeping `registerProverKey` off the KYC registry was meant to remove
(see the design doc's "Why the hub and not the KYC registry" section).

**Rule:** the hub's `PCR0Manager` instance must contain only prover image digests. The KYC registry's `PCR0Manager`
instance must contain only KYC-attestor image digests. Never point both contracts at the same instance, and never add
prover digests to the KYC registry's instance. Both pointers are independently configurable, so keeping them separate
costs nothing — it just has to be recorded so nobody reaches for the existing instance out of convenience during a
future rotation.

### (c) Post-upgrade config sequence for `registerProverKey`

After deploying the `IdentityVerificationHubImplV2` upgrade that introduces `registerProverKey`, the following four
`SECURITY_ROLE` setters must all be called before the function will succeed:

1. `updateProverGCPJWTVerifier(address)`
2. `updateProverPCR0Manager(address)` — pointing at a **prover-only** `PCR0Manager` instance, per (b)
3. `updateProverGCPRootCAPubkeyHash(uint256)`
4. `updateProverTEE(address)`

This is fail-closed by design: the config guard checked at the top of `registerProverKey` reverts `ProverConfigNotSet`
if any of the four is still at its zero default. A fresh proxy upgrade (no `reinitializer` bump — the ERC-7201
namespace's all-zero defaults are exactly what the guard treats as "not configured yet") will revert on every call until
all four are set, by construction rather than by convention.

### Prerequisite: the prover must already emit a bare 40-character nonce

`unpackAndDecodeAddress` decodes exactly 40 ASCII hex characters and reverts on anything longer, so a prover that puts a
`0x`-prefixed 42-character address in its attestation nonce fails every registration — after the four setters have
succeeded, which makes it look like a contract problem rather than a version-skew one.

So before enabling registration:

1. Deploy the `tee-prover-server` build whose attestation nonce carries the **bare** 40 hex characters, with no `0x`
   prefix.
2. Validate one real attestation end to end against the deployed hub on a testnet, and confirm `ProverKeyRegistered`
   fires with the address you expect.
3. Only then treat `registerProverKey` as enabled in production.

The ordering is one-way: the contract cannot accept the prefixed form without also accepting a 42-character nonce, which
would widen what it decodes. Fixing the producer is the correct side.

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
