# SDK

## Installation

```bash
yarn add @openpassport/sdk
```

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

To use the `OpenPassportWeb2Verifier` in Web2 applications, import and initialize it as follows:


```typescript
import { OpenPassportWeb2Verifier } from '@openpassport/sdk';
const verifier = new OpenPassportWeb2Verifier({
  scope: "yourScope",
  requirements: [["older_than", "18"], ["nationality", "France"]]
});
```

#### parameters for `OpenPassportWeb2Verifier`

| Parameter     | Optional | Description |
|---------------|----------|-------------|
| `scope`       | No       | The scope of your application, is unique for each application. |
| `attestationId` | Yes    | The ID of the attestation, defaults to `PASSPORT_ATTESTATION_ID`. |
| `requirements` | Yes    | An array of requirements, each an array with an attribute and its expected value. |
| `rpcUrl`      | Yes      | The RPC URL to connect to the blockchain, defaults to `DEFAULT_RPC_URL`. |

Finally, verify the proof:
The function fired from the OpenPassport app will send a `OpenPassportWeb2Inputs` object.

```typescript

const result = await verifier.verify(openPassportWeb2Inputs); // OpenPassportWeb2Inputs : OpenPassportWeb2Inputs
```

### Web3 application
For Web3 applications, use the `OpenPassportWeb3Verifier` as follows:

```typescript
import { OpenPassportWeb3Verifier } from '@openpassport/sdk';
const verifier = new OpenPassportWeb3Verifier({
  scope: "yourScope",
  rpcUrl: "https://custom.rpc.url"
});
```
#### Parameters for `OpenPassportWeb3Verifier`

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

Each verification will returns a OpenPassportVerifierReport object which contains all the informations about the verification of each requirement.

If a requirement is not satisfied, the corresponding field will be set to `true`.
The `valid` field will be `false` if there is at least one requirement that is not satisfied.

`nullifier` and `user_identifier` are also accessible as report fields.

```typescript
const report = await verifier.verify(publicSignals, proof);
const nullifier = report.nullifier;
const userIdentifier = report.user_identifier;
```