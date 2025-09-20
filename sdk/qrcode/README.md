# @selfxyz/qrcode

A React component for generating QR codes for Self passport verification.

## Installation

```bash
npm install @selfxyz/qrcode
# or
yarn add @selfxyz/qrcode
```

## Basic Usage

### 1. Import the SelfQRcodeWrapper component

```tsx
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';
```

### 2. Create a SelfApp instance using SelfAppBuilder

```tsx
// Generate a unique user ID
const userId = uuidv4();

// Create a SelfApp instance using the builder pattern
const selfApp = new SelfAppBuilder({
  appName: 'My App',
  scope: 'my-app-scope',
  endpoint: 'https://myapp.com/api/verify',
  logoBase64: 'base64EncodedLogo', // Optional
  userId,
  // Optional disclosure requirements
  disclosures: {
    // DG1 disclosures
    issuing_state: true,
    name: true,
    nationality: true,
    date_of_birth: true,
    passport_number: true,
    gender: true,
    expiry_date: true,
    // Custom verification rules
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

| Parameter     | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `appName`     | string | Yes      | The name of your application                   |
| `scope`       | string | Yes      | A unique identifier for your application       |
| `endpoint`    | string | Yes      | The endpoint that will verify the proof        |
| `logoBase64`  | string | No       | Base64-encoded logo to display in the Self app |
| `userId`      | string | Yes      | Unique identifier for the user                 |
| `disclosures` | object | No       | Disclosure and verification requirements       |

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

import React, { useState, useEffect } from 'react';
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';

function VerificationPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Generate a user ID when the component mounts
    setUserId(uuidv4());
  }, []);

  if (!userId) return null;

  // Create the SelfApp configuration
  const selfApp = new SelfAppBuilder({
    appName: 'My Application',
    scope: 'my-application-scope',
    endpoint: 'https://myapp.com/api/verify',
    userId,
    disclosures: {
      // Request passport information
      name: true,
      nationality: true,
      date_of_birth: true,

      // Set verification rules
      minimumAge: 18,
      excludedCountries: ['IRN', 'PRK', 'RUS'],
      ofac: true,
    },
  }).build();

  return (
    <div className="verification-container">
      <h1>Verify Your Identity</h1>
      <p>Scan this QR code with the Self app to verify your identity</p>

      <SelfQRcodeWrapper
        selfApp={selfApp}
        onSuccess={() => {
          // Handle successful verification
          console.log('Verification successful!');
          // Redirect or update UI
        }}
        size={350}
      />

      <p className="text-sm text-gray-500">User ID: {userId.substring(0, 8)}...</p>
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
