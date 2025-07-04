#!/bin/bash

# Create directories if they don't exist
mkdir -p ignition/deployments/prod/artifacts

# Copy deployed_addresses.json
cp ignition/deployments/chain-42220/deployed_addresses.json ignition/deployments/prod/deployed_addresses.json

# Copy all artifacts from chain-42220 to prod
cp -r ignition/deployments/chain-42220/artifacts/* ignition/deployments/prod/artifacts/

echo "Successfully exported chain-42220 deployment files to prod directory"