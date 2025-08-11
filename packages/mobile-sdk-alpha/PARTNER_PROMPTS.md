# Partner Feedback Prompts

Task stubs for requests raised by an external partner.

> **Note**: This document uses standard Markdown `<details>` and `<summary>` tags for collapsible task sections, ensuring proper rendering on GitHub and other Markdown viewers.

## Technical integration

<details>
<summary><strong>Expose branding configuration</strong></summary>

1. Add theming props to SDK screens for logo, colors, and optional fonts.
2. Document OAuth-style branding guidance in `README.md`.
3. Support dark/light mode variants and accessibility requirements.
4. Validate branding assets meet minimum size and format requirements.

</details>

## Verification workflow

<details>
<summary><strong>Add US digital license support</strong></summary>

1. Research state APIs or standards for digital driver's license verification.
2. Implement adapters that handle both physical and wallet-based licenses.
3. Provide fixtures and tests for at least one state implementation.
4. Add proper error handling for unsupported states with clear user messaging.
5. Implement secure credential verification with proper signature validation.

</details>

<details>
<summary><strong>Add AADHAR document support</strong></summary>

1. Investigate required fields and validation rules for AADHAR identities.
2. Implement parsing and validation helpers.
3. Cover logic with unit tests and sample data.
4. Ensure compliance with Indian data protection regulations.
5. Add proper error handling for invalid or expired AADHAR documents.

</details>

## Implementation

<details>
<summary><strong>Clarify bundle size budget</strong></summary>

1. Measure current SDK bundle size using `yarn build` outputs.
2. Confirm acceptable bundle size with partner and document target in `PARTNER_FEEDBACK.md`.
3. Implement tree-shaking and code splitting to minimize bundle size.
4. Document minimum iOS/Android version requirements.

</details>

<details>
<summary><strong>Publish runnable example app</strong></summary>

1. Ensure sample React Native app can be cloned and run without extra setup.
2. Include integration steps mirroring partner's phase 1 flow.
3. Link the example in `PARTNER_FEEDBACK.md` for easy discovery.
4. Add comprehensive error handling and logging examples.
5. Include device compatibility testing instructions.

</details>

## Infrastructure & notifications

<details>
<summary><strong>Provide proof callback hook</strong></summary>

1. Expose an API for sending proof completion callbacks to a partner server.
2. Add docs showing how a partner can trigger push notifications when callbacks fire.
3. Include timeout and retry guidance.
4. Implement secure callback authentication with HMAC signatures.
5. Add webhook signature verification for callback security.
6. Provide rate limiting and circuit breaker patterns for callback delivery.

</details>
