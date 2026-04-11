# @selfxyz/react

React component wrapper for the Self Verify identity verification widget.

## Installation

```bash
npm install @selfxyz/react
```

`@selfxyz/widget` is included as a dependency and the custom element registers automatically.

## Usage

```tsx
import { SelfVerify } from '@selfxyz/react';

function App() {
  return (
    <SelfVerify
      appName="My App"
      appScope="my-app-id"
      appEndpoint="https://verify.self.xyz"
      preset="age-18"
      onSuccess={(detail) => console.log('Verified:', detail.claims)}
      onError={(detail) => console.error('Failed:', detail.reason)}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `appName` | `string` | Your application name |
| `appScope` | `string` | App identifier registered with Self |
| `appEndpoint` | `string` | Verify-service URL |
| `preset` | `string` | Disclosure preset (`human`, `age-18`, `age-21`, `kyc-basic`, `kyc-full`) |
| `mode` | `string` | `websocket` (default), `token`, or `redirect` |
| `onSuccess` | `(e) => void` | Called on successful verification |
| `onError` | `(e) => void` | Called on verification failure |
| `onStatus` | `(e) => void` | Called on progress updates |

## Requirements

React 18+ and a modern browser (Chrome 113+, Safari 17+, Firefox 128+).
