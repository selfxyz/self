// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebAnalyticsAdapter } from '../../../src/adapters/browser/analytics';
import { AppEvents, OnboardingEvents } from '../../../src/constants/analytics';

describe('createWebAnalyticsAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call trackEvent without throwing', () => {
    const adapter = createWebAnalyticsAdapter();
    // Should not throw — fire-and-forget
    expect(() => adapter.trackEvent!(OnboardingEvents.STARTED, { reason: 'test' })).not.toThrow();
  });

  it('should call trackNfcEvent without throwing', () => {
    const adapter = createWebAnalyticsAdapter();
    expect(() => adapter.trackNfcEvent!('scan_started', { device: 'pixel' })).not.toThrow();
  });

  it('should call logNFCEvent without throwing', () => {
    const adapter = createWebAnalyticsAdapter();
    expect(() => adapter.logNFCEvent!('info', 'Scan begun', { sessionId: 's1' } as any)).not.toThrow();
  });

  it('should log to console when debug is true', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = createWebAnalyticsAdapter({ debug: true });

    adapter.trackEvent!(AppEvents.GET_STARTED);
    expect(spy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({ type: 'event', event: AppEvents.GET_STARTED }),
    );
  });

  it('should POST to endpoint when configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    const adapter = createWebAnalyticsAdapter({ endpoint: 'https://analytics.example.com/events' });

    adapter.trackEvent!(AppEvents.GET_STARTED, { reason: 'test' });

    // fetch is called async, give it a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://analytics.example.com/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should not throw when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const adapter = createWebAnalyticsAdapter({ endpoint: 'https://analytics.example.com/events' });

    // Should not throw
    expect(() => adapter.trackEvent!(AppEvents.GET_STARTED)).not.toThrow();

    // Give the rejected promise time to settle
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
