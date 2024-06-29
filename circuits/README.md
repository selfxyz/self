# Proof of Passport Circuits 

## Requirements

| Requirement | Version | Installation Guide |
|-------------|---------|--------------------|
| nodejs      | > v18     | [Install nodejs](https://nodejs.org/) |
| circom      | Latest  | [Install circom](https://docs.circom.io/) |
| snarkjs     | Latest  | [Install snarkjs](https://github.com/iden3/snarkjs) |


## Overview of the circuits

Circom circuits are located in the `circuits/` folder.
The circuits are split into two parts: `register` and `disclose`.
This design is close to that of [semaphore](https://semaphore.pse.dev/).

The `register` circuit is used for the following:
1. Verify the signature of the passport
2. Verify that the public key which signed the passport is part of the registry merkle tree (a check of the merkle roots will be performed on-chain)
3. Generate commitment = H (secret + passportData + some other data)

Once the proof is generated, the user can register on-chain and their commitment will be added to the Lean merkle tree.

As the hash function and signature algorithm is different upon the issuer country, there will be different `register` circuits for each of those set-ups.
The `register` will follow the `register_<hash>With<signature>.circom` naming convention.
One verifier for each register circuit will be deployed on-chain, all of them committing to the same merkle tree.

The `disclose` circuit is used for the following:
1. Verify that a user knows a secret e.g., he is able to reconstruct one leaf of the merkle tree (a check of the merkle roots will be performed on-chain)
2. Passport expiry is verified
3. A range check is performed over the age of the user
4. The output is multiplied by an input bitmap to allow the user to disclose only what they want to disclose.
5. Final output is packed.

Any application that wants to use Proof of Passport can actually build its own `disclose` circuit.

### 🚧 Under development 🚧
Proof of Passport currently supports the following sig/hash algorithms:


- [x] sha256WithRSAEncryption
- [x] sha1WithRSAEncryption
- [x] sha256WithRSASSAPSS
- [ ] ecdsa-with-SHA384
- [ ] ecdsa-with-SHA1
- [ ] ecdsa-with-SHA256
- [ ] ecdsa-with-SHA512
- [ ] sha512WithRSAEncryption

> 💡  We currently have a bounty program if you implement a sig/hash setup.


## Installation

```bash
yarn install-circuits
```

## Build circuits (dev only)

```bash
./scripts/build_circuits.sh
```

## Run tests

```bash
yarn test
```
This will run tests with sample data generated on the fly.