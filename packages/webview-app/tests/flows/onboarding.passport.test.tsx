// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { cleanup, waitFor } from '@testing-library/react';

const MRZ_FIXTURE = {
  documentNumber: 'P1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

const CHIP_FIXTURE = { dg1: 'mock-dg1', sod: 'mock-sod' };

describe('passport onboarding flow', () => {
  afterEach(cleanup);

  it('happy path: MRZ scan -> NFC scan -> success route', async () => {
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      setupHandlers: mock => {
        mock.handleWith('camera', 'scanMRZ', MRZ_FIXTURE);
        mock.handleWith('nfc', 'scanPassport', CHIP_FIXTURE);
      },
    });

    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));
  });

  it('NFC failure routes to the error screen and shows the support reference', async () => {
    const result = renderWithBridge({
      initialEntries: [{ pathname: '/capture/passport/nfc', state: { mrz: MRZ_FIXTURE } }],
      config: { mode: 'self-app', referenceId: 'ref-passport-nfc' },
      setupHandlers: mock => {
        mock.handleWithError('nfc', 'scanPassport', { code: 'NFC_READ_FAILED', message: 'chip read failed' });
      },
    });

    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-error'));
    await waitFor(() => expect(result.getByText('Reference: ref-passport-nfc')).toBeTruthy());
  });
});
