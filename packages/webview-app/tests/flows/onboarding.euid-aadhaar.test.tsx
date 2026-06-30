// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';

const MRZ_FIXTURE = {
  passportNumber: 'EU1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

// The eu-id viewfinder validates documentNumber/dateOfBirth/dateOfExpiry on the scan
// result, so the scanMRZ fixture must carry documentNumber (not passportNumber).
const EUID_MRZ_SCAN = {
  documentNumber: 'EU1234567',
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

  it('EU-ID viewfinder surfaces native scan progress, then advances on MRZ result', async () => {
    let resolveScan!: (value: typeof EUID_MRZ_SCAN) => void;
    const result = renderWithBridge({
      initialEntries: ['/capture/eu-id/code-scan-viewfinder'],
      setupHandlers: mock => {
        mock.handle('camera', 'scanMRZ', () => new Promise<typeof EUID_MRZ_SCAN>(resolve => (resolveScan = resolve)));
      },
    });

    expect(result.getByRole('status').textContent).toContain('Opening the document scanner');

    act(() => result.mock.pushEvent('camera', 'scanProgress', { state: 'mrz_detected', message: 'Got the MRZ!' }));
    await waitFor(() => expect(result.getByRole('status').textContent).toContain('Got the MRZ!'));

    act(() => resolveScan(EUID_MRZ_SCAN));
    await waitFor(() => expect(currentPath(result)).toBe('/capture/eu-id/nfc-instructions'));
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
