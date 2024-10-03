# Installation

```bash
yarn add @openpassport/sdk
```

# Generate a QR code

### Create an AppType type object:

```typescript
import { AppType } from '@openpassport/sdk';
const appName = '🤠 Cowboy App';
const scope = 'cowboyApp';
const userID = 'user1234';
const sessionID = uuidv4();

const cowboyApp: AppType = {
  name: appName,
  scope,
  userId: userID,
  sessionId: sessionID,
  circuit: 'prove',
  arguments: {
    disclosureOptions: { older_than: '18', nationality: 'France' },
  },
};
```

| Parameter   | Optional | Description                                                   |
| ----------- | -------- | ------------------------------------------------------------- |
| `scope`     | M        | The scope of your application, is unique for each application |
| `name`      | M        | Name of the application                                       |
| `userId`    | M        | User ID                                                       |
| `sessionId` | M        | Session ID                                                    |
| `circuit`   | M        | Circuit to use, only `prove` is available for now             |
| `arguments` | O        | Optional disclosure options, based on passport attributes     |

### Display the QR code

Use the appType object defined above to generate a QR code.
The generated QR code is an `HTML element` that you can display in your app.

```typescript
import { QRCodeGenerator } from '@openpassport/sdk';

// [...]  define cowboyApp as described above

const qrCode: HTMLElement = await QRCodeGenerator.generateQRCode(cowboyApp);
```

# Verify the proof

## 1 Step flow

To use the `OpenPassportVerifier`, import and initialize it as follows:

```typescript
import { OpenPassportVerifier } from '@openpassport/sdk';
const verifier = new OpenPassportVerifier({
  scope: 'cowboyApp',
  requirements: [
    ['older_than', '18'],
    ['nationality', 'France'],
  ],
});
```

### Parameters for `OpenPassportVerifier`

| Parameter       | Optional | Description                                                                       |
| --------------- | -------- | --------------------------------------------------------------------------------- |
| `scope`         | M        | The scope of your application, is unique for each application.                    |
| `attestationId` | O        | The ID of the attestation, defaults to `PASSPORT_ATTESTATION_ID`.                 |
| `requirements`  | O        | An array of requirements, each an array with an attribute and its expected value. |
| `rpcUrl`        | O        | The RPC URL to connect to the blockchain, defaults to `DEFAULT_RPC_URL`.          |
| `dev_mode`      | O        | Allow users with generated passport to pass the verification.                     |

### Verify the proof

The function fired from the OpenPassport app will send an `OpenPassportVerifierInputs` object.

```typescript
const result: OpenPassportVerifierReport = await verifier.verify(openPassportVerifierInputs);
```

From the `result` object, you can inspect the validity of any submitted attribute.
To check the overall validity of the proof, you can inspect the `valid` attribute.

```typescript
require(result.valid);
```

Nullifier and user identifier are accessible from the `result` object.

```typescript
const nullifier: number = result.nullifier;
const user_identifier: number = result.user_identifier;
```

## 2 Steps flow

### 🚧 Work in progress 🚧

# Development

Install the dependencies

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
