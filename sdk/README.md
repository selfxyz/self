# SDK

## Installation

yarn add proof-of-passport-sdk

## Development

```bash
yarn install-sdk
```
## Tests

```bash
yarn test
```

## How to use

### Web2 applications

To use the `ProofOfPassportWeb2Verifier` in Web2 applications, import and initialize it as follows:


```typescript
import { ProofOfPassportWeb2Verifier } from '@proofofpassport/sdk';
const verifier = new ProofOfPassportWeb2Verifier({
scope: "yourScope",
requirements: [["older_than", "18"], ["nationality", "France"]]
});
```

#### parameters for `ProofOfPassportWeb2Verifier`

| Parameter     | Optional | Description |
|---------------|----------|-------------|
| `scope`       | No       | The scope of your application, is unique for each application. |
| `attestationId` | Yes    | The ID of the attestation, defaults to `PASSPORT_ATTESTATION_ID`. |
| `requirements` | Yes    | An array of requirements, each an array with an attribute and its expected value. |
| `rpcUrl`      | Yes      | The RPC URL to connect to the blockchain, defaults to `DEFAULT_RPC_URL`. |

Finally, verify the proof:
The function fired from the Proof of Passport app will send a `ProofOfPassportWeb2Inputs` object.

```typescript

const result = await verifier.verify(proofOfPassportWeb2Inputs); // proofOfPassportWeb2Inputs : ProofOfPassportWeb2Inputs
```

### Web3 application
For Web3 applications, use the `ProofOfPassportWeb3Verifier` as follows:

```typescript
import { ProofOfPassportWeb3Verifier } from '@proofofpassport/sdk';
const verifier = new ProofOfPassportWeb3Verifier({
scope: "yourScope",
rpcUrl: "https://custom.rpc.url"
});
```
#### Parameters for `ProofOfPassportWeb3Verifier`

| Parameter     | Optional | Description |
|---------------|----------|-------------|
| `scope`       | No       | The scope of the verification. |
| `attestationId` | Yes    | The ID of the attestation, defaults to `PASSPORT_ATTESTATION_ID`. |
| `requirements` | Yes    | An array of requirements, each an array with an attribute and its expected value. |
| `rpcUrl`      | Yes      | The RPC URL to connect to the blockchain, defaults to `DEFAULT_RPC_URL`. |

#### Verify the user owns a sbt which satisfies the requirements:

```typescript
const result = await verifier.verify(address, tokenId);
```

### Handle the report

Each verification will returns a ProofOfPassportReport object which contains all the informations about the verification of each requirement.

If a requirement is not satisfied, the corresponding field will be set to `true`.
The `valid` field will be `false` if there is at least one requirement that is not satisfied.

`nullifier` and `user_identifier` are also accessible as report fields.

```typescript
const report = await verifier.verify(publicSignals, proof);
const nullifier = report.nullifier;
const userIdentifier = report.user_identifier;
```


