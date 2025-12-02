#!/bin/bash

source "scripts/build/common.sh"

# Set environment (change this value as needed)
# ENV="prod"
ENV="staging"

echo -e "${GREEN}Building disclose circuits for $ENV environment${NC}"

# Circuit-specific configurations
CIRCUIT_TYPE="disclose"
OUTPUT_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "vc_and_disclose:18:true"
    "vc_and_disclose_id:18:true"
    "vc_and_disclose_aadhaar:18:true"
)

build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "${CIRCUITS[@]}"

echo -e "${GREEN}Disclose circuits build completed for $ENV environment!${NC}"
echo -e "${YELLOW}Generated files are located in: contracts/verifiers/local/${ENV}/${CIRCUIT_TYPE}/${NC}"
