#!/bin/bash

source "scripts/build/common.sh"

# Set environment (change this value as needed)
# ENV="prod"
ENV="staging"

echo -e "${GREEN}Building register_id circuits for $ENV environment${NC}"

# Circuit-specific configurations
CIRCUIT_TYPE="register_id"
OUTPUT_DIR="build/${CIRCUIT_TYPE}"

# Define circuits and their configurations
# format: name:poweroftau:build_flag
CIRCUITS=(
    "register_id_sha256_sha256_sha256_rsa_65537_4096:20:true"
)

build_circuits "$CIRCUIT_TYPE" "$OUTPUT_DIR" "${CIRCUITS[@]}"

echo -e "${GREEN}Register_id circuits build completed for $ENV environment!${NC}"
echo -e "${YELLOW}Generated files are located in: contracts/verifiers/local/${ENV}/${CIRCUIT_TYPE}/${NC}"
