// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { consoleAnalyticsAdapter } from '../adapters';

const engineBrowserMocks = vi.hoisted(() => ({
  createIndexedDBDocumentsAdapter: vi.fn(),
  createNoOpHapticAdapter: vi.fn(),
  createWebAnalyticsAdapter: vi.fn(),
  createWebCryptoAdapter: vi.fn(),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => engineBrowserMocks);

describe('consoleAnalyticsAdapter', () => {
  const trackEvent = vi.fn();
  const trackNfcEvent = vi.fn();
  const logNFCEvent = vi.fn();

  beforeEach(() => {
    trackEvent.mockReset();
    trackNfcEvent.mockReset();
    logNFCEvent.mockReset();

    engineBrowserMocks.createWebAnalyticsAdapter.mockReset();
    engineBrowserMocks.createWebAnalyticsAdapter.mockReturnValue({
      trackEvent,
      trackNfcEvent,
      logNFCEvent,
    });
  });

  it('should delegate creation to the engine factory', () => {
    const options = { debug: true, endpoint: 'https://analytics.example.com/events' };

    const adapter = consoleAnalyticsAdapter(options);

    expect(engineBrowserMocks.createWebAnalyticsAdapter).toHaveBeenCalledWith(options);
    expect(adapter.trackEvent).toBe(trackEvent);
  });

  it('should call trackEvent without throwing', () => {
    const adapter = consoleAnalyticsAdapter();

    expect(() => adapter.trackEvent('page_view', { reason: 'test' })).not.toThrow();
    expect(trackEvent).toHaveBeenCalledWith('page_view', { reason: 'test' });
  });

  it('should call trackNfcEvent without throwing', () => {
    const adapter = consoleAnalyticsAdapter();

    expect(() => adapter.trackNfcEvent('scan_started', { device: 'pixel' })).not.toThrow();
    expect(trackNfcEvent).toHaveBeenCalledWith('scan_started', { device: 'pixel' });
  });

  it('should call logNFCEvent without throwing', () => {
    const adapter = consoleAnalyticsAdapter();

    expect(() => adapter.logNFCEvent('info', 'Scan begun', { sessionId: 's1' })).not.toThrow();
    expect(logNFCEvent).toHaveBeenCalledWith('info', 'Scan begun', { sessionId: 's1' });
  });
});
