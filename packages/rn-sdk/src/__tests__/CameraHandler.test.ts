// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { startScanning } = vi.hoisted(() => ({
  startScanning: vi.fn(),
}));

vi.mock('react-native', () => ({
  NativeModules: {
    SelfMRZScannerModule: {
      startScanning,
    },
  },
}));

import { CameraHandler } from '../handlers/CameraHandler';

describe('CameraHandler', () => {
  const handler = new CameraHandler();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has domain "camera"', () => {
    expect(handler.domain).toBe('camera');
  });

  it('isAvailable returns true when native MRZ module is present', async () => {
    const result = await handler.handle('isAvailable', {});
    expect(result).toBe(true);
  });

  it('scanMRZ returns normalized MRZ data', async () => {
    startScanning.mockResolvedValue({
      data: {
        documentNumber: 'L898902C3',
        birthDate: '740812',
        expiryDate: '120415',
        documentType: 'P',
        countryCode: 'UTO',
      },
    });

    await expect(handler.handle('scanMRZ', {})).resolves.toEqual({
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: 'P',
      countryCode: 'UTO',
    });
  });

  it('scanMRZ throws MRZ_SCAN_FAILED when native scanner rejects', async () => {
    startScanning.mockRejectedValue(new Error('Camera permission denied'));

    try {
      await handler.handle('scanMRZ', {});
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe('MRZ_SCAN_FAILED');
      expect((err as Error).message).toBe('Camera permission denied');
    }
  });

  it('unknown method throws METHOD_NOT_FOUND', async () => {
    await expect(handler.handle('foo', {})).rejects.toThrow('Unknown camera method: foo');
  });
});
