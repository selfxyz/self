# Generating Mock Certificates

This guide explains how to generate and set up mock certificates for testing.

## Steps to Generate Certificates

1. Add your certificate configuration in `genCertificates.sh`
   - You can create cross-signed certificates using the `--signer` flag to specify which CSCA should sign your DSC

2. From the `/common` directory, run:
   ```bash
   ./scripts/generateCertificates.sh
   ```
   Then run 
   ```bash
   python ./scripts/addCertificatesInTs.py
   ```

## Adding New CSCA Certificates

When adding new CSCA certificates, you'll need to update the SKI-PEM mapping:

1. Navigate to the `/registry` directory and run:
   ```bash
   ts-node src/buildSkiPem.ts
   ```

2. Check the generated output file `ski_pem_dev.json`

3. Copy the contents and update `skiPem.ts` with the new mappings