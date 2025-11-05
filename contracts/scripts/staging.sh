#!/bin/bash

# Create directories if they don't exist
mkdir -p ignition/deployments/staging/artifacts

# Copy deployed_addresses.json
cp ignition/deployments/chain-11142220/deployed_addresses.json ignition/deployments/staging/deployed_addresses.json

# Copy all artifacts from chain-11142220 to staging
cp -r ignition/deployments/chain-11142220/artifacts/* ignition/deployments/staging/artifacts/

echo "Successfully exported chain-11142220 deployment files to staging directory"
