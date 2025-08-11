# Partner Feedback

## Technical integration

- Expect OAuth-style branding inside the host app. Logo is required; colors, copy, and fonts are optional bonuses.
- Verification flow should run seamlessly on devices that already have the host app installed.
- Ensure branding configuration supports dark/light mode and accessibility requirements.

## Verification workflow

- Expand coverage to US driver's licenses, prioritizing states that support digital verification.
- Support both physical licenses and digital wallet credentials when available.
- Add AADHAR identity support.
- Implement proper error handling for unsupported document types with clear user messaging.

## Implementation

- Clarify acceptable SDK bundle size with partner (target: <500KB gzipped for core functionality).
- Provide a runnable example React Native app to speed up integration.
- Document minimum iOS/Android version requirements and device compatibility.

## Infrastructure & notifications

- Allow the host backend to receive a callback when proofs finish so it can trigger push notifications for users.
- Implement secure callback authentication to prevent unauthorized notifications.
- Add retry logic and timeout handling for callback delivery.
- Provide webhook signature verification for callback security.
