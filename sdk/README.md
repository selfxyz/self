# Installation

```bash
yarn add @openpassport/sdk
```

# How to use

## 1 Step flow

To use the `OpenPassport1StepVerifier`, import and initialize it as follows:

```typescript
import { OpenPassport1StepVerifier } from '@openpassport/sdk';
const verifier = new OpenPassport1StepVerifier({
  scope: 'yourScope',
  requirements: [
    ['older_than', '18'],
    ['nationality', 'France'],
  ],
});
```

### parameters for `OpenPassport1StepVerifier`

| Parameter       | Optional | Description                                                                       |
| --------------- | -------- | --------------------------------------------------------------------------------- |
| `scope`         | No       | The scope of your application, is unique for each application.                    |
| `attestationId` | Yes      | The ID of the attestation, defaults to `PASSPORT_ATTESTATION_ID`.                 |
| `requirements`  | Yes      | An array of requirements, each an array with an attribute and its expected value. |
| `rpcUrl`        | Yes      | The RPC URL to connect to the blockchain, defaults to `DEFAULT_RPC_URL`.          |

Finally, verify the proof:
The function fired from the OpenPassport app will send a `OpenPassportWeb2Inputs` object.

```typescript
const result = await verifier.verify(openPassportWeb2Inputs); // OpenPassportWeb2Inputs : OpenPassportWeb2Inputs
```

## 2 Steps flow

### 🚧 Work in progress 🚧

# Development

```bash
yarn install-sdk
```

## Tests

To run the tests, you need to download the circuits and the zkey files from the AWS s3 bucket.
This script will also compile the circuits to generate the wasm files.
Make sure that the circuits in the circuits folder are up to date with the AWS zkey files.

```bash
yarn download-circuits
```

Then run the tests with the following command:

```bash
yarn test
```
