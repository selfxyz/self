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

## Single-Shot Auto Update (Docker/TEE)

This is the unified flow that runs the pipeline, updates on-chain roots directly,
and performs the prestaged upload + atomic move in one run.

### Docker

Build the image:

```bash
docker build -f common/scripts/ofac/Dockerfile -t ofac-auto-updater .
```

Run with a single mount (all inputs/outputs live under `/data/ofac`):

```bash
docker run --rm \\
  -e PRIVATE_KEY=0x... \\
  -e NETWORK=celo \\
  -e SSH_HOST=self-infra-prod \\
  -e UPLOAD_PATH=/home/ec2-user/self-infra/merkle-tree-reader/common/constants/ofac \\
  -v /local/ofac:/data \\
  -v ~/.ssh:/root/.ssh:ro \\
  ofac-auto-updater
```

Environment variables:
- `PRIVATE_KEY` (required): signer key used for on-chain updates
- Signer must have `TEE_ROLE` on the registry contracts
- `NETWORK`: `celo`, `celo-sepolia`, or `sepolia`
- `RPC_URL` or network-specific RPC envs (`CELO_RPC_URL`, `CELO_SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL`)
- `OFAC_DATA_DIR` (default: `/data/ofac`)
- `SSH_HOST` (default: `self-infra-staging`)
- `UPLOAD_PATH` (default: production path for the chosen network)
- `DRY_RUN=true` to skip on-chain update and upload
- `SKIP_PRESTAGE=true` to skip pre-staging (not recommended)

If deploying this change to existing registries, call `initializeTeeRole(TEE_ADDRESS)` after upgrade to set role admin and grant `TEE_ROLE`.

### Local (no Docker)

```bash
PRIVATE_KEY=0x... \\
NETWORK=celo \\
SSH_HOST=self-infra-prod \\
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts
```

---
## How SSH Is Used

The updater uses SSH only for the file staging + atomic move:
1. Pre-stage generated tree files to a temp directory on the server.
2. After on-chain updates complete, atomically move the files into production.
3. Optionally verify the production directory contents.

If SSH isn’t available (e.g., missing VPN/host config), the on-chain updates can still run,
but the tree deployment step will fail unless `DRY_RUN=true`.
