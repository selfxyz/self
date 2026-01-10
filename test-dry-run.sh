#!/bin/bash
# Complete Dry-Run Test for OFAC Auto Updater
# This simulates the full flow without making real updates

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         OFAC AUTO UPDATER - DRY RUN TEST                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Set environment variables for dry-run
export PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
export NETWORK=celo-sepolia
export DRY_RUN=true
export OFAC_DATA_DIR=/Users/evinova/Documents/self/test-ofac-data
export GCS_BUCKET_NAME=self-ofac-test
export GCS_BASE_PATH=ofac
export SKIP_UPLOAD=false  # Test GCS upload logic (but won't actually upload in dry-run)

echo "🔧 Configuration:"
echo "  Network: $NETWORK"
echo "  Data Dir: $OFAC_DATA_DIR"
echo "  GCS Bucket: $GCS_BUCKET_NAME"
echo "  Dry Run: $DRY_RUN"
echo ""
echo "This will simulate:"
echo "  ✓ Pipeline execution (using existing data)"
echo "  ✓ On-chain root updates (simulated)"
echo "  ✓ GCS upload (simulated)"
echo "  ✓ Pointer file update (simulated)"
echo ""

read -p "Press Enter to start dry-run test..."
echo ""

cd /Users/evinova/Documents/self

# Run the complete auto-updater
yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              DRY RUN TEST COMPLETED                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

