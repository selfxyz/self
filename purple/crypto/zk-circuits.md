# Zero-Knowledge Circuits

## Overview

ZK circuits for identity verification using passport NFC data. Circom is the primary framework (production). Noir is in development.

## Circuit Types

| Type | Purpose | Variants |
|------|---------|----------|
| Register | User registration — verify passport signature, generate commitment | 32 |
| Disclose | Selective attribute disclosure with age/country checks | 4 (passport, id_card, aadhaar, kyc) |
| DSC | Document Signing Certificate chain verification | 24 |
| OFAC | Sanctions screening via Sparse Merkle Trees | 3 (name, name+DOB, passport#) |
| GCP JWT | Google Cloud attestation verification | 1 |

## Naming Convention

```
{circuit_type}_{dg_hash}_{econtent_hash}_{sig_hash}_{algorithm}_{exponent}_{keysize}

Example: register_sha256_sha256_sha256_rsa_65537_4096
```

## Supported Algorithm Combinations

- **RSA**: Key sizes 2048, 3072, 4096. Exponent 65537.
- **ECDSA curves**: secp256r1, secp384r1, secp521r1, brainpoolP224/256/384/512r1
- **RSA-PSS**: Various exponents and salt lengths
- **Hash functions**: SHA1, SHA224, SHA256, SHA384, SHA512

## Circuit Flow

```
NFC Passport Data
    │
    ▼
Register Circuit                    DSC Circuit
├── Verify passport signature       ├── Verify DSC→CSCA chain
├── Check DSC in merkle tree        └── Output: dsc_tree_leaf
├── Output: commitment, nullifier
    │
    ▼
Disclose Circuit
├── Prove commitment knowledge
├── Check passport expiry
├── Age verification
├── Country restrictions
├── OFAC screening (SMT proofs)
└── Output: selectively revealed data
```

## Build Pipeline

1. Compile Circom → R1CS + WASM
2. Trusted setup with Powers of Tau (PTAU)
3. Generate proving key (zkey)
4. Export verification key
5. Generate Solidity verifier → deployed on-chain

## Proving Architecture

- **Mobile**: Document validation + circuit input generation
- **TEE**: Remote proof computation over WebSocket (AES-256-GCM encrypted)
- **On-chain**: Solidity verifier contract validates proof

Timing estimates:
- RSA (2048-4096): 2-6 seconds
- ECDSA (256-384): 25-100 seconds
- ECDSA (512-521): 100-200+ seconds

## Directory Structure

```
circuits/
├── circuits/
│   ├── register/instances/    # 32 parametrized register circuits
│   ├── disclose/              # 4 disclose variants
│   ├── dsc/instances/         # 24 DSC circuits
│   └── utils/                 # Shared Circom templates
├── tests/                     # ts-mocha + circom_tester
└── scripts/build/             # Build automation

noir/crates/                   # Noir circuits (in development)
├── dg1/                       # DG1 verification
├── econtent/                  # eContent hashing
└── ofac/                      # OFAC checks
```

## DOs

- DO follow the naming convention: `{type}_{dg}_{econtent}_{sig}_{algo}_{exp}_{keysize}`
- DO add new circuit instances as minimal files that include the main template with parameters
- DO generate Solidity verifiers from compiled circuits
- DO test circuits with `circom_tester` (WASM backend) before deployment
- DO use Poseidon hashing for all in-circuit hash operations
- DO keep the Noir codebase in sync with Circom circuit functionality

## DON'Ts

- DON'T modify shared Circom templates without testing all dependent instances
- DON'T skip the trusted setup phase for new circuits
- DON'T expose circuit witness data outside the proving environment
- DON'T hard-code merkle tree depths — use parametrized values
- DON'T deploy verifiers without testing the full prove-then-verify pipeline
