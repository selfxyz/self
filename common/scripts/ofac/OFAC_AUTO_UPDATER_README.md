# OFAC Sanctions List Automation

Automated pipeline for updating OFAC sanctions list with ~200-500ms mismatch window using Google Cloud Storage.

## Overview

The OFAC auto-updater runs in a **Trusted Execution Environment (TEE)** and performs:

1. Downloads OFAC SDN XML from U.S. Treasury
2. Parses XML into structured JSON format
3. Builds 7 Merkle trees in parallel (passport, name+dob, name+yob, ID card variants, Aadhaar variants)
4. Updates on-chain OFAC roots via smart contracts
5. Uploads tree files to Google Cloud Storage with atomic pointer updates

## Prerequisites

### Google Cloud Storage Access

1. Create a GCS bucket for OFAC data (e.g., `self-ofac-test`, `self-ofac-staging`)
2. Enable versioning on the bucket for rollback capability
3. Create a service account with `roles/storage.objectAdmin` permission
4. Download the service account key JSON file
5. Place credentials file at `common/scripts/ofac/gcs-credentials.json` (or set `GOOGLE_APPLICATION_CREDENTIALS`)

### TEE Role Setup

The TEE's address must have `TEE_ROLE` on all registry contracts before production deployment.

**Registry Addresses (Celo Mainnet)**:
- IdentityRegistry: `0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968`
- IdentityRegistryIdCard: `0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1`
- IdentityRegistryAadhaar: `0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4`

**Grant TEE_ROLE**:
```bash
# Get TEE address from private key
TEE_ADDRESS=$(cast wallet address --private-key $TEE_PRIVATE_KEY)
TEE_ROLE=$(cast keccak "TEE_ROLE")

# Grant on all registries (requires SECURITY_ROLE)
for REGISTRY in \
  "0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968" \
  "0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1" \
  "0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4"; do

  cast send $REGISTRY \
    "grantRole(bytes32,address)" \
    $TEE_ROLE $TEE_ADDRESS \
    --rpc-url https://forno.celo.org \
    --private-key $ADMIN_PRIVATE_KEY
done
```

## Usage

### Docker (Production/TEE)

Build the image:
```bash
docker build -f common/scripts/ofac/Dockerfile -t ofac-auto-updater .
```

Run with GCS credentials:
```bash
docker run --rm \
  -e PRIVATE_KEY=0x... \
  -e NETWORK=celo \
  -e GCS_BUCKET_NAME=self-ofac-test \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcs-key.json \
  -v /local/ofac:/data \
  -v /local/gcs-key.json:/secrets/gcs-key.json:ro \
  ofac-auto-updater
```

### Local Execution

```bash
PRIVATE_KEY=0x... \
NETWORK=celo \
GCS_BUCKET_NAME=self-ofac-test \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcs-key.json \
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts
```

### Environment Variables

- `PRIVATE_KEY` (required): Signer key for on-chain updates. Must have `TEE_ROLE` on registry contracts.
- `NETWORK`: `celo` or `celo-sepolia` (default: `celo`)
- `RPC_URL`: Custom RPC URL (or use network defaults)
- `OFAC_DATA_DIR`: Data directory (default: `/data/ofac`)
- `GCS_BUCKET_NAME`: GCS bucket name (default: `self-ofac-test` for celo, `self-ofac-staging` for celo-sepolia)
- `GCS_BASE_PATH`: Base path in bucket (default: `ofac`)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCS service account key JSON
- `DRY_RUN=true`: Skip on-chain updates and GCS uploads
- `SKIP_UPLOAD=true`: Skip GCS upload only
- `SKIP_PIPELINE=true`: Skip pipeline, use existing trees (for testing)

## Testing

### Full Fork Test (Pipeline + On-Chain + GCS)

Tests complete flow with real GCS uploads and local blockchain fork:

```bash
# 1. Start local fork (forks at latest block automatically)
anvil --fork-url https://forno.celo.org --port 8545

# 2. Run test (uses gcs-credentials.json from ofac folder)
./common/scripts/ofac/test-with-fork.sh
```

**What it tests**:
- Real pipeline execution
- TEE_ROLE auto-granting on fork
- On-chain updates (on fork, no real gas)
- Real GCS uploads to staging bucket
- Mismatch window measurement

### On-Chain Only Test (Skip Tree Building)

Quick test for on-chain updates without rebuilding trees:

```bash
# Requires existing trees from previous run
./common/scripts/ofac/test-onchain-only.sh
```

**What it tests**:
- TEE_ROLE granting logic
- On-chain update transactions
- Uses existing tree files (skips pipeline)

### Dry Run Test

Simulates complete flow without real changes:

```bash
./common/scripts/ofac/test-dry-run.sh
```

**What it tests**:
- Pipeline logic
- Progress dashboard
- No real GCS uploads or on-chain calls

## How GCS Is Used

The updater uses Google Cloud Storage for atomic file deployment:

1. **Upload Phase**: Upload all tree files to a versioned path (e.g., `ofac/2026-01-09-1736437890/`)
2. **On-Chain Update**: Submit transactions to update OFAC roots on smart contracts
3. **Atomic Switch**: Update `current.json` pointer file to reference the new version path

### Mismatch Window

- **Target**: < 1 second between on-chain confirmation and GCS pointer update
- **Consistency**: Readers always see a complete snapshot (all files from the same version)

### File Structure

```
gs://self-ofac-test/
  ofac/
    current.json                    # Pointer to active version
    2026-01-09-1736437890/         # Versioned directory
      passportNoAndNationalitySMT.json
      nameAndDobSMT.json
      nameAndYobSMT.json
      nameAndDobSMT_ID.json
      nameAndYobSMT_ID.json
      nameAndDobSMT_AADHAAR.json
      nameAndYobSMT_AADHAAR.json
      roots.json
      latest-roots.json
```

### current.json Format

```json
{
  "timestamp": "2026-01-09T12:34:56.789Z",
  "path": "ofac/2026-01-09-1736437890",
  "roots": {
    "passport_no_and_nationality": "12345...",
    "name_and_dob": "67890...",
    "name_and_yob": "11111..."
  }
}
```

**Reader Flow**:
1. Fetch `gs://bucket/ofac/current.json`
2. Parse the `path` field
3. Fetch tree files from `gs://bucket/{path}/`

## TEE On-Chain Calls

### How TEE Makes Calls

The TEE uses a private key stored securely within the TEE environment:

1. Private key never leaves TEE (stored in secure enclave)
2. TEE address derived from private key: `address = publicKeyToAddress(privateKeyToPublicKey(privateKey))`
3. Transactions signed with TEE's private key before sending to blockchain
4. Contract verifies `hasRole(TEE_ROLE, msg.sender)` before allowing updates

### Transaction Flow

```
TEE Environment:
  1. Generate OFAC roots (off-chain)
  2. Create transaction: updatePassportNoOfacRoot(newRoot)
  3. Sign transaction with TEE's private key
  4. Send signed transaction to RPC node
  5. Transaction included in block
  6. Contract verifies: hasRole(TEE_ROLE, msg.sender)
  7. If authorized, root is updated ✅
```

### Security Model

- **Private Key**: Never leaves TEE environment
- **Attestation**: TEE provides cryptographic proof of identity (AWS Nitro Enclaves)
- **Role-Based Access**: Only addresses with `TEE_ROLE` can update OFAC roots
- **Audit Trail**: All transactions on-chain and verifiable

## Production Deployment

### Prerequisites

1. TEE environment (AWS Nitro Enclaves or equivalent)
2. TEE private key securely stored
3. `TEE_ROLE` granted on all registry contracts
4. GCS credentials with `roles/storage.objectAdmin`
5. RPC access to Celo mainnet

### Deployment Steps

1. **Grant TEE_ROLE** (one-time setup, see above)
2. **Build Docker image**: `docker build -f common/scripts/ofac/Dockerfile -t ofac-auto-updater .`
3. **Deploy to TEE** with:
   - TEE private key (from secure storage)
   - GCS credentials (service account key)
   - Network configuration

### Verification

```bash
# Verify TEE_ROLE is granted
TEE_ROLE=$(cast keccak "TEE_ROLE")
TEE_ADDRESS="0x..." # Your TEE address

for REGISTRY in \
  "0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968" \
  "0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1" \
  "0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4"; do

  cast call $REGISTRY \
    "hasRole(bytes32,address)" \
    $TEE_ROLE $TEE_ADDRESS \
    --rpc-url https://forno.celo.org
done
```

Expected: All return `0x0000...0001` (true)

## Troubleshooting

### Error: "AccessControlUnauthorizedAccount"

**Cause**: TEE address doesn't have `TEE_ROLE`

**Solution**: Grant `TEE_ROLE` using instructions above

### Error: "execution reverted"

**Cause**: Caller doesn't have `SECURITY_ROLE` to grant `TEE_ROLE` (fork testing)

**Solution**: Fork test automatically grants TEE_ROLE. If it fails, ensure fork includes Hub contract at `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`

### Error: "GCS upload failed"

**Cause**: Invalid credentials or permissions

**Solution**:
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path
- Check service account has `roles/storage.objectAdmin`
- Test with `gsutil` directly

### Error: "Transaction failed"

**Cause**: Insufficient gas, network issues, or contract revert

**Solution**:
- Check gas price and balance
- Verify network connectivity
- Check contract state (roots already match?)

## Performance

**Typical execution times** (on 4-core machine):
- Download: ~10-15 seconds
- Parse XML: ~5-10 seconds (~18,000 entries)
- Build trees: ~2-4 minutes (7 trees in parallel)
- Upload to GCS: ~15-30 seconds (60 MB total)
- On-chain updates: ~5-10 seconds per transaction (3-9 total)
- Pointer update: ~0.2-0.5 seconds

**Total**: ~3-5 minutes end-to-end

**Resource usage**:
- Memory: ~1-2 GB peak (during tree building)
- Disk: ~200 MB (XML + trees)
- Network: ~80 MB download/upload

## Security Considerations

1. **Private Key Storage**: Store TEE private key securely (AWS Secrets Manager, HashiCorp Vault)
2. **Role Management**: Use multisig for `SECURITY_ROLE` on production
3. **Monitoring**: Monitor all transactions from TEE address, set up alerts for failures
4. **Backup**: Have a backup TEE address with `TEE_ROLE` in case primary fails
