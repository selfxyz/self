#!/bin/bash

# Define some colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}green${NC}: audited file"
echo -e "${BLUE}blue${NC}: part of the file is audited"
echo -e "${PURPLE}purple${NC}: tweaked implementation of an audited file"

# Initialize arrays
file_paths=()
file_colors=()
file_descriptions=()

# Read the file descriptions from this script itself
started=0
while IFS='' read -r line || [ -n "$line" ]; do
    if [[ $line == "# files" ]]; then
        started=1
        continue
    fi
    if [ $started -eq 1 ] && [[ $line =~ ^circuits/[^:]+:[^:]+:.+$ ]]; then
        path=$(echo "$line" | cut -d':' -f1)
        path=${path#circuits/}  # Remove 'circuits/' prefix
        color=$(echo "$line" | cut -d':' -f2)
        description=$(echo "$line" | cut -d':' -f3- | sed 's/^"//;s/"$//')
        file_paths+=("$path")
        file_colors+=("$color")
        file_descriptions+=("$description")
    fi
done < "$0"

# Change to circuits subdirectory and use tree command
cd "$(dirname "$0")/../circuits" || exit
tree_output=$(tree -I 'tests|node_modules|.git|build|instances|sha256' --prune -F -f)

# Iterate over the tree output
while IFS= read -r line; do
    filepath=$(echo "$line" | sed 's/^[^a-zA-Z0-9\/\.]*//; s/[\/]$//')
    filepath=$(echo "$filepath" | sed 's/^[ \t]*//')
    filepath=${filepath#./}

    matched=0
    for i in "${!file_paths[@]}"; do
        if [[ "$filepath" == "${file_paths[$i]}" ]] || [[ "$filepath" == "${file_paths[$i]}"/* ]]; then
            color="${file_colors[$i]}"
            description="${file_descriptions[$i]}"

            case $color in
                "red")    echo -e "$line ${RED} $description${NC}" ;;
                "green")  echo -e "$line ${GREEN} $description${NC}" ;;
                "blue")   echo -e "$line ${BLUE} $description${NC}" ;;
                "yellow") echo -e "$line ${YELLOW} $description${NC}" ;;
                "purple") echo -e "$line ${PURPLE} $description${NC}" ;;
                *)        echo -e "$line  $description" ;;
            esac
            matched=1
            break
        fi
    done

    if [ $matched -eq 0 ]; then
        echo "$line"
    fi
done <<< "$tree_output"

exit 0

# files
## Format: path:color:description
circuits/utils/circomlib/utils/array.circom:green:"@zkemail"
circuits/utils/circomlib/utils/bytes.circom:green:"@zkemail"
circuits/utils/circomlib/utils/constants.circom:green:"@zkemail"
circuits/utils/circomlib/utils/functions.circom:green:"@zkemail"
circuits/utils/circomlib/utils/functions.circom:green:"@zkemail"
circuits/utils/circomlib/bitify/bitify.circom:green:"circomlib"
circuits/utils/circomlib/bitify/comparators.circom:green:"circomlib"
circuits/utils/circomlib/bitify/gates.circom:blue:"circomlib"
circuits/utils/circomlib/bigInt/bigIntFunc.circom:blue:"@zkemail"
circuits/utils/circomlib/mux/mux1.circom:green:"circomlib"
circuits/utils/circomlib/hasher/poseidon/poseidon.circom:green:"circomlib"
circuits/utils/circomlib/hasher/poseidon/poseidonConstants.circom:green:"circomlib"
circuits/utils/circomlib/merkle-trees/binary-merkle-root.circom:green:"@zk-kit"
circuits/utils/circomlib/hasher/sha2/sha256_temp:green:"circomlib"
circuits/utils/circomlib/hasher/sha2:purple:"circomlib"
circuits/utils/circomlib/hasher/sha1/t.circom:purple:"circomlib"
circuits/utils/circomlib/hasher/sha1/xor4.circom:purple:"circomlib"
circuits/utils/circomlib/signature/rsa/verifyRsaPkcs1v1_5.circom:purple:"@zkemail"