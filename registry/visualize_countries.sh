#!/bin/bash

# Directory containing the certificates
CERT_DIR="./outputs/new_masterlists"  # Change if needed

# Temporary file for sorting and counting
TEMP_FILE=$(mktemp)

# Extract country codes and count occurrences
for cert in "$CERT_DIR"/*.pem; do
    if [ -f "$cert" ]; then
        country=$(openssl x509 -in "$cert" -noout -issuer 2>/dev/null | grep -oE 'C=[A-Z]{2}' | cut -d= -f2)
        if [[ ! -z "$country" ]]; then
            echo "$country" >> "$TEMP_FILE"
        fi
    fi
done

# Display results sorted by count
echo "Country | Count"
echo "--------|------"
sort "$TEMP_FILE" | uniq -c | sort -rn | awk '{print $2, "|", $1}'

# Clean up
rm -f "$TEMP_FILE"
