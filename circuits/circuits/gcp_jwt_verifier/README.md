# GCP JWT Verifier Circuit

Zero-knowledge circuits for verifying [Google Cloud Platform Confidential Space JWT attestations](https://cloud.google.com/confidential-computing/confidential-space/docs/confidential-space-overview) with complete X.509 certificate chain validation.

> **Warning**: This circuit uses [`zk-jwt`](https://github.com/zkemail/zk-jwt) which is not yet audited (as of October 2025).

## Overview

This circuit verifies GCP Confidential Space JWT attestations by validating the complete chain of trust:

1. JWT Signature: Verifies the JWT was signed by the leaf certificate (x5c[0])
2. Leaf Certificate: Verifies x5c[0] was signed by the intermediate CA (x5c[1])
3. Intermediate Certificate: Verifies x5c[1] was signed by the root CA (x5c[2])

## Public Outputs

The circuit exposes the following data as public outputs:

- `publicKeyHash`, Poseidon hash of leaf certificate public key
- `header`, Decoded JWT header
- `payload`, Decoded JWT payload
- `eat_nonce_0_b64_output`, Base64URL encoded EAT nonce
- `image_hash`, Container image SHA256 hash

## Architecture

The main circuit does:

1. JWT signature verification (using x5c[0] pubkey)
2. x5c[0] pubkey extraction and validation
3. x5c[0] certificate signature verification (using x5c[1] pubkey)
4. x5c[1] pubkey extraction and validation
5. x5c[1] certificate signature verification (using x5c[2] pubkey)
6. x5c[2] pubkey extraction and validation
7. EAT nonce extraction and validation
8. Container image digest extraction and validation

## Usage

### 1. Prepare Circuit Inputs

Extract data from a GCP JWT attestation:

```bash
cd circuits
yarn tsx circuits/gcp_jwt_verifier/prepare.ts \
  circuits/gcp_jwt_verifier/example_jwt.txt \
  circuit_inputs.json
```

The `prepare.ts` script:

- Parses the JWT header and payload
- Extracts all 3 x5c certificates from the header
- Extracts public keys and signatures from each certificate
- Computes certificate hashes with proper padding
- Locates EAT nonce and image digest in the payload
- Converts all data to circuit-compatible format

### 2. Build Circuit

Compile the circuit and generate proving/verification keys:

```bash
yarn build-gcp-jwt-verifier
```

This runs `scripts/build/build_gcp_jwt_verifier.sh` which:

- Compiles the circuit to R1CS and WASM
- Generates zkey (proving key)
- Exports verification key

### 3. Generate & Verify Proof

```bash
# Generate witness
node build/gcp/gcp_jwt_verifier/gcp_jwt_verifier_js/generate_witness.js \
  build/gcp/gcp_jwt_verifier/gcp_jwt_verifier_js/gcp_jwt_verifier.wasm \
  circuit_inputs.json \
  witness.wtns

# Generate proof
snarkjs groth16 prove \
  build/gcp/gcp_jwt_verifier/gcp_jwt_verifier_final.zkey \
  witness.wtns \
  proof.json \
  public.json

# Verify proof
snarkjs groth16 verify \
  build/gcp/gcp_jwt_verifier/gcp_jwt_verifier_vkey.json \
  public.json \
  proof.json
```

## References

- [GCP Confidential Space Documentation](https://cloud.google.com/confidential-computing/confidential-space/docs/confidential-space-overview)
- [GCP Token Claims Reference](https://cloud.google.com/confidential-computing/confidential-space/docs/reference/token-claims)
- [EAT Nonce Specification](https://cloud.google.com/confidential-computing/confidential-space/docs/connect-external-resources)
- [zk-jwt Library](https://github.com/zkemail/zk-jwt)
