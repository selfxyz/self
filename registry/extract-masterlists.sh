#!/bin/bash
set -e

# Configuration
INPUT_DIR="${1:-./inputs}"
OUTPUT_DIR="${2:-./outputs/new_masterlists}"
PYTHON=${PYTHON:-python}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get script directory for absolute paths
SCRIPT_DIR="$(pwd)"

# Create the Python decoder script
cat > "$SCRIPT_DIR/ml_decoder.py" << 'EOF'
import sys
import os

# Assuming asn1tinydecoder.py is in the same directory as this script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from asn1tinydecoder import asn1_node_root, asn1_get_all, asn1_node_next, asn1_node_first_child, asn1_node_is_child_of

def decode_masterlist(der_data, output_dir, basename):
    """Decode the masterlist and save certificates directly to output_dir"""
    root = asn1_node_root(der_data)
    hdr = asn1_node_first_child(der_data, root)
    cert_list = asn1_node_next(der_data, hdr)
    item = asn1_node_first_child(der_data, cert_list)
    
    count = 0
    while asn1_node_is_child_of(cert_list, item):
        cert_data = asn1_get_all(der_data, item)
        
        # Write the DER file directly to the output directory
        der_filename = os.path.join(output_dir, f"{basename}_cert-{count:05d}.der")
        with open(der_filename, 'wb') as f:
            f.write(cert_data)
        
        count += 1
        item = asn1_node_next(der, item)
    
    return count

if __name__ == "__main__":
    # Get output directory and basename from command line
    if len(sys.argv) < 3:
        print("Usage: python ml_decoder.py <output_dir> <basename>")
        sys.exit(1)
    
    output_dir = sys.argv[1]
    basename = sys.argv[2]
    
    # Read DER data from stdin
    der = sys.stdin.buffer.read()
    count = decode_masterlist(der, output_dir, basename)
    print(f"Decoded {count} certificates.")
EOF

# Process ML files
process_ml_file() {
    local ml_file="$1"
    local basename=$(basename "$ml_file")
    basename="${basename%.*}"
    
    echo "Processing $ml_file..."
    
    # Extract and verify the CMS data
    local temp_file="$OUTPUT_DIR/${basename}_temp.der"
    
    if [[ "$ml_file" == *"ICAO"* ]]; then
        # Handle ICAO differently (no CMS verification)
        cat "$ml_file" > "$temp_file"
    else
        # Regular CMS verification
        openssl cms -inform DER -verify -noverify -in "$ml_file" > "$temp_file" 2>/dev/null || {
            echo "Failed to extract CMS data from $ml_file"
            return 1
        }
    fi
    
    # Run the decoder directly writing to output directory
    cat "$temp_file" | PYTHONPATH="$SCRIPT_DIR" $PYTHON "$SCRIPT_DIR/ml_decoder.py" "$OUTPUT_DIR" "$basename"
    
    # Clean up temporary file
    rm -f "$temp_file"
    
    # Convert all DER files to PEM
    for der_file in "$OUTPUT_DIR/${basename}_cert-"*.der; do
        # Skip if no files match
        [ -e "$der_file" ] || continue
        
        pem_file="${der_file%.der}.pem"
        
        # Try to convert as X.509 certificate
        if openssl x509 -inform DER -in "$der_file" -outform PEM -out "$pem_file" 2>/dev/null; then
            echo "Converted certificate: $(basename "$pem_file")"
            rm -f "$der_file"
        # Try as a CRL in case it's not a certificate
        elif openssl crl -inform DER -in "$der_file" -outform PEM -out "${pem_file%.pem}_crl.pem" 2>/dev/null; then
            echo "Converted CRL: $(basename "${pem_file%.pem}_crl.pem")"
            rm -f "$der_file"
            # Remove original PEM since we created a CRL version
            rm -f "$pem_file" 2>/dev/null
        else
            echo "Saved raw DER file: $(basename "$der_file")"
            rm -f "$der_file"
        fi
    done
    
    echo "Completed processing $ml_file"
}

# Find and process all .ml files
if [ -d "$INPUT_DIR" ]; then
    # Use parentheses to avoid problems with -o in find
    find "$INPUT_DIR" -maxdepth 1 \( -name "*.ml" -o -name "*.mls" \) | while read -r ml_file; do
        process_ml_file "$ml_file"
    done
else
    echo "Input directory '$INPUT_DIR' not found!"
    exit 1
fi

# Clean up the decoder script
rm -f "$SCRIPT_DIR/ml_decoder.py"

echo "All masterlist files processed. PEM certificates are in $OUTPUT_DIR"