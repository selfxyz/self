// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi } from 'vitest';
import { LifecycleHandler } from '../handlers/LifecycleHandler';

function createHandler(overrides = {}) {
  const config = {
    request: { userId: 'user-1', scope: 'test', disclosures: ['nationality'] },
    onSuccess: vi.fn(),
    onFailure: vi.fn(),
    onCancelled: vi.fn(),
    debug: false,
    ...overrides,
  };
  return { handler: new LifecycleHandler(config), ...config };
}

describe('LifecycleHandler', () => {
  it('has domain "lifecycle"', () => {
    const { handler } = createHandler();
    expect(handler.domain).toBe('lifecycle');
  });

  describe('ready', () => {
    it('returns null', async () => {
      const { handler } = createHandler();
      const result = await handler.handle('ready', {});
      expect(result).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('returns mode, verification request, debug flag, and platform', async () => {
      const { handler } = createHandler({ debug: true, mode: 'embed' });
      const result = await handler.handle('getConfig', {});
      expect(result).toEqual({
        mode: 'embed',
        verificationRequest: { userId: 'user-1', scope: 'test', disclosures: ['nationality'] },
        debug: true,
        platform: 'react-native',
      });
    });

    it('defaults mode to "self-app" when not specified', async () => {
      const { handler } = createHandler();
      const result = await handler.handle('getConfig', {}) as Record<string, unknown>;
      expect(result.mode).toBe('self-app');
    });

    it('returns empty request when none provided', async () => {
      const { handler } = createHandler({ request: {} });
      const result = await handler.handle('getConfig', {}) as Record<string, unknown>;
      expect(result).toEqual({
        mode: 'self-app',
        verificationRequest: {},
        debug: false,
        platform: 'react-native',
      });
    });
  });

  describe('setResult', () => {
    it('calls onSuccess with flat params when success=true', async () => {
      const { handler, onSuccess } = createHandler();
      await handler.handle('setResult', {
        success: true,
        userId: 'user-1',
        verificationId: 'vid-1',
        proof: { zk: true },
        claims: { age_over_18: true },
      });

      expect(onSuccess).toHaveBeenCalledWith({
        success: true,
        userId: 'user-1',
        verificationId: 'vid-1',
        proof: { zk: true },
        claims: { age_over_18: true },
      });
    });

    it('calls onFailure when success=false with error code', async () => {
      const { handler, onFailure } = createHandler();
      await handler.handle('setResult', {
        success: false,
        errorCode: 'TIMEOUT',
        errorMessage: 'NFC read timed out',
      });

      expect(onFailure).toHaveBeenCalledWith({
        code: 'TIMEOUT',
        message: 'NFC read timed out',
      });
    });

    it('calls onSuccess for flat payload with type field', async () => {
      const { handler, onSuccess } = createHandler();
      await handler.handle('setResult', { type: 'proofRequested' });

      expect(onSuccess).toHaveBeenCalledWith({
        success: true,
        userId: undefined,
        verificationId: undefined,
        proof: undefined,
        claims: undefined,
      });
    });

    it('calls onSuccess for documentOwnershipConfirmed flat payload', async () => {
      const { handler, onSuccess } = createHandler();
      await handler.handle('setResult', { type: 'documentOwnershipConfirmed' });

      expect(onSuccess).toHaveBeenCalledWith({
        success: true,
        userId: undefined,
        verificationId: undefined,
        proof: undefined,
        claims: undefined,
      });
    });

    it('calls onCancelled when neither success, type, nor error code', async () => {
      const { handler, onCancelled } = createHandler();
      await handler.handle('setResult', {});

      expect(onCancelled).toHaveBeenCalled();
    });
  });

  describe('dismiss', () => {
    it('calls onCancelled', async () => {
      const { handler, onCancelled } = createHandler();
      await handler.handle('dismiss', {});
      expect(onCancelled).toHaveBeenCalled();
    });
  });

  describe('unknown method', () => {
    it('throws BridgeHandlerError', async () => {
      const { handler } = createHandler();
      await expect(handler.handle('unknown', {})).rejects.toThrow('Unknown lifecycle method: unknown');
    });
  });
});
