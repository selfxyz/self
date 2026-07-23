// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { createHandlers } from '../handlers';
import { MessageRouter } from '../bridge/MessageRouter';
import { NfcHandler } from '../handlers/NfcHandler';

describe('createHandlers', () => {
  it('includes NfcHandler that receives the router reference', () => {
    const router = new MessageRouter({ sendToWebView: vi.fn() });
    const handlers = createHandlers({
      request: {},
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      onCancelled: vi.fn(),
      debug: false,
      router,
    });

    const nfcHandler = handlers.find(h => h.domain === 'nfc');
    expect(nfcHandler).toBeDefined();
    expect(nfcHandler).toBeInstanceOf(NfcHandler);
  });

  it('threads referenceId into the lifecycle handler getConfig', async () => {
    const router = new MessageRouter({ sendToWebView: vi.fn() });
    const handlers = createHandlers({
      request: {},
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      onCancelled: vi.fn(),
      debug: false,
      router,
      referenceId: 'corr-abc',
    });

    const lifecycle = handlers.find(h => h.domain === 'lifecycle');
    const config = (await lifecycle?.handle('getConfig', {})) as Record<string, unknown>;
    expect(config.referenceId).toBe('corr-abc');
  });

  it('advertises capabilities as false when optional native modules are absent', async () => {
    const router = new MessageRouter({ sendToWebView: vi.fn() });
    const handlers = createHandlers({
      request: {},
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      onCancelled: vi.fn(),
      debug: false,
      router,
    });

    const lifecycle = handlers.find(h => h.domain === 'lifecycle');
    const config = (await lifecycle?.handle('getConfig', {})) as Record<string, unknown>;
    expect(config.capabilities).toEqual({
      nfc: false,
      mrzCamera: false,
      biometrics: false,
      secureStorage: false,
    });
  });

  it('returns handlers for all bridge domains', () => {
    const router = new MessageRouter({ sendToWebView: vi.fn() });
    const handlers = createHandlers({
      request: {},
      onSuccess: vi.fn(),
      onFailure: vi.fn(),
      onCancelled: vi.fn(),
      debug: false,
      router,
    });

    const domains = handlers.map(h => h.domain).sort();
    expect(domains).toEqual([
      'analytics',
      'biometrics',
      'camera',
      'crypto',
      'documents',
      'haptic',
      'lifecycle',
      'navigation',
      'nfc',
      'secureStorage',
    ]);
  });
});
