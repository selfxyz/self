# @selfxyz/widget

Framework-agnostic identity verification web component. Add privacy-preserving verification to any website with a single HTML tag.

## Quick Start

### CDN (any website)

```html
<script src="https://cdn.self.xyz/widget/self-verify.js"></script>

<self-verify
  app-name="My App"
  app-scope="my-app-id"
  app-endpoint="https://verify.self.xyz"
  preset="human"
></self-verify>

<script>
  document.querySelector('self-verify')
    .addEventListener('self:success', (e) => {
      console.log('Verified:', e.detail);
    });
</script>
```

### NPM

```bash
npm install @selfxyz/widget
```

```javascript
import '@selfxyz/widget';
// <self-verify> is now registered as a custom element
```

## Presets

| Preset | Proves | Private |
|--------|--------|---------|
| `human` | Real person | Everything |
| `age-18` | Over 18 | Date of birth |
| `age-21` | Over 21 | Date of birth |
| `kyc-basic` | Name, nationality, DOB, OFAC | Passport details |
| `kyc-full` | Full identity | Nothing |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `self:status` | `{ step, message }` | Progress updates |
| `self:success` | `{ sessionId, token, self }` | Verification complete |
| `self:error` | `{ code, message }` | Verification failed |

## Programmatic API

```javascript
// Open in modal
SelfVerify.open({ appName: '...', preset: 'human' });

// Verify a JWT token
const claims = await SelfVerify.verifyToken(jwt);
```

## Browser Support

Chrome 113+, Safari 17+, Firefox 128+ (Ed25519 SubtleCrypto required for client-side token verification).
