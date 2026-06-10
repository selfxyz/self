// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi } from 'vitest';
import { NavigationHandler } from '../handlers/NavigationHandler';

describe('NavigationHandler', () => {
  it('has domain "navigation"', () => {
    const handler = new NavigationHandler();
    expect(handler.domain).toBe('navigation');
  });

  it('returns handled=false when no callback is registered for goBack', async () => {
    const handler = new NavigationHandler();
    const result = await handler.handle('goBack', {});
    expect(result).toEqual({ handled: false });
  });

  it('returns handled=true when the goBack callback claims it', async () => {
    const onGoBack = vi.fn().mockReturnValue(true);
    const handler = new NavigationHandler({ onGoBack });

    const result = await handler.handle('goBack', {});
    expect(result).toEqual({ handled: true });
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it('passes the route name and params through to onGoTo', async () => {
    const onGoTo = vi.fn().mockReturnValue(true);
    const handler = new NavigationHandler({ onGoTo });

    const result = await handler.handle('goTo', {
      routeName: 'Settings',
      params: { tab: 'security' },
    });

    expect(result).toEqual({ handled: true });
    expect(onGoTo).toHaveBeenCalledWith('Settings', { tab: 'security' });
  });

  it('throws MISSING_ROUTE when routeName is absent', async () => {
    const handler = new NavigationHandler({ onGoTo: vi.fn() });
    await expect(handler.handle('goTo', {})).rejects.toMatchObject({
      code: 'MISSING_ROUTE',
    });
  });

  it('throws METHOD_NOT_FOUND for unknown method', async () => {
    const handler = new NavigationHandler();
    await expect(handler.handle('teleport', {})).rejects.toMatchObject({
      code: 'METHOD_NOT_FOUND',
    });
  });
});
