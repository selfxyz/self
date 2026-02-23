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

  it('returns handlers for all five domains', () => {
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
    expect(domains).toEqual(['biometrics', 'camera', 'lifecycle', 'nfc', 'secureStorage']);
  });
});
