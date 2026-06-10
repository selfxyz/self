// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HapticHandler, type HapticModule } from '../handlers/HapticHandler';

describe('HapticHandler', () => {
  let haptics: HapticModule;
  let handler: HapticHandler;

  beforeEach(() => {
    haptics = { trigger: vi.fn() };
    handler = new HapticHandler(haptics);
  });

  it('has domain "haptic"', () => {
    expect(handler.domain).toBe('haptic');
  });

  it('triggers with the requested feedback type', async () => {
    await handler.handle('trigger', { type: 'notificationSuccess' });
    expect(haptics.trigger).toHaveBeenCalledWith(
      'notificationSuccess',
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('defaults to selection when no type is provided', async () => {
    await handler.handle('trigger', {});
    expect(haptics.trigger).toHaveBeenCalledWith('selection', expect.any(Object));
  });

  it('throws INVALID_PARAMS for unknown haptic type', async () => {
    await expect(handler.handle('trigger', { type: 'rumble' })).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
    });
    expect(haptics.trigger).not.toHaveBeenCalled();
  });

  it('throws METHOD_NOT_FOUND for unknown method', async () => {
    await expect(handler.handle('explode', {})).rejects.toMatchObject({
      code: 'METHOD_NOT_FOUND',
    });
  });

  it('is a silent no-op when the haptic library is missing', async () => {
    const noLibHandler = new HapticHandler();
    const result = await noLibHandler.handle('trigger', { type: 'selection' });
    expect(result).toBeNull();
  });

  it('does not propagate underlying library failures', async () => {
    (haptics.trigger as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('vibrator unavailable');
    });
    const result = await handler.handle('trigger', { type: 'selection' });
    expect(result).toBeNull();
  });
});
