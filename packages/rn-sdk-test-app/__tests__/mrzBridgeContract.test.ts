// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { NativeModules } from 'react-native';

const mockStartScanning = jest.fn();

describe('SelfMRZScannerModule bridge contract', () => {
  const startScanning = () =>
    NativeModules.SelfMRZScannerModule.startScanning() as Promise<{
      documentNumber: string;
      dateOfBirth: string;
      dateOfExpiry: string;
    }>;

  beforeEach(() => {
    jest.clearAllMocks();
    (NativeModules as any).SelfMRZScannerModule = {
      startScanning: mockStartScanning,
    };
  });

  it('resolves with required success payload keys', async () => {
    mockStartScanning.mockResolvedValue({
      documentNumber: 'L898902C3',
      dateOfBirth: '640812',
      dateOfExpiry: '251031',
    });

    const result = await startScanning();

    expect(result).toEqual({
      documentNumber: 'L898902C3',
      dateOfBirth: '640812',
      dateOfExpiry: '251031',
    });
    expect(Object.keys(result).sort()).toEqual([
      'dateOfBirth',
      'dateOfExpiry',
      'documentNumber',
    ]);
  });

  it.each([
    ['MRZ_SCAN_CANCELLED', 'MRZ scanning cancelled'],
    ['MRZ_SCAN_FAILED', 'MRZ scan failed'],
    ['MRZ_SCAN_INVALID_RESULT', 'MRZ result missing required fields'],
    ['MRZ_SCAN_IN_PROGRESS', 'MRZ scanning already in progress'],
    ['CAMERA_PERMISSION_DENIED', 'Camera permission denied'],
    ['CAMERA_INIT_FAILED', 'Failed to initialize camera session'],
  ])('rejects with %s', async (code, message) => {
    mockStartScanning.mockRejectedValueOnce({ code, message });

    await expect(startScanning()).rejects.toMatchObject({ code, message });
  });
});
