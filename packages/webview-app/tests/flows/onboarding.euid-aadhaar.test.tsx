// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { cleanup, fireEvent, waitFor } from '@testing-library/react';

const MRZ_FIXTURE = {
  passportNumber: 'EU1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

describe('EU-ID and Aadhaar onboarding flows', () => {
  afterEach(cleanup);

  it('EU-ID NFC failure routes to the error screen with the support reference', async () => {
    const result = renderWithBridge({
      initialEntries: [{ pathname: '/capture/eu-id/nfc-instructions', state: { mrz: MRZ_FIXTURE } }],
      config: { mode: 'self-app', referenceId: 'ref-euid-nfc' },
      setupHandlers: mock => {
        mock.handleWithError('nfc', 'scanPassport', { code: 'NFC_READ_FAILED', message: 'chip read failed' });
      },
    });

    fireEvent.click(await waitFor(() => result.getByText('Continue')));

    await waitFor(() => expect(currentPath(result)).toBe('/capture/eu-id/nfc-error'));
    await waitFor(() => expect(result.getByText('Reference: ref-euid-nfc')).toBeTruthy());
  });

  it('Aadhaar upload with no native handler routes to the upload-error screen with the footer', async () => {
    const result = renderWithBridge({
      initialEntries: ['/capture/aadhaar/instructions'],
      config: { mode: 'self-app', referenceId: 'ref-aadhaar' },
      // No camera/aadhaarUploadFromLibrary handler: the bridge replies NO_HANDLER,
      // which is the shipped placeholder failure mode until a native handler exists.
    });

    fireEvent.click(await waitFor(() => result.getByText('Upload')));

    await waitFor(() => expect(currentPath(result)).toBe('/capture/aadhaar/upload-error'));
    await waitFor(() => expect(result.getByText('Reference: ref-aadhaar')).toBeTruthy());
  });
});
