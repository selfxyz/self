# OFAC Sanctions List Automation

Automated pipeline for updating OFAC sanctions list with ~200-500ms mismatch window using Google Cloud Storage.

## Prerequisites

### Google Cloud Storage Access

1. Create a GCS bucket for OFAC data (e.g., `self-ofac-prod`, `self-ofac-staging`)
2. Enable versioning on the bucket for rollback capability
3. Create a service account with `roles/storage.objectAdmin` permission
4. Download the service account key JSON file
5. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the key file path

---

## Single-Shot Auto Update (Docker/TEE)

This is the unified flow that runs the pipeline, updates on-chain roots directly,
and uploads files to Google Cloud Storage with atomic pointer updates.

### Docker

Build the image:

```bash
docker build -f common/scripts/ofac/Dockerfile -t ofac-auto-updater .
```

Run with GCS credentials:

```bash
docker run --rm \\
  -e PRIVATE_KEY=0x... \\
  -e NETWORK=celo \\
  -e GCS_BUCKET_NAME=self-ofac-prod \\
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcs-key.json \\
  -v /local/ofac:/data \\
  -v /local/gcs-key.json:/secrets/gcs-key.json:ro \\
  ofac-auto-updater
```

Environment variables:
- `PRIVATE_KEY` (required): signer key used for on-chain updates
- Signer must have `TEE_ROLE` on the registry contracts
- `NETWORK`: `celo` or `celo-sepolia`
- `RPC_URL` or network-specific RPC envs (`CELO_RPC_URL`, `CELO_SEPOLIA_RPC_URL`)
- `OFAC_DATA_DIR` (default: `/data/ofac`)
- `GCS_BUCKET_NAME` (default: `self-ofac-prod` for celo, `self-ofac-staging` for celo-sepolia)
- `GCS_BASE_PATH` (default: `ofac`)
- `GOOGLE_APPLICATION_CREDENTIALS` (required): path to GCS service account key JSON
- `DRY_RUN=true` to skip on-chain update and upload
- `SKIP_UPLOAD=true` to skip GCS upload (not recommended)

If deploying this change to existing registries, call `initializeTeeRole(TEE_ADDRESS)` after upgrade to set role admin and grant `TEE_ROLE`.

### Local (no Docker)

```bash
PRIVATE_KEY=0x... \\
NETWORK=celo \\
GCS_BUCKET_NAME=self-ofac-prod \\
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcs-key.json \\
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts
```

---
## How GCS Is Used

The updater uses Google Cloud Storage for atomic file deployment:

1. **Upload Phase**: Upload all tree files to a versioned path (e.g., `ofac/2026-01-09-1736437890/`)
2. **On-Chain Update**: Submit transactions to update OFAC roots on smart contracts
3. **Atomic Switch**: Update `current.json` pointer file to reference the new version path

### Mismatch Window

- **Old (SSH)**: 6-7 seconds during file move operation
- **New (GCS)**: 200-500ms during `current.json` upload
- **Consistency**: Readers always see a complete snapshot (all files from the same version)

### File Structure

```
gs://self-ofac-prod/
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

Readers should:
1. Fetch `gs://bucket/ofac/current.json`
2. Parse the `path` field
3. Fetch tree files from `gs://bucket/{path}/`
