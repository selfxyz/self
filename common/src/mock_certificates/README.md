# Generating Mock Certificates

This guide explains how to generate and set up mock certificates for testing.

## Steps to Generate Certificates

1. Add your certificate configuration in `genCertificates.sh`
   - You can create cross-signed certificates using the `--signer` flag to specify which CSCA should sign your DSC

2. From the `/common` directory, run:

   ```bash
   ./scripts/generateCertificates.sh
   ```

3. If you are generating new CSCA certificates, include the `--csca` flag:
   ```bash
   ./scripts/generateCertificates.sh --csca
   ```
