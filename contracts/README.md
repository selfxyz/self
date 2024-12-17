# OpenPassport Contracts

Contracts for OpenPassport.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/mint.ts
npx hardhat ignition deploy ignition/modules/Deploy_All.ts --network <network>
```

## When you run test

```shell
cd ../circuits
./scripts/download_circuits_from_aws.sh
cd ../contracts
yarn run test
```

If you want to generate your own proof or when you update circuits, pls delete json files in test/integrationTest

## Deployed Addresses
These contracts are deployed on Sepolia.
| Contract Name | Address |
| --- | --- |
| GenericVerifier | 0x79A51bf5B1b903A60Eb91b80954943E596B4aa26 |
| OpenPassportVerifier | 0x8BE4B0c58D0290f7525217d515f7de967aD7b527 |
| Verifier_prove_rsa_65537_sha1 | 0x705489920dc64722Bd702C37F01996557Aa040fD |
| Verifier_prove_rsa_65537_sha256 | 0x8bbC7560e745CFC8Fe63056245ece0EB9a4DEa75 |
| Verifier_prove_rsapss_65537_sha256 | 0x44ED8EBaf112D176f3EFb379E4f2a35f1Be37004 |
| Verifier_prove_ecdsa_secp256r1_sha256 | 0x123f9ff29493ccC4EFd53976FeF5300B20623B11 |
| Verifier_prove_ecdsa_secp256r1_sha1 | 0xAdA147C77f64f07273AF853536ee9495c0B997e4 |
| Verifier_dsc_rsa_65537_sha1_4096 | 0x6D7bE7668407169bf5472a86bE693f1dCc88A6aD |
| Verifier_dsc_rsa_65537_sha256_4096 | 0x097547F99696774205521e143616DD7AC8edBbe0 |
| Verifier_dsc_rsapss_65537_sha256_4096 | 0xd4Fa0F177b8B8AC1312631B19A9a0ADc7De5d091 |