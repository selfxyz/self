#!/bin/bash
# OFAC Auto Updater - Local Fork Test
# Tests with Anvil/Hardhat fork of Celo mainnet registry contracts
# Uses REAL GCS staging bucket for uploads

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   OFAC AUTO UPDATER - CELO FORK + REAL GCS UPLOAD          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
FORK_NETWORK="${FORK_NETWORK:-celo}"  # Must be 'celo' to use real registry addresses
FORK_RPC="${FORK_RPC:-http://localhost:8545}"  # Local fork RPC
DATA_DIR="${DATA_DIR:-./test-ofac-data}"
GCS_BUCKET="${GCS_BUCKET:-self-ofac-test}"
GCS_BASE_PATH="${GCS_BASE_PATH:-ofac}"

# Use credentials from ofac folder if not set, or allow override via env var
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CREDS="${SCRIPT_DIR}/gcs-credentials.json"

# Use default if env var is not set, or if it's set to a placeholder value
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ] || [ "$GOOGLE_APPLICATION_CREDENTIALS" = "/path/to/key.json" ]; then
  GOOGLE_CREDS="$DEFAULT_CREDS"
else
  GOOGLE_CREDS="$GOOGLE_APPLICATION_CREDENTIALS"
fi

echo "🔧 Configuration:"
echo "  Forking: $FORK_NETWORK (using real Celo registry addresses)"
echo "  Fork RPC: $FORK_RPC"
echo "  Data Dir: $DATA_DIR"
echo "  GCS Bucket: $GCS_BUCKET"
echo "  GCS Path: $GCS_BASE_PATH"
echo "  GCS Credentials: $GOOGLE_CREDS"
echo ""

# Validate network
if [ "$FORK_NETWORK" != "celo" ]; then
  echo "⚠️  WARNING: Fork network is '$FORK_NETWORK', but registry addresses are configured for 'celo'"
  echo "   The script will use Celo registry addresses regardless"
fi

# Check prerequisites
if [ ! -f "$GOOGLE_CREDS" ]; then
  echo "❌ ERROR: GCS credentials file not found: $GOOGLE_CREDS"
  echo ""
  echo "   Expected location: $DEFAULT_CREDS"
  echo "   Or set GOOGLE_APPLICATION_CREDENTIALS environment variable"
  exit 1
fi

# Check if fork is running
echo "🔍 Checking if local fork is running..."
if ! curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$FORK_RPC" > /dev/null 2>&1; then
  echo "❌ ERROR: Local fork not running at $FORK_RPC"
  echo ""
  echo "Start a fork first:"
  echo "  1. Using Anvil (Foundry) - RECOMMENDED:"
  echo "     anvil --fork-url https://forno.celo.org --port 8545"
  echo "     (This forks at the latest block automatically)"
  echo ""
  echo "  2. Using Hardhat:"
  echo "     npx hardhat node --fork https://forno.celo.org"
  echo ""
  echo "⚠️  IMPORTANT: The fork must include the real Celo registry contracts:"
  echo "   - IdentityRegistry: 0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968"
  echo "   - IdentityRegistryIdCard: 0xeAD1E6Ec29c1f3D33a0662f253a3a94D189566E1"
  echo "   - IdentityRegistryAadhaar: 0xd603Fa8C8f4694E8DD1DcE1f27C0C3fc91e32Ac4"
  echo ""
  exit 1
fi

echo "💡 TIP: If roots already match on-chain, restart your fork to reset state:"
echo "   1. Stop current fork (Ctrl+C)"
echo "   2. Restart: anvil --fork-url https://forno.celo.org --port 8545"
echo ""

echo "✅ Fork is running at $FORK_RPC"
echo ""

TEST_PRIVATE_KEY="${TEST_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
TEE_ADDRESS=$(cast wallet address --private-key "$TEST_PRIVATE_KEY" 2>/dev/null || echo "unknown")

echo "📋 Test Details:"
echo "  TEE Address: $TEE_ADDRESS"
echo ""
echo "This will perform:"
echo "  ✓ Pipeline: Download + Parse + Build trees"
echo "  ✓ Contract calls on Anvil LOCAL FORK (real Celo registry contracts)"
echo "  ✓ Impersonate OPERATIONS_ROLE holder to call update functions"
echo "  ✓ REAL GCS uploads (to staging bucket: $GCS_BUCKET)"
echo "  ✓ Measure mismatch window"
echo ""
echo "⚠️  NOTE: This uses REAL GCS uploads. Files will be uploaded to:"
echo "   gs://$GCS_BUCKET/$GCS_BASE_PATH/"
echo ""

read -p "Press Enter to start fork test, or Ctrl+C to cancel..."
echo ""

# Run the test
# Get repo root (3 levels up from script dir: scripts/ofac -> scripts -> common -> repo root)
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

PRIVATE_KEY="$TEST_PRIVATE_KEY" \
NETWORK="celo" \
RPC_URL="$FORK_RPC" \
OFAC_DATA_DIR="$DATA_DIR" \
GCS_BUCKET_NAME="$GCS_BUCKET" \
GCS_BASE_PATH="$GCS_BASE_PATH" \
GOOGLE_APPLICATION_CREDENTIALS="$GOOGLE_CREDS" \
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              FORK TEST COMPLETED                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Results:"
echo ""
echo "  📦 Check GCS Bucket:"
echo "     Web UI: https://console.cloud.google.com/storage/browser/$GCS_BUCKET/$GCS_BASE_PATH?project=ofac-upload-test"
echo ""
if command -v gsutil &> /dev/null; then
  echo "     Command line:"
  echo "       gsutil ls gs://$GCS_BUCKET/$GCS_BASE_PATH/"
  echo "       gsutil cat gs://$GCS_BUCKET/$GCS_BASE_PATH/current.json"
else
  echo "     💡 Install gsutil for command-line access:"
  echo "        brew install google-cloud-sdk"
  echo "        Or: https://cloud.google.com/sdk/docs/install"
fi
echo ""
echo "  🔗 Fork transactions logged in your terminal above"
echo ""
