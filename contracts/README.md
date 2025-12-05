# Self Contracts

## Overview

This is the implementation of contracts for verification and management of identities in Self.

## ⚠️Cautions⚠️

When you do the upgrade, be careful with this storage patterns

- You can not change the order in which the contract state variables are declared, nor their type.
- The upgradeable contracts currently target OpenZeppelin 5.x.

Pls see this page for more details:
https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts

## Integration Guide

In the npm package, you'll find the following directory structure:

```bash
.
├── abstract
│   └── SelfVerificationRoot.sol # Base impl in self verification
├── constants
│   ├── AttestationId.sol # A unique identifier assigned to the identity documents
│   └── CircuitConstants.sol # Indices for public signals in our circuits
├── interfaces
│   ├── IDscCircuitVerifier.sol
│   ├── IIdentityRegistryV1.sol
│   ├── IIdentityVerificationHubV1.sol
│   ├── IPassportAirdropRoot.sol
│   ├── IRegisterCircuitVerifier.sol
│   ├── ISelfVerificationRoot.sol
│   └── IVcAndDiscloseCircuitVerifier.sol
└── libraries
    ├── CircuitAttributeHandler.sol # Library to extract each attribute from public signals
    └── Formatter.sol # Utility functions to manage public signals to meaningful format
```

If you want to integrate SelfVerificationRoot.sol into your contract, you should also import these files.

```solidity
import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";

import { IVcAndDiscloseCircuitVerifier } from "@selfxyz/contracts/contracts/interfaces/IVcAndDiscloseCircuitVerifier.sol";

import { IIdentityVerificationHubV1 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV1.sol";

import { CircuitConstants } from "@selfxyz/contracts/contracts/constants/CircuitConstants.sol";
```

And override verifySelfProof function and write your own logic. You can take a look at these examples.

- [Airdrop](https://github.com/selfxyz/self/blob/main/contracts/contracts/example/Airdrop.sol)
- [HappyBirthday](https://github.com/selfxyz/happy-birthday/blob/main/contracts/contracts/HappyBirthday.sol)

In the verifySelfProof function, you should add these validations

- Mandatory
  - scope validation
  - attestation id validation
- Optional
  - nullifier validation
  - user id validation
  - age verification with olderThan
  - forbidden countries validation
  - ofac validation

Also, if you want to play with some attributes in the passport, you should import these libraries.

```solidity
import { CircuitAttributeHandler } from "@selfxyz/contracts/contracts/libraries/CircuitAttributeHandler.sol";
import { Formatter } from "@selfxyz/contracts/contracts/libraries/Formatter.sol";
```

CircuitAttributeHandler is the library to extract readable attributes in the passport from public signals. The formatter
is responsible for converting other data included in the public signals. Use it when you want to validate information
related to birthdays or the time when the proof was generated.

As an example, please refer to the following contract.

- [HappyBirthday](https://github.com/selfxyz/happy-birthday/blob/main/contracts/contracts/HappyBirthday.sol)
- [getReadableRevealedData function in the hub contract](https://github.com/selfxyz/self/blob/bdcf9537b01570b2197ae378815adbcc9c8747e8/contracts/contracts/IdentityVerificationHubImplV1.sol#L313-L357)

## Building Contracts

### Prerequisites

Before building contracts, you must install these **system-level dependencies manually** or ensure they are already
installed.

#### 1. Node.js and Yarn

We use yarn 4. If you haven't already, it can be enabled with:

```bash
corepack enable yarn
```

_corepack_ is a built-in nodejs command

#### 2. Rust (for Circom)

Install Rust using rustup:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### 3. Circom 2.1.9

Install the specific version of Circom required:

```bash
git clone https://github.com/iden3/circom.git
cd circom
git checkout v2.1.9
cargo build --release
cp ./target/release/circom ~/.cargo/bin/
```

Verify installation:

```bash
circom --version
# Should output: circom compiler 2.1.9
```

#### 4. wget

Install wget using your system's package manager:

- **macOS**: `brew install wget`
- **Ubuntu/Debian**: `apt-get install wget`

### Installation

1. Install Node.js dependencies (after installing the system dependencies above):

```bash
yarn install
```

2. Compile the contracts:

```bash
yarn run build
```

## Deployments

1. Deploy verifiers

```bash
yarn run deploy:allverifiers:celo
```

2. Deploy registry proxy and impl

```bash
yarn run deploy:registry:celo
```

3. Deploy hub proxy and impl

```bash
yarn run deploy:hub:celo
```

4. Update csca, ofac and hub address in registry

```bash
yarn run update:cscaroot:celo
yarn run update:ofacroot:celo
yarn run update:hub:celo
```

## Testing

When you compile the circuits, make sure you set the build flag to true for these circuits:

- register_sha256_sha256_sha256_rsa_65537_4096
- dsc_sha256_rsa_65537_4096
- vc_and_disclose Go to ../circuits/scripts/build/ and change false to true for these circuits. Then you can run the
  following command to see the coverage.

```shell
cd ../circuits
yarn run build-all
cd ../contracts
yarn run test:coverage:local
```

## Deployed Contract Addresses

| Contract                                                     | Address                                    |
| ------------------------------------------------------------ | ------------------------------------------ |
| Verifier_dsc_sha1_ecdsa_brainpoolP256r1                      | 0xE7B4A70fc1d96D3Fb6577206c932eF1e634Cf2d0 |
| Verifier_dsc_sha1_rsa_65537_4096                             | 0x19E25a5772df0D7D6Db59D94a4d6FBd7098a3012 |
| Verifier_dsc_sha256_ecdsa_brainpoolP256r1                    | 0x1F3afAe85992B1B8CF6946B091225dAF8307675d |
| Verifier_dsc_sha256_ecdsa_brainpoolP384r1                    | 0x52A6EF39655D662A8Cf8eB56CD853883fe43eb2b |
| Verifier_dsc_sha256_ecdsa_secp256r1                          | 0x643735Cd44F8b2BDa47b4a7962c8BDf12E6CDdf8 |
| Verifier_dsc_sha256_ecdsa_secp384r1                          | 0x00F0D1A32Def293DAB78100A6569ebb4EC035F82 |
| Verifier_dsc_sha256_rsa_65537_4096                           | 0x711e655c43410fB985c4EDB48E9bCBdDb770368d |
| Verifier_dsc_sha256_rsapss_3_32_3072                         | 0xDAFF470e561F3f96C7410AeF02196913E981fF1B |
| Verifier_dsc_sha256_rsapss_65537_32_3072                     | 0x07B6C2FFB098B131eAD104396d399177014ae15f |
| Verifier_dsc_sha256_rsapss_65537_32_4096                     | 0xFBDDADb864b24B2c4336081A22f41D04E7b35DA9 |
| Verifier_dsc_sha384_ecdsa_brainpoolP384r1                    | 0x6a40dfa6f99FA178aB6cc88928Bf30661e917A76 |
| Verifier_dsc_sha384_ecdsa_secp384r1                          | 0x1719430107E66717d8b34d4190838dfABAf810e6 |
| Verifier_dsc_sha512_rsa_65537_4096                           | 0xf5eE920d6D50a8A83C22f548bf406fCBcD558751 |
| Verifier_dsc_sha512_rsapss_65537_64_4096                     | 0x5438C4ebFD8Fcce6eb54542e3A5C192B22227f70 |
| Verifier_register_sha1_sha1_sha1_ecdsa_brainpoolP224r1       | 0x8588e473428cf415F10AC96CAa701F6Cd1C8641F |
| Verifier_register_sha1_sha1_sha1_rsa_65537_4096              | 0x15fd0d58cfF9DaA4A60105c0DAC73659530BB7f7 |
| Verifier_register_sha1_sha256_sha256_rsa_65537_4096          | 0xaC5166A01Aee75A10703177896122F4d6e3836d1 |
| Verifier_register_sha224_sha224_sha224_ecdsa_brainpoolP224r1 | 0x7d9b7D2A95541b50CECDB44d82c0570a818111Ac |
| Verifier_register_sha256_sha224_sha224_ecdsa_secp224r1       | 0x48cEc90de8d746efD316968Ea65417e74C6A1a74 |
| Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1 | 0x9C5Af0FC9A32b457e300905929A05356D3C0DB25 |
| Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP384r1 | 0x5286E20745A0d4C35E6D97832D56e30A28303BD6 |
| Verifier_register_sha256_sha256_sha256_ecdsa_secp256r1       | 0xaC861bf9FC8B44ccbAde8E2A39C851bbCf38c392 |
| Verifier_register_sha256_sha256_sha256_ecdsa_secp384r1       | 0x03FCc979cf2d69275647095E4079A3389F24525D |
| Verifier_register_sha256_sha256_sha256_rsa_3_4096            | 0xbE036B26317F013D2c6cB092Aa1fa903220be846 |
| Verifier_register_sha256_sha256_sha256_rsa_65537_4096        | 0xE80537B3399bd405e40136D08e24c250397c09F1 |
| Verifier_register_sha256_sha256_sha256_rsapss_3_32_2048      | 0xe063BD3188341B2D17d96cE38FD31584147d3219 |
| Verifier_register_sha256_sha256_sha256_rsapss_65537_32_2048  | 0xe93Be9382868f30150cAF77793aF384905c2C7E4 |
| Verifier_register_sha256_sha256_sha256_rsapss_65537_32_3072  | 0xD39E5eAfb6d266E3c4AC8255578F23a514fd8B36 |
| Verifier_register_sha384_sha384_sha384_ecdsa_brainpoolP384r1 | 0xd2F65a76A10f5E0e7aE9d18826ab463f4CEb33C9 |
| Verifier_register_sha384_sha384_sha384_ecdsa_secp384r1       | 0xC33E6A04b7296A3062Cf438C33dc8D8157c3916d |
| Verifier_register_sha384_sha384_sha384_rsapss_65537_48_2048  | 0xa7A5A581C2Eb8dF39f486e9ABBc4898546D70C3e |
| Verifier_register_sha512_sha512_sha512_rsa_65537_4096        | 0x6C88A6Afc38cA2859e157532b1b872EcC1ED0424 |
| Verifier_register_sha512_sha512_sha512_rsapss_65537_64_2048  | 0x04A1D0d51Bc078CB137088424b2ec569699dd7A5 |
| Verifier_vc_and_disclose                                     | 0x44d314c2F9b3690735808d26d17dFCc9F906A9B4 |
| PoseidonT3                                                   | 0xF134707a4C4a3a76b8410fC0294d620A7c341581 |
| IdentityRegistryImplV1                                       | 0xC473d5F784e424A70Bf7aCf887E33448E64F8798 |
| IdentityRegistry                                             | 0x37F5CB8cB1f6B00aa768D8aA99F1A9289802A968 |
| IdentityVerificationHubImplV1                                | 0x85FD004B2312a6703F1ce293242Dc15B719772b1 |
| IdentityVerificationHub                                      | 0x77117D60eaB7C044e785D68edB6C7E0e134970Ea |
| VerifyAll                                                    | 0xe6D61680A6ED381bb5A0dB5cF4E9Cc933cF43915 |
