// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BiometricHandler } from '../handlers/BiometricHandler';
import type { BiometricsModuleConstructor } from '../handlers/BiometricHandler';

const mockIsSensorAvailable = vi.fn();
const mockSimplePrompt = vi.fn();

const MockBiometrics: BiometricsModuleConstructor = class {
  isSensorAvailable = mockIsSensorAvailable;
  simplePrompt = mockSimplePrompt;
} as unknown as BiometricsModuleConstructor;

describe('BiometricHandler', () => {
  let handler: BiometricHandler;

  beforeEach(() => {
    handler = new BiometricHandler(MockBiometrics);
    vi.clearAllMocks();
  });

  it('has domain "biometrics"', () => {
    expect(handler.domain).toBe('biometrics');
  });

  describe('authenticate', () => {
    it('returns true when biometric succeeds', async () => {
      mockSimplePrompt.mockResolvedValue({ success: true });

      const result = await handler.handle('authenticate', { reason: 'Confirm identity' });
      expect(result).toBe(true);
      expect(mockSimplePrompt).toHaveBeenCalledWith({ promptMessage: 'Confirm identity' });
    });

    it('throws BIOMETRIC_FAILED when user cancels', async () => {
      mockSimplePrompt.mockResolvedValue({ success: false });

      try {
        await handler.handle('authenticate', { reason: 'Test' });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('BIOMETRIC_FAILED');
        expect((err as Error).message).toBe('Biometric authentication failed');
      }
    });
  });

  describe('isAvailable', () => {
    it('returns true when sensor available', async () => {
      mockIsSensorAvailable.mockResolvedValue({ available: true, biometryType: 'FaceID' });

      const result = await handler.handle('isAvailable', {});
      expect(result).toBe(true);
    });

    it('returns false when no biometrics', async () => {
      mockIsSensorAvailable.mockResolvedValue({ available: false, biometryType: undefined });

      const result = await handler.handle('isAvailable', {});
      expect(result).toBe(false);
    });
  });

  describe('getBiometryType', () => {
    it('returns biometry type string', async () => {
      mockIsSensorAvailable.mockResolvedValue({ available: true, biometryType: 'TouchID' });

      const result = await handler.handle('getBiometryType', {});
      expect(result).toBe('TouchID');
    });

    it('returns "none" when no biometry type', async () => {
      mockIsSensorAvailable.mockResolvedValue({ available: false, biometryType: undefined });

      const result = await handler.handle('getBiometryType', {});
      expect(result).toBe('none');
    });
  });

  describe('unknown method', () => {
    it('throws METHOD_NOT_FOUND', async () => {
      await expect(handler.handle('enroll', {})).rejects.toThrow('Unknown biometrics method: enroll');
    });
  });
});
