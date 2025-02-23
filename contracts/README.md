# OpenPassport Contracts

Contracts for OpenPassport.


## Deployed Addresses

| Contract | Address |
| -------- | ------- |
| Verifier_dsc_sha256_rsa_65537_4096 | `0xd0596f8ed2Ae2f317daE68A54BC489f2171f0262` |
| Verifier_register_sha1_sha256_sha256_rsa_65537_4096 | `0xb634bac92742DCb264a1E5CBE55C8d4A1A01c278` |
| Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1 | `0xE9BCF83686c185e7A489143B989cFc40ADCb0903` |
| Verifier_register_sha256_sha256_sha256_rsa_65537_4096 | `0x0F042386B406448FA71D5B2C33cdA876055F764a` |
| Verifier_vc_and_disclose | `0x64c778bc51828dF567Ac059B5367d50db40763D3` |
| PoseidonT3 | `0x4c52db4B4A1BD01fc8E50041c44E522B36DFF381` |
| IdentityRegistryImplV1 | `0x71139287BBcdEFC29EC18fB5Ee6936F23f0D25b2` |
| IdentityRegistry | `0x537F2fd23A0432887F32414001Cc7572260544B1` |
| IdentityVerificationHubImplV1 | `0x1d3501bc0cF7Dc9beC3620e62F99f4d3715F0DE1` |
| IdentityVerificationHub | `0x95390Dbeb0E890C056c763131BC969A074A46695` |
| VerifyAll | `0x894974105ad57cdB7e53BaF35D5674c156B45A37` |

## ⚠️Cautions⚠️

When you do the upgrade, be careful with this storage patterns
- You can not change the order in which the contract state variables are declared, nor their type.
Pls see this page for more details: https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts

## When you run test and see the coverage
When you compile the circuits, make sure you set the build flag to true for these circuits:
- register_sha256_sha256_sha256_rsa_65537_4096
- dsc_sha256_rsa_65537_4096
- vc_and_disclose
Go to ../circuits/scripts/build/ and change false to true for these circuits.
Then you can run the following command to see the coverage.

```shell
cd ../circuits
yarn run build-all
cd ../contracts
yarn run test:coverage:local
```
