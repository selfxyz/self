# KMP Architecture

Last updated: March 5, 2026
Owner: KMP program
Status: Draft

## Purpose

Define the canonical architecture for KMP SDK delivery, runtime behavior, and integration contracts.

## Scope

In scope:

- KMP SDK (`packages/kmp-sdk`)
- KMP SDK test app (`packages/kmp-sdk-test-app` target name)
- Swift companion package (`packages/self-sdk-swift`)
- Bridge contract and handler lifecycle

Out of scope:

- Product requirements and roadmap sequencing (see `INITIATIVE.md`)
- Detailed task breakdowns per implementation chunk

## System Context

- Host apps launch SDK runtime.
- SDK runtime hosts WebView flow and routes bridge messages.
- Native handlers execute platform-specific actions.
- Results are returned through bridge responses to web layer.

## Module Boundaries

1. `kmp-sdk`

- Public API surface (`configure`, `launch`, callbacks)
- Shared bridge models and router
- Android and iOS native handler bindings

2. `self-sdk-swift`

- iOS-native provider implementations
- Factory/config wiring for KMP iOS side

3. `kmp-sdk-test-app`

- Integration harness for Android/iOS manual validation
- Non-production sample host and verification scenarios

## Runtime Flow

1. App initializes SDK config.
2. SDK launches WebView host.
3. Web layer sends bridge request.
4. Router dispatches to native handler.
5. Native result/error marshalled to bridge response.
6. Web flow proceeds or fails with typed error.

## Bridge Contract

Required sections for future expansion:

- Message envelope format
- Request/response typing rules
- Error code taxonomy
- Timeout/retry semantics
- Version compatibility policy

## Platform Notes

### Android

- Activity/webview host lifecycle ownership
- NFC/camera/permission handling responsibilities
- Threading model expectations

### iOS

- Provider delegation into Swift package
- View controller presentation ownership
- Permission and lifecycle edge cases

## Security and Privacy

- Sensitive data handling boundaries
- Logging restrictions (no secrets/PII)
- Storage and retention rules

## Validation Matrix

- Unit: router + handler contracts
- Build: android + ios compile targets
- Integration: test app verification flows
- Device: physical NFC/passport success and failure cases

## Open Decisions

- [ ] Decision 1: _TBD_
- [ ] Decision 2: _TBD_
- [ ] Decision 3: _TBD_

## Change Log

- 2026-03-05: Initial architecture skeleton created.
