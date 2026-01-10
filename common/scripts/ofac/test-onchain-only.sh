#!/bin/bash
# Quick test script for on-chain updates only (skips tree building)
# Uses existing tree files and tests TEE on-chain calls + GCS uploads

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        OFAC ON-CHAIN UPDATE TEST (SKIP TREE BUILDING)      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
FORK_RPC="${FORK_RPC:-http://localhost:8545}"
DATA_DIR="${DATA_DIR:-./test-ofac-data}"
ROOTS_PATH="${ROOTS_PATH:-${DATA_DIR}/outputs/roots.json}"

echo "🔧 Configuration:"
echo "  Fork RPC: $FORK_RPC"
echo "  Roots file: $ROOTS_PATH"
echo ""

# Check prerequisites
if [ ! -f "$ROOTS_PATH" ]; then
  echo "❌ ERROR: Roots file not found: $ROOTS_PATH"
  echo ""
  echo "   Run the full pipeline first to generate trees:"
  echo "   ./common/scripts/ofac/test-with-fork.sh"
  echo ""
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
  echo "  anvil --fork-url https://forno.celo.org --port 8545"
  echo ""
  exit 1
fi

echo "✅ Fork is running at $FORK_RPC"
echo ""

# Use test private key
TEST_PRIVATE_KEY="${TEST_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
TEE_ADDRESS=$(cast wallet address --private-key "$TEST_PRIVATE_KEY" 2>/dev/null || echo "unknown")

echo "📋 Test Details:"
echo "  TEE Address: $TEE_ADDRESS"
echo ""
echo "This will:"
echo "  ✓ Skip pipeline (use existing trees)"
echo "  ✓ Impersonate OPERATIONS_ROLE holder to call update functions"
echo "  ✓ Batch all transactions in one block"
echo "  ✓ Verify on-chain roots match expected values"
echo "  ✓ Upload tree files to Google Cloud Storage bucket"
echo ""

read -p "Press Enter to start test, or Ctrl+C to cancel..."
echo ""

# Run the test
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

# Use credentials from ofac folder if not set, or allow override via env var
DEFAULT_CREDS="${SCRIPT_DIR}/gcs-credentials.json"

# Use default if env var is not set, or if it's set to a placeholder value
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ] || [ "$GOOGLE_APPLICATION_CREDENTIALS" = "/path/to/key.json" ]; then
  GOOGLE_CREDS="$DEFAULT_CREDS"
else
  GOOGLE_CREDS="$GOOGLE_APPLICATION_CREDENTIALS"
fi

# Check if credentials file exists
if [ ! -f "$GOOGLE_CREDS" ]; then
  echo "❌ ERROR: GCS credentials file not found: $GOOGLE_CREDS"
  echo ""
  echo "   Expected location: $DEFAULT_CREDS"
  echo "   Or set GOOGLE_APPLICATION_CREDENTIALS environment variable"
  exit 1
fi

PRIVATE_KEY="$TEST_PRIVATE_KEY" \
NETWORK="celo" \
RPC_URL="$FORK_RPC" \
ROOTS_PATH="$ROOTS_PATH" \
TREES_DIR="${DATA_DIR}/outputs" \
GOOGLE_APPLICATION_CREDENTIALS="$GOOGLE_CREDS" \
SKIP_PIPELINE=true \
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ON-CHAIN TEST COMPLETED                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
