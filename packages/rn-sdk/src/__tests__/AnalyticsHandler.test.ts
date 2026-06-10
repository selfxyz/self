// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsHandler, type AnalyticsSink } from '../handlers/AnalyticsHandler';

describe('AnalyticsHandler', () => {
  let sink: AnalyticsSink;
  let handler: AnalyticsHandler;

  beforeEach(() => {
    sink = {
      trackEvent: vi.fn(),
      trackNfcEvent: vi.fn(),
      logNfcEvent: vi.fn(),
    };
    handler = new AnalyticsHandler(sink);
  });

  it('has domain "analytics"', () => {
    expect(handler.domain).toBe('analytics');
  });

  it('routes trackEvent to the sink with payload', async () => {
    const result = await handler.handle('trackEvent', {
      event: 'Onboarding: Started',
      payload: { initial_branch: 'biometric_passport' },
    });

    expect(result).toBeNull();
    expect(sink.trackEvent).toHaveBeenCalledWith(
      'Onboarding: Started',
      { initial_branch: 'biometric_passport' },
    );
  });

  it('throws MISSING_EVENT when event name is missing', async () => {
    await expect(handler.handle('trackEvent', {})).rejects.toMatchObject({
      code: 'MISSING_EVENT',
    });
  });

  it('routes trackNfcEvent to the sink', async () => {
    await handler.handle('trackNfcEvent', {
      name: 'NFC: Connected',
      properties: { rssi: -45 },
    });

    expect(sink.trackNfcEvent).toHaveBeenCalledWith('NFC: Connected', { rssi: -45 });
  });

  it('routes logNfcEvent with defaults when fields missing', async () => {
    await handler.handle('logNfcEvent', { message: 'reading dg1' });

    expect(sink.logNfcEvent).toHaveBeenCalledWith('info', 'reading dg1', {}, undefined);
  });

  it('throws METHOD_NOT_FOUND for unknown method', async () => {
    await expect(handler.handle('explode', {})).rejects.toMatchObject({
      code: 'METHOD_NOT_FOUND',
    });
  });

  it('is a safe no-op when no sink is wired', async () => {
    const noSinkHandler = new AnalyticsHandler();
    const result = await noSinkHandler.handle('trackEvent', {
      event: 'test',
      payload: {},
    });
    expect(result).toBeNull();
  });
});
