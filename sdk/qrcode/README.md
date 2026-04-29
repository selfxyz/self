# @selfxyz/qrcode

A React component for generating QR codes for Self passport verification.

## Installation

```bash
npm install @selfxyz/qrcode
# or
yarn add @selfxyz/qrcode
```

## Basic Usage

### 1. Import the component

```tsx
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';
```

### 2. Create a SelfApp instance

**For on-chain verification (Celo smart contract):**

```tsx
const selfApp = SelfAppBuilder.forContract({
  appName: 'My DApp',
  contractAddress: '0x1234...abcd', // Your SelfVerificationRoot contract
  scopeSeed: 'my-scope-seed', // Must match the scopeSeed used in contract deployment
  disclosures: 'basic-kyc', // Preset: name, nationality, DOB, OFAC
}).build();
```

**For HTTPS backend verification:**

```tsx
const selfApp = SelfAppBuilder.forBackend({
  appName: 'My App',
  endpoint: 'https://myapp.com/api/verify',
  scope: 'my-scope',
  disclosures: 'basic-kyc',
}).build();
```

**Full customization (advanced):**

```tsx
const selfApp = new SelfAppBuilder({
  appName: 'My App',
  scope: 'my-app-scope',
  endpoint: 'https://myapp.com/api/verify',
  userId: uuidv4(), // Optional — auto-generated if omitted
  logoBase64: 'base64Logo', // Optional
  disclosures: {
    // Or use a preset: 'basic-kyc', 'age-verification', 'full-passport', 'ofac-only'
    name: true,
    nationality: true,
    date_of_birth: true,
    minimumAge: 18,
    excludedCountries: ['IRN', 'PRK'],
    ofac: true,
  },
}).build();
```

### 3. Render the QR code component

```tsx
function MyComponent() {
  return (
    <SelfQRcodeWrapper
      selfApp={selfApp}
      onSuccess={() => {
        console.log('Verification successful');
        // Perform actions after successful verification
      }}
      darkMode={false} // Optional: set to true for dark mode
      size={300} // Optional: customize QR code size (default: 300)
    />
  );
}
```

`SelfQRcodeWrapper` wraps `SelfQRcode` to prevent server-side rendering when using nextjs. When not using nextjs, `SelfQRcode` can be used instead.

## SelfApp Configuration

The `SelfAppBuilder` allows you to configure your application's verification requirements:

| Parameter     | Type   | Required | Description                                                                                                                                                            |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appName`     | string | Yes      | The name of your application                                                                                                                                           |
| `scope`       | string | Yes      | A unique identifier for your application                                                                                                                               |
| `endpoint`    | string | Yes      | The endpoint that will verify the proof                                                                                                                                |
| `logoBase64`  | string | No       | Base64-encoded logo to display in the Self app                                                                                                                         |
| `userId`      | string | No       | Unique identifier for the user (auto-generated if omitted)                                                                                                             |
| `disclosures` | object | No       | Disclosure and verification requirements. Accepts a preset string (`'basic-kyc'`, `'age-verification'`, `'full-passport'`, `'ofac-only'`) or a full disclosure object. |

### Disclosure Options

The `disclosures` object can include the following options:

| Option              | Type     | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `issuing_state`     | boolean  | Request disclosure of passport issuing state |
| `name`              | boolean  | Request disclosure of the user's name        |
| `nationality`       | boolean  | Request disclosure of nationality            |
| `date_of_birth`     | boolean  | Request disclosure of birth date             |
| `passport_number`   | boolean  | Request disclosure of passport number        |
| `gender`            | boolean  | Request disclosure of gender                 |
| `expiry_date`       | boolean  | Request disclosure of passport expiry date   |
| `minimumAge`        | number   | Verify the user is at least this age         |
| `excludedCountries` | string[] | Array of country codes to exclude            |
| `ofac`              | boolean  | Enable OFAC compliance check                 |

## Component Props

The `SelfQRcodeWrapper` component accepts the following props:

| Prop           | Type            | Required | Default       | Description                                           |
| -------------- | --------------- | -------- | ------------- | ----------------------------------------------------- |
| `selfApp`      | SelfApp         | Yes      | -             | The SelfApp configuration object                      |
| `onSuccess`    | () => void      | Yes      | -             | Callback function executed on successful verification |
| `websocketUrl` | string          | No       | WS_DB_RELAYER | Custom WebSocket URL for verification                 |
| `size`         | number          | No       | 300           | QR code size in pixels                                |
| `darkMode`     | boolean         | No       | false         | Enable dark mode styling                              |
| `children`     | React.ReactNode | No       | -             | Custom children to render                             |

## Complete Example

Here's a complete example of how to implement the Self QR code in a React application:

```tsx
'use client';

import React, { useMemo } from 'react';
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';

function VerificationPage() {
  // Build per-mount so each user gets a unique auto-generated userId
  const selfApp = useMemo(
    () =>
      SelfAppBuilder.forBackend({
        appName: 'My Application',
        endpoint: 'https://myapp.com/api/verify',
        scope: 'my-application-scope',
        disclosures: 'basic-kyc',
      }).build(),
    []
  );

  return (
    <div className="verification-container">
      <h1>Verify Your Identity</h1>
      <p>Scan this QR code with the Self app to verify your identity</p>

      <SelfQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => {
          console.log('Verification successful!');
        }}
        size={350}
      />
    </div>
  );
}

export default VerificationPage;
```

## Example

For a more comprehensive and interactive example, please refer to the [playground](https://github.com/selfxyz/playground/blob/main/app/page.tsx).

## Verification Flow

1. Your application displays the QR code to the user
2. The user scans the QR code with the Self app
3. The Self app guides the user through the passport verification process
4. The proof is generated and sent to your verification endpoint
5. Upon successful verification, the `onSuccess` callback is triggered

The QR code component displays the current verification status with an LED indicator and changes its appearance based on the verification state.
