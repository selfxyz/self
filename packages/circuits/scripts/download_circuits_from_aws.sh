#!/bin/sh

# Define environment variables
BUCKET_NAME="proofofpassport-us"
CIRCUIT_NAME="contracts_zkey_wasm.zip"
DESTINATION_DIR="build/fromAWS"

# Create the destination directory if it doesn't exist
echo "Creating destination directory..."
mkdir -p ${DESTINATION_DIR}

# Download the file
echo "Downloading ${CIRCUIT_NAME} from S3..."
aws s3 cp s3://${BUCKET_NAME}/${CIRCUIT_NAME} ${DESTINATION_DIR}/${CIRCUIT_NAME} --no-sign-request

if [ $? -eq 0 ]; then
    echo "Successfully downloaded ${CIRCUIT_NAME}"
    
    echo "Unzipping files..."
    # Use -j flag to junk (ignore) directory paths when extracting
    unzip -q -j -o ${DESTINATION_DIR}/${CIRCUIT_NAME} -d ${DESTINATION_DIR}
    
    if [ $? -eq 0 ]; then
        echo "Successfully unzipped files"
        
        echo "Cleaning up zip file..."
        rm ${DESTINATION_DIR}/${CIRCUIT_NAME}
        
        echo "Process completed successfully"
    else
        echo "Failed to unzip ${CIRCUIT_NAME}"
        exit 1
    fi
else
    echo "Failed to download ${CIRCUIT_NAME} from S3"
    exit 1
fi