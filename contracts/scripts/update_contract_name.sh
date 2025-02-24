#!/bin/bash

VERIFIERS_DIR="contracts/verifiers"

find "$VERIFIERS_DIR" -type f -name "*.sol" | while read -r file; do
    filename=$(basename "$file" .sol)
    
    if grep -q "contract Groth16Verifier" "$file"; then
        echo "Updating contract name in: $file"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/contract Groth16Verifier/contract ${filename}/g" "$file"
        else
            sed -i "s/contract Groth16Verifier/contract ${filename}/g" "$file"
        fi
    fi
done

echo "Contract name update completed"