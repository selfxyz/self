# Linear Task Backlog

Copy these into Linear as needed.

## New Issues

### Consolidate SelfClientProvider into the SDK

Move adapter wiring from `app/src/providers/selfClientProvider.tsx` into `packages/mobile-sdk-alpha/src/context.tsx`, exposing adapter props so the app can consume the provider directly.

### Expose document catalog & storage

Pull catalog helpers and keychain wrappers from `app/src/providers/passportDataProvider.tsx` into `packages/mobile-sdk-alpha/src/documents/` and re-export storage types through `@selfxyz/common`.

### Port NFC scanning into the SDK

Relocate `app/src/utils/nfcScanner.ts` and related modules into `packages/mobile-sdk-alpha/src/nfc/` to provide a platform-agnostic scanning adapter.

### Implement protocol synchronization

Fetch protocol trees with pagination and TTL caching, verify roots, and rate-limit with exponential backoff and jitter.

### Add artifact management layer

Define a manifest format, validate signatures, and download artifacts via a CDN with integrity checks.

### Decouple React Native providers and hooks

Allow providers and hooks to accept adapter instances via props, keeping them independent of concrete implementations.

### Ship batteries-included components

Provide minimal scanners and buttons that compose existing hooks while allowing adapter overrides.

### Publish sample applications

Create React Native and web demos that showcase core registration and disclosure flows, including an `OpenPassport` URL scheme for iOS.

### Embed lightweight SDK demo

Bundle a small themed React Native demo inside the SDK with build and run instructions.

### Deliver Android demo app

Ship a standalone React Native Android project demonstrating MRZ scanning through proof generation.

### Consolidate analytics and auth adapters

Move analytics and authentication adapters into `@selfxyz/common` (or a dedicated package) for reuse across apps.
