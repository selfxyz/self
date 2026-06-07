// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { cleanup, waitFor } from '@testing-library/react';

const REF = 'ref-matrix';

// Failure routes that render the WIA-14 SupportReference footer, reachable
// without flow-specific bridge round-trips (each reads optional location.state).
const FAILURE_ROUTES = [
  '/capture/passport/nfc-error',
  '/capture/eu-id/nfc-error',
  '/capture/aadhaar/upload-error',
  '/register/failure',
  '/recover/failure',
];

describe('WIA-14 support-reference footer matrix', () => {
  afterEach(cleanup);

  it.each(FAILURE_ROUTES)('shows the reference footer on %s when an id is seeded', async route => {
    const result = renderWithBridge({
      initialEntries: [route],
      config: { mode: 'self-app', referenceId: REF },
    });
    await waitFor(() => expect(result.getByText(`Reference: ${REF}`)).toBeTruthy());
  });

  it('does not show the footer on a success route', async () => {
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/nfc-success'],
      config: { mode: 'self-app', referenceId: REF },
    });
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));
    expect(result.queryByText(`Reference: ${REF}`)).toBeNull();
  });

  it('does not show the footer on a failure route when no id is available', async () => {
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/nfc-error'],
      config: { mode: 'self-app' },
    });
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-error'));
    expect(result.queryByText(/^Reference: /)).toBeNull();
  });
});

describe('WIA-13 PrivacyMask presence on PII screens', () => {
  afterEach(cleanup);

  it('masks document data on IDDataScreen', async () => {
    const result = renderWithBridge({ initialEntries: ['/docs/passport-1'] });
    await waitFor(() => {
      const mask = result.container.querySelector('.sentry-mask');
      expect(mask).not.toBeNull();
      // A PII value rendered by the screen lives inside the masked subtree.
      expect(mask?.textContent).toContain('18-299217823');
    });
  });

  it('masks the recovery phrase on RecoveryPhraseScreen', async () => {
    const result = renderWithBridge({ initialEntries: ['/settings/recovery-phrase'] });
    await waitFor(() => expect(result.container.querySelector('.sentry-mask')).not.toBeNull());
  });

  it('masks the phrase input on SecretPhraseInputScreen', async () => {
    const result = renderWithBridge({ initialEntries: ['/recover/phrase-input'] });
    await waitFor(() => expect(result.container.querySelector('.sentry-mask')).not.toBeNull());
  });
});

describe('WIA-16 operating-mode dispatch at a dual-mode path', () => {
  afterEach(cleanup);

  const MOCK_FAILURE_MARKER = 'Mock failure'; // self-app-only dev button on KycFailureScreen

  it('renders the self-app screen when mode is self-app', async () => {
    const result = renderWithBridge({
      initialEntries: ['/disclose/kyc-failure'],
      config: { mode: 'self-app', referenceId: REF },
    });
    await waitFor(() => expect(currentPath(result)).toBe('/disclose/kyc-failure'));
    expect(result.queryByText(MOCK_FAILURE_MARKER)).not.toBeNull();
  });

  it('renders the embed screen when mode is embed', async () => {
    const result = renderWithBridge({
      initialEntries: ['/disclose/kyc-failure'],
      config: { mode: 'embed', verificationRequest: { userId: 'u', scope: 's' }, referenceId: REF },
    });
    // Embed boot succeeds (valid request) so we stay on the dual-mode path,
    // and the embed branch omits the self-app-only mock button.
    await waitFor(() => expect(currentPath(result)).toBe('/disclose/kyc-failure'));
    expect(result.queryByText(MOCK_FAILURE_MARKER)).toBeNull();
  });
});
