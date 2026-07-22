// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import {
  SELF_PASSPORT_READER_MODULE_NAME,
  getSelfPassportReader,
  isPassportReaderUsable,
  isSelfPassportReaderAvailable,
  resolveSelfPassportReader,
} from './index';

describe('SelfPassportReader resolution', () => {
  it('module name matches the contract NfcHandler resolves', () => {
    expect(SELF_PASSPORT_READER_MODULE_NAME).toBe('SelfPassportReader');
  });

  it('resolves an Android-shaped module (scan)', () => {
    const scan = vi.fn().mockResolvedValue('{}');
    const mod = resolveSelfPassportReader({ SelfPassportReader: { scan } });
    expect(mod?.scan).toBe(scan);
    expect(isPassportReaderUsable(mod)).toBe(true);
  });

  it('resolves an iOS-shaped module (scanPassport)', () => {
    const scanPassport = vi.fn().mockResolvedValue('{}');
    const mod = resolveSelfPassportReader({ SelfPassportReader: { scanPassport } });
    expect(mod?.scanPassport).toBe(scanPassport);
    expect(isPassportReaderUsable(mod)).toBe(true);
  });

  it('returns undefined when the module is absent', () => {
    expect(resolveSelfPassportReader({})).toBeUndefined();
    expect(resolveSelfPassportReader(undefined)).toBeUndefined();
    expect(isPassportReaderUsable(undefined)).toBe(false);
  });

  it('reports unusable when the module lacks a scan entry point', () => {
    const mod = resolveSelfPassportReader({ SelfPassportReader: {} });
    expect(isPassportReaderUsable(mod)).toBe(false);
  });

  it('getSelfPassportReader is safe outside a React Native runtime', () => {
    expect(getSelfPassportReader()).toBeUndefined();
    expect(isSelfPassportReaderAvailable()).toBe(false);
  });
});
