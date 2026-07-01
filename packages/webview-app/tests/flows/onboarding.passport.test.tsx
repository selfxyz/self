// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { act, cleanup, waitFor } from '@testing-library/react';

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

  it('surfaces native scan progress over the viewfinder, then advances on MRZ result', async () => {
    let resolveScan!: (value: typeof MRZ_FIXTURE) => void;
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      setupHandlers: mock => {
        mock.handle('camera', 'scanMRZ', () => new Promise<typeof MRZ_FIXTURE>(resolve => (resolveScan = resolve)));
        mock.handleWith('nfc', 'scanPassport', CHIP_FIXTURE);
      },
    });

    // Native (mock transport, not browser-host) owns the camera, so the overlay renders.
    expect(result.getByRole('status').textContent).toContain('Opening');

    act(() => result.mock.pushEvent('camera', 'scanProgress', { state: 'text_detected', message: 'Reading the MRZ…' }));
    await waitFor(() => expect(result.getByRole('status').textContent).toContain('Reading the MRZ…'));

    act(() => resolveScan(MRZ_FIXTURE));
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));
  });

  it('still navigates when the route re-renders while the native scan is in flight', async () => {
    let resolveScan!: (value: typeof MRZ_FIXTURE) => void;
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      setupHandlers: mock => {
        mock.handle('camera', 'scanMRZ', () => new Promise<typeof MRZ_FIXTURE>(resolve => (resolveScan = resolve)));
        mock.handleWith('nfc', 'scanPassport', CHIP_FIXTURE);
      },
    });

    // Re-render while the scan is still pending. A fresh `location.state ?? {}` used to
    // re-run the scan effect and cancel the in-flight scan; the result would be dropped.
    await waitFor(() => expect(result.getByRole('status')).toBeTruthy());
    act(() => result.forceRerender());

    act(() => resolveScan(MRZ_FIXTURE));
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));
  });

  it('runs MRZ then auto NFC to success under StrictMode setup→cleanup→setup', async () => {
    // StrictMode double-invokes both auto-scan effects (viewfinder MRZ and NfcRoute's
    // NFC). Each uses a start-once guard, so only the first setup starts the native scan;
    // the interleaved cleanup must not cancel that one in-flight scan (a closure
    // `cancelled` boolean did, dropping the result). The viewfinder then hung forever,
    // and the NFC screen — which auto-scans with no manual button — stranded the user on
    // the instructions. A reset-on-setup `cancelledRef` survives the benign cleanup, so
    // both stages complete through to nfc-success.
    let resolveMrz!: (value: typeof MRZ_FIXTURE) => void;
    let resolveNfc!: (value: typeof CHIP_FIXTURE) => void;
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      strictMode: true,
      setupHandlers: mock => {
        mock.handle('camera', 'scanMRZ', () => new Promise<typeof MRZ_FIXTURE>(resolve => (resolveMrz = resolve)));
        mock.handle('nfc', 'scanPassport', () => new Promise<typeof CHIP_FIXTURE>(resolve => (resolveNfc = resolve)));
      },
    });

    await waitFor(() => expect(resolveMrz).toBeTypeOf('function'));
    act(() => resolveMrz(MRZ_FIXTURE));

    // Reaches the auto-NFC screen, then the deferred NFC scan resolves and advances.
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc'));
    await waitFor(() => expect(resolveNfc).toBeTypeOf('function'));
    act(() => resolveNfc(CHIP_FIXTURE));
    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));
  });

  it('incomplete MRZ result routes to the error screen under StrictMode', async () => {
    // Exercises the viewfinder catch branch (missing dateOfExpiry → "Incomplete MRZ
    // result") and its cancelledRef guard: under StrictMode the benign cleanup must not
    // suppress the error navigation either.
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      strictMode: true,
      setupHandlers: mock => {
        mock.handleWith('camera', 'scanMRZ', { documentNumber: 'P1234567', dateOfBirth: '900115' });
      },
    });

    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-error'));
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
