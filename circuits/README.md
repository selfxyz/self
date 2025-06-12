# OpenPassport Circuits

## Requirements

| Requirement | Version | Installation Guide                                  |
| ----------- | ------- | --------------------------------------------------- |
| nodejs      | > v18   | [Install nodejs](https://nodejs.org/)               |
| circom      | Latest  | [Install circom](https://docs.circom.io/)           |
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
4. The output is multiplied by an input selector_dg1 to allow the user to disclose only what they want to disclose.
5. Final output is packed.

Any application that wants to use OpenPassport can actually build its own `disclose` circuit.

### 🚧 Under development 🚧

OpenPassport currently supports the following sig/hash algorithms:

- [x] sha256WithRSAEncryption
- [x] sha1WithRSAEncryption
- [x] sha256WithRSASSAPSS
- [ ] ecdsa-with-SHA384
- [ ] ecdsa-with-SHA1
- [ ] ecdsa-with-SHA256
- [ ] ecdsa-with-SHA512
- [ ] sha512WithRSAEncryption

> 💡 We currently have a bounty program if you implement a sig/hash setup.

## Installation

you can do a focused install with

```bash

yarn workspace @selfxyz/circuits focus

```

or you can run `yarn install` (it has the same affect whether ran in workspace root or circuits folder)

## Build TS Dependencies

from circuits directory run

```bash
yarn build:deps

```

## Build circuits (dev only)

```bash
./scripts/build_circuits.sh
```

## Run tests ()

```bash
yarn test
```

This will run tests with sample data generated on the fly.

## OpenPassport Prove circuit

OpenPassport Prove is the main circuit of the project.
It is used for these 3 different `circuit modes`:

- prove offChain
- prove onChain
- register

Learn more on these 3 use cases on [OpenPassport documentation.](https://docs.openpassport.app/docs/use-openpassport/quickstart)

The circuit achieves the following actions:

- verify the signature of the passport and the integrity of the datagroups
- disclose attributes
- verify that user's name is not part of the OFAC list
- verify that passport issuer's country is not part of a forbidden countries list
- generate a commitment: Hash(secret, DG1)
- generate a blinded DSC commitment: Hash(anotherSecret, dscPubKey)

If this "everything circuit" is executing all those actions each time, we want according to the `circuit mode` we selected to disclose only specific attributes and hide others.

In order to achieve that we will input a bitmap `selector_mode[2]` that will ensure that the circuit can only disclose the attributes related to the `circuit mode` selected.

| Circuit Mode   | selector_mode[0] | selector_mode[1] |
| -------------- | ---------------- | ---------------- |
| prove offChain | 1                | 1                |
| prove onChain  | 1                | 0                |
| register       | 0                | 0                |

Using the value [0,1] for `selector_mode` will fail proof generation.

Here are the attributes disclosed according to the `circuit_mode`:

| Circuit Mode   | Attributes Disclosed                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| prove offChain | packedReveal-dg1, older than, OFAC, countryIsNotInList, pubKey                 |
| prove onChain  | packedReveal-dg1, older than, OFAC, countryIsNotInList, blinded DSC commitment |
| register       | blinded DSC commitment, commitment                                             |

## Certificate Chain verification

Passports are signed by Document Signing Certificates (DSC).
DSCs are signed by Country Signing Certificate Authority (CSCA).
Both DSC and CSCA lists are published on online registry of the ICAO, however many countries still don't publish their certificates on the ICAO website.
In order to maximize passport readability we need to verify the full certificate chain.

### On chain

To avoid huge proving time and (too) heavy zkeys, the signature of the passport data is verified on the mobile (the passport data never leaves the device) and the certificate chain verification is done on a remote modal server. A `blindedDscCommitment` is generated on both sides to link proofs.

### Off chain

In off chain setup users will send their DSC to the verifier along with their passport proof. The pubKey will be revealed as an output of the proof.
