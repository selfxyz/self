# OpenPassport Circuits

## Requirements

| Requirement | Version | Installation Guide                                  |
| ----------- | ------- | --------------------------------------------------- |
| nodejs      | > v18   | [Install nodejs](https://nodejs.org/)               |
| circom      | Latest  | [Install circom](https://docs.circom.io/)           |
| snarkjs     | Latest  | [Install snarkjs](https://github.com/iden3/snarkjs) |

## Overview of the circuits

Circom circuits are located in the `circuits` folder.

There is a one-step flow and a two step flow.

The one-step flow allows a user to prove their passport is valid and disclose attributes at the same time. With the zk proof, they send the DSC (intermediate certificate) that signed their passport with to the verifier, who checks their DSC has been signed by a CSCA (top certificate). This is ideal if the verification is done server-side, there is no need for onchain verification, and if it's fine for the server to learn the nationality of the user, as it's leaked by the DSC. The circuits for the one-step flow are located in the `prove` directory. They are currently in use on the [playground](https://www.openpassport.app/playground).

The `prove` circuits do the following:
- Prove the passport has been signed by the DSC.
- Optionally disclose attributes such as age.

The two-step flow allows a user to register an identity in a merkle tree, proving they have a valid passport, then do selective disclosure proofs using the commitment they registered. This design is akin to [Semaphore](https://semaphore.pse.dev/). It's ideal for applications that need onchain verification or need the server to never learn the nationality of the user. The circuits are split into two parts: `register`, `dsc` and `disclose`.

The `register` circuits do the following:
- Prove the passport has been signed by the DSC.
- Do a blinded commitment of the DSC public key
- Generate the user's commitment = H(secret + passportData)

The `dsc` circuits do the following:
- Prove the DSC has been signed by a CSCA.
- Prove the CSCA is part of a merkle tree of CSCA.
- Do a blinded commitment of the DSC public key.

The check that the two blinded commitments are equal and that the root of the CSCA merkle tree is valid can be performed onchain or offchain.
The different `register` and `dsc` circuits correspond to the hash functions and signature algorithms countries use.

The `disclose` circuit do the following:
- Verify the user knows the secret corresponding to a commitment in the tree.
- Check the passport is not expired
- Optionally disclose attributes such as age.

### 🚧 Under development 🚧

OpenPassport currently supports the following sig/hash algorithms:

- [x] rsa_65537_sha256
- [x] rsa_65537_sha1
- [x] rsapss_65537_sha256
- [x] ecdsa_sha1
- [x] ecdsa_sha256
- [ ] ecdsa_sha384
- [ ] ecdsa_sha512
- [ ] rsa_65537_sha512

For more details on signature algorithm support, see [this issue](https://github.com/zk-passport/openpassport/issues/38) and [the map](https://map.openpassport.app/)
> 💡 We currently have a bounty program for implementing the remaining hash functions/signature algorithms.

## Installation

```bash
yarn install-circuits
```

## Build circuits (dev only)

```bash
./scripts/build_prove_circuits.sh
./scripts/build_register_circuits.sh
```

## Run tests

```bash
yarn test
```
