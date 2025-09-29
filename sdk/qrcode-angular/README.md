# @selfxyz/qrcode-angular

`@selfxyz/qrcode-angular` is an Angular library for generating **verification QR codes** that link to the **Self.xyz app**.
It allows developers to define **what user data (disclosures)** should be requested during verification (such as nationality, age checks, or OFAC restrictions) and automatically builds a QR code that users can scan with the Self app to complete verification.

With a few lines of code, you can:

- Configure disclosures like _minimum age, excluded countries, OFAC checks, or DG1 passport fields_.
- Generate a `SelfApp` configuration via `SelfAppBuilder`.
- Render a QR code that works out-of-the-box with WebSocket or deep link flows.
- Handle **success** and **error** callbacks when verification is completed.

This library is the **Angular equivalent** of the Self QR code React SDK, making it easy to embed Self-powered verification flows into Angular applications.

# @selfxyz/angular-qrcode

`SelfQRcodeComponent` is an Angular standalone component for rendering **QR codes** that connect users to Self.xyz's flows.
It manages session creation, WebSocket connections, and real-time proof state updates, while providing visual feedback through LED states.

---

## ✨ Features

- Generates a unique session ID for every instance.
- Displays a QR code for Self app deep linking or WebSocket flow.
- Handles **WebSocket lifecycle** (connection, cleanup, proof step updates).
- Emits **success** and **error callbacks** when verification completes.
- Supports light/dark mode and configurable QR size.
- Includes success/error animations with `ngx-lottie`.

---

## 📦 Installation

```bash
npm install @selfxyz/qrcode-angular
```

Also ensure you have Angular v15+ with standalone components enabled.

---

## 🔧 Setup

You'll need to add the provider to your application's bootstrap configuration:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideSelfLottie } from '@selfxyz/qrcode-angular';

bootstrapApplication(App, {
  ...appConfig,
  providers: [...appConfig.providers, provideSelfLottie()],
}).catch((err) => console.error(err));
```

This provider is required for the Lottie animations used in success/error states.

---

## ⚡ Usage

### Import the Component

Since it’s standalone, you can import it directly into any feature component:

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelfQRcodeComponent, type SelfApp } from '@selfxyz/qrcode-angular';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, SelfQRcodeComponent],
  template: `
    <lib-self-qrcode
      [selfApp]="selfApp"
      [successFn]="onSuccess"
      [errorFn]="onError"
      [darkMode]="false"
      [size]="300"
    >
    </lib-self-qrcode>
  `,
})
export class DemoComponent {
  selfApp: SelfApp = {
    appName: 'Demo App',
    scope: 'demo-scope',
    endpoint: 'https://your-api.com/verify',
    endpointType: 'https',
    logoBase64: 'https://i.imgur.com/Rz8B3s7.png',
    userId: '0x123...', // a uuid or address
    disclosures: {
      nationality: true,
      minimumAge: 18,
      ofac: true,
    },
    version: 2,
  };

  onSuccess() {
    console.log('✅ Verification successful!');
  }

  onError(err: { error_code?: string; reason?: string }) {
    console.error('❌ Verification failed', err);
  }
}
```

---

## 🔧 Component API

### Inputs

| Input          | Type                                                       | Default         | Description                                          |
| -------------- | ---------------------------------------------------------- | --------------- | ---------------------------------------------------- |
| `selfApp`      | `SelfApp` (required)                                       | —               | The configured Self app instance.                    |
| `successFn`    | `() => void` (required)                                    | —               | Callback triggered when verification succeeds.       |
| `errorFn`      | `(data: { error_code?: string; reason?: string }) => void` | —               | Callback triggered when verification fails.          |
| `type`         | `'websocket' \| 'deeplink'`                                | `'websocket'`   | Determines whether to use WebSocket or deep link QR. |
| `websocketUrl` | `string`                                                   | `WS_DB_RELAYER` | Custom WebSocket relay URL.                          |
| `size`         | `number`                                                   | `300`           | Size of the QR code in pixels.                       |
| `darkMode`     | `boolean`                                                  | `false`         | Toggles light/dark mode for QR code styling.         |

---

### `SelfApp`

| Property           | Type                                                  | Required | Description                                                               |
| ------------------ | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `appName`          | `string`                                              | ✅       | The display name of your app shown in the Self flow.                      |
| `logoBase64`       | `string` (URL or Base64-encoded image)                | ✅       | The app’s logo (shown to the user during verification).                   |
| `endpointType`     | `EndpointType`                                        | ✅       | `staging_https` \| `https` \| `celo` \| `staging_celo`                    |
| `endpoint`         | `string`                                              | ✅       | API endpoint where proof is verified (endpoint url or a contract address) |
| `deeplinkCallback` | `string`                                              | Optional | Callback URL for deep link flows.                                         |
| `scope`            | `string`                                              | ✅       | Unique identifier for your application                                    |
| `userId`           | `string`                                              | ✅       | Unique identifier for the end user (address or a uuid)                    |
| `userIdType`       | `UserIdType`                                          | Optional | Type of identifier used (`email`, `phone`, etc.).                         |
| `disclosures`      | [`SelfAppDisclosureConfig`](#selfappdisclosureconfig) | ✅       | Defines which fields are requested during verification.                   |
| `version`          | `number`                                              | ✅       | Schema version (e.g., `2`).                                               |
| `userDefinedData`  | `string`                                              | Optional | Arbitrary developer-defined metadata.                                     |

---

### `SelfAppDisclosureConfig`

| Property                | Type                   | Default | Description                                               |
| ----------------------- | ---------------------- | ------- | --------------------------------------------------------- |
| `issuing_state`         | `boolean`              | `false` | Request the issuing state from the document.              |
| `name`                  | `boolean`              | `false` | Request the full name from the document                   |
| `passport_number`       | `boolean`              | `false` | Request the document number.                              |
| `nationality`           | `boolean`              | `false` | Request the user’s nationality.                           |
| `date_of_birth`         | `boolean`              | `false` | Request the date of birth.                                |
| `gender`                | `boolean`              | `false` | Request the gender field.                                 |
| `expiry_date`           | `boolean`              | `false` | Request the passport expiry date.                         |
| `ofac`\*\*              | `boolean`              | `false` | Check against OFAC sanction lists.                        |
| `excludedCountries`\*\* | `Country3LetterCode[]` | `[]`    | Exclude users from specific ISO 3166-1 alpha-3 countries. |
| `minimumAge`\*\*        | `number`               | —       | Require a minimum age (e.g., `18` (upto `99`)).           |

> \*\* ⚠️ **Important:** These fields must match your **backend configuration**.

---

## 🎬 Lifecycle

- On init:
  - Generates a **UUID session ID**.
  - Establishes a **WebSocket connection**.
  - Sets the QR code value.

- On destroy:
  - Cleans up the WebSocket connection.

---

# Mobile usage

It's scan to use QR codes on mobile. Instead you'll you want to use the **deeplink flow** instead of WebSocket, and you’ll need to import the `getUniversalLink` helper from the library. Pass your configured `selfApp` object into it along with a `deeplinkCallback` URL. The generated link can then be attached to a button or anchor tag, which will open the Self app directly.

Example:

```ts
import { getUniversalLink } from '@selfxyz/qrcode-angular';

const link = getUniversalLink({
  ...selfApp,
  deeplinkCallback: 'https://your-app.com/callback',
});
```

```html
<a [href]="link" target="_blank">Open Self App</a>
```

---
