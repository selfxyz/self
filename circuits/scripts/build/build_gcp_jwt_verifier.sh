#!/bin/bash
set -euo pipefail

# Get script directory for stable sourcing
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Set environment (change this value as needed)
# ENV="prod"
ENV="staging"

echo -e "${GREEN}Building GCP JWT verifier circuit for $ENV environment${NC}"

# Circuit-specific configurations
CIRCUIT_TYPE="gcp_jwt_verifier"
CIRCUIT_NAME="gcp_jwt_verifier"
OUTPUT_DIR="build/gcp"
POWEROFTAU=24
MAX_MEMORY=204800

# Download power of tau if needed
download_ptau $POWEROFTAU

# Build the circuit
build_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$POWEROFTAU" "$OUTPUT_DIR" "$MAX_MEMORY"

echo ""
echo -e "${BLUE}To generate circuit inputs, run:${NC}"
echo -e "${YELLOW}  yarn tsx circuits/gcp_jwt_verifier/prepare.ts example_jwt.txt circuit_inputs.json${NC}"
