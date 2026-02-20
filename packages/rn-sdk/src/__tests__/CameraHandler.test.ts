// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect } from 'vitest';
import { CameraHandler } from '../handlers/CameraHandler';

describe('CameraHandler', () => {
  const handler = new CameraHandler();

  it('has domain "camera"', () => {
    expect(handler.domain).toBe('camera');
  });

  it('isAvailable returns true', async () => {
    const result = await handler.handle('isAvailable', {});
    expect(result).toBe(true);
  });

  it('scanMRZ throws NOT_IMPLEMENTED', async () => {
    await expect(handler.handle('scanMRZ', {})).rejects.toThrow('MRZ scan not yet implemented');
  });

  it('unknown method throws METHOD_NOT_FOUND', async () => {
    await expect(handler.handle('foo', {})).rejects.toThrow('Unknown camera method: foo');
  });
});
