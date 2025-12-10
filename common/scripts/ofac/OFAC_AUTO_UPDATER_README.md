# OFAC Sanctions List Automation

Automated pipeline for updating OFAC sanctions list with ~6-7 second mismatch window.

## Prerequisites

### SSH Access

Add to `~/.ssh/config`:

```
Host self-infra-prod
    HostName <PRODUCTION_IP>
    User ec2-user
    IdentityFile ~/.ssh/infra.pem

Host self-infra-staging
    HostName 54.71.62.30
    User ec2-user
    IdentityFile ~/.ssh/infra.pem
```

### VPN

Connect to NordLayer VPN before running any commands.

---

## Production Deployment

### First Signer

```bash
cd /path/to/self

# Download OFAC list and build trees
yarn dlx tsx common/scripts/ofac/index.ts

# Propose and sign
cd contracts
PRIVATE_KEY=0x... \
NETWORK=celo \
yarn dlx tsx scripts/ofac/prepareMultisigUpdate.ts
```

### Final Signer (2nd of 2/5)

```bash
cd /path/to/self/contracts

PRIVATE_KEY=0x... \
NETWORK=celo \
SSH_HOST=self-infra-prod \
yarn dlx tsx scripts/ofac/signExecuteAndUpload.ts
```

This script:
1. Pre-stages trees to server `/tmp/`
2. Signs the pending transaction
3. Executes on-chain
4. Moves trees to production (~6-7s mismatch)

---

## E2E Testing (Sepolia)

Test Safe: `0x4264a631c5E685a622b5C8171b5f17BeD7FB30c6` (2/2 threshold)

### First Signer

```bash
cd /path/to/self

# Download and build trees (if not already done)
yarn dlx tsx common/scripts/ofac/index.ts

# Propose test transaction
cd contracts
PRIVATE_KEY=0x_SIGNER_1_KEY_ \
yarn dlx tsx scripts/ofac/test-e2e/testSafeProposal.ts
```

### Second Signer

```bash
cd /path/to/self/contracts

PRIVATE_KEY=0x_SIGNER_2_KEY_ \
NETWORK=sepolia \
SSH_HOST=self-infra-staging \
UPLOAD_PATH=/home/ec2-user/ofac-e2e-test \
yarn dlx tsx scripts/ofac/signExecuteAndUpload.ts
```

### Cleanup

```bash
ssh self-infra-staging "rm -rf /home/ec2-user/ofac-e2e-test /tmp/ofac-prestage-*"
```

---

## Configuration

| Environment | Safe Address | SSH Host |
|-------------|--------------|----------|
| Production (Celo) | `0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0` | `self-infra-prod` |
| Staging (Celo Sepolia) | `0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0` | `self-infra-staging` |
| E2E Test (Eth Sepolia) | `0x4264a631c5E685a622b5C8171b5f17BeD7FB30c6` | `self-infra-staging` |

Default RPC URLs: Celo (`forno.celo.org`), Eth Sepolia (`rpc.sepolia.org`).
Celo Sepolia requires `CELO_SEPOLIA_RPC_URL` env var.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `tsx: command not found` | Use `yarn dlx tsx` |
| SSH timeout | Connect to NordLayer VPN |
| Orphaned pre-staged files | `ssh <host> "rm -rf /tmp/ofac-prestage-*"` |
