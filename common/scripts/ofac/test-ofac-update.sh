#!/bin/bash
# OFAC Auto Updater Test Script
# Tests the complete OFAC update pipeline in dry-run mode

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           OFAC AUTO UPDATER - TEST SUITE                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="./test-ofac-$(date +%s)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo -e "${BLUE}📍 Repository root: $REPO_ROOT${NC}"
echo -e "${BLUE}📂 Test directory: $TEST_DIR${NC}"
echo ""

# Create test directory
mkdir -p "$TEST_DIR"
cd "$REPO_ROOT"

# ═══════════════════════════════════════════════════════════════
# TEST 1: Pipeline Test (Download + Parse + Build)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST 1: OFAC Pipeline (Download → Parse → Build)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}→ Running pipeline...${NC}"
yarn tsx common/scripts/ofac/index.ts --output-dir "$TEST_DIR"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Pipeline completed successfully${NC}"
else
  echo -e "${RED}✗ Pipeline failed${NC}"
  exit 1
fi

# Verify outputs
echo ""
echo -e "${YELLOW}→ Verifying outputs...${NC}"

EXPECTED_FILES=(
  "raw/sdn-latest.xml"
  "inputs/names.json"
  "inputs/passports.json"
  "outputs/passportNoAndNationalitySMT.json"
  "outputs/nameAndDobSMT.json"
  "outputs/nameAndYobSMT.json"
  "outputs/nameAndDobSMT_ID.json"
  "outputs/nameAndYobSMT_ID.json"
  "outputs/nameAndDobSMT_AADHAAR.json"
  "outputs/nameAndYobSMT_AADHAAR.json"
  "outputs/roots.json"
  "outputs/latest-roots.json"
)

MISSING_FILES=0
for file in "${EXPECTED_FILES[@]}"; do
  if [ -f "$TEST_DIR/$file" ]; then
    SIZE=$(du -h "$TEST_DIR/$file" | cut -f1)
    echo -e "${GREEN}  ✓ $file ($SIZE)${NC}"
  else
    echo -e "${RED}  ✗ Missing: $file${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

if [ $MISSING_FILES -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All expected files created${NC}"
else
  echo ""
  echo -e "${RED}✗ $MISSING_FILES files missing${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# TEST 2: Roots Validation
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST 2: Roots Validation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}→ Checking roots.json structure...${NC}"

# Check if roots.json is valid JSON and has expected keys
ROOTS_FILE="$TEST_DIR/outputs/roots.json"
if ! jq empty "$ROOTS_FILE" 2>/dev/null; then
  echo -e "${RED}✗ roots.json is not valid JSON${NC}"
  exit 1
fi

EXPECTED_ROOTS=(
  "passport_no_and_nationality"
  "name_and_dob"
  "name_and_yob"
  "name_and_dob_id_card"
  "name_and_yob_id_card"
  "aadhaar_name_and_dob"
  "aadhaar_name_and_yob"
)

MISSING_ROOTS=0
for root in "${EXPECTED_ROOTS[@]}"; do
  if jq -e ".$root" "$ROOTS_FILE" > /dev/null 2>&1; then
    ROOT_VALUE=$(jq -r ".$root" "$ROOTS_FILE")
    echo -e "${GREEN}  ✓ $root: ${ROOT_VALUE:0:20}...${NC}"
  else
    echo -e "${RED}  ✗ Missing root: $root${NC}"
    MISSING_ROOTS=$((MISSING_ROOTS + 1))
  fi
done

if [ $MISSING_ROOTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All roots present and valid${NC}"
else
  echo ""
  echo -e "${RED}✗ $MISSING_ROOTS roots missing${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# TEST 3: Tree Statistics
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST 3: Tree Statistics"
echo "═══════════════════════════════════════════════════════════════"
echo ""

NAMES_COUNT=$(jq '. | length' "$TEST_DIR/inputs/names.json")
PASSPORTS_COUNT=$(jq '. | length' "$TEST_DIR/inputs/passports.json")

echo -e "${BLUE}  Names entries:     $NAMES_COUNT${NC}"
echo -e "${BLUE}  Passport entries:  $PASSPORTS_COUNT${NC}"

# Check if numbers are reasonable (should be thousands)
if [ "$NAMES_COUNT" -lt 1000 ]; then
  echo -e "${RED}✗ Too few names entries (expected > 1000)${NC}"
  exit 1
fi

if [ "$PASSPORTS_COUNT" -lt 100 ]; then
  echo -e "${RED}✗ Too few passport entries (expected > 100)${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Entry counts look reasonable${NC}"

# ═══════════════════════════════════════════════════════════════
# TEST 4: Dry-Run Full Update (if credentials available)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST 4: Dry-Run Full Update"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${YELLOW}⚠ PRIVATE_KEY not set - skipping dry-run test${NC}"
  echo -e "${YELLOW}  To run: export PRIVATE_KEY=0x...${NC}"
else
  echo -e "${YELLOW}→ Running dry-run update...${NC}"

  export NETWORK="${NETWORK:-celo-sepolia}"
  export DRY_RUN=true
  export OFAC_DATA_DIR="$TEST_DIR"
  export GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-self-ofac-test}"

  # Run with existing data (skip download)
  yarn tsx common/scripts/ofac/runOfacAutoUpdate.ts

  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Dry-run completed successfully${NC}"
  else
    echo -e "${RED}✗ Dry-run failed${NC}"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     TEST SUMMARY                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Test artifacts saved to: $TEST_DIR"
echo ""
echo "Next steps:"
echo "  1. Review generated files in $TEST_DIR"
echo "  2. Test with real GCS credentials (set GOOGLE_APPLICATION_CREDENTIALS)"
echo "  3. Test on staging network (celo-sepolia)"
echo "  4. Deploy to production when ready"
echo ""

# Optional: Clean up test directory
read -p "Delete test directory? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "$TEST_DIR"
  echo -e "${GREEN}✓ Test directory deleted${NC}"
else
  echo -e "${BLUE}ℹ Test directory preserved: $TEST_DIR${NC}"
fi
