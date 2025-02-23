#!/bin/bash

if [ -f .env ]; then
    source .env
fi

NETWORK=${NETWORK:-localhost}

case "$1" in
  "all")
    echo "Deploying all contracts to $NETWORK..."
    npx hardhat ignition deploy ignition/modules/deployVerifiers.ts --network $NETWORK --verify
    npx hardhat ignition deploy ignition/modules/deployRegistry.ts --network $NETWORK --verify
    npx hardhat ignition deploy ignition/modules/deployHub.ts --network $NETWORK --verify
    npx hardhat ignition deploy ignition/modules/deployVerifyAll.ts --network $NETWORK --verify
    ;;
    
  "hub")
    echo "Deploying hub to $NETWORK..."
    npx hardhat ignition deploy ignition/modules/deployHub.ts --network $NETWORK --verify
    ;;
    
  "registry")
    echo "Deploying registry to $NETWORK..."
    npx hardhat ignition deploy ignition/modules/deployRegistry.ts --network $NETWORK --verify
    ;;
    
  "verifiers")
    echo "Deploying verifiers to $NETWORK..."
    npx hardhat ignition deploy ignition/modules/deployVerifiers.ts --network $NETWORK --verify
    ;;
  *)
    echo "Usage: $0 {all|hub|registry|verifiers}"
    exit 1
    ;;
esac