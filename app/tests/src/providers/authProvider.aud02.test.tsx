// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * AUD-02 characterization tests — these pin CURRENT (including buggy) behavior
 * of the secret write paths so a remediation PR has a regression baseline.
 * See docs/reviews/2026-06-17-key-material-keychain-audit.md.
 */

import Keychain from 'react-native-keychain';

import { unsafe_getPrivateKey } from '@/providers/authProvider';

// Keep authProvider's module graph light: the keychain options builder and
// telemetry are not under test here.
jest.mock('@/integrations/keychain', () => ({
  createKeychainOptions: jest.fn(async () => ({
    getOptions: {},
    setOptions: { accessible: 'AccessibleWhenPasscodeSetThisDeviceOnly' },
  })),
  detectSecurityCapabilities: jest.fn(async () => ({
    hasPasscode: true,
    hasSecureHardware: true,
    supportsBiometrics: true,
    maxSecurityLevel: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  })),
}));

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
  logAuthEvent: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;

describe('AUD-02 F-02: legacy-format parse failure overwrites the stored secret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setGenericPassword.mockResolvedValue(true);
  });

  it('overwrites a present-but-unparseable (legacy raw-key) secret with a new mnemonic', async () => {
    // Simulate the pre-#201 on-disk format: a raw private-key string, which is
    // truthy but not valid JSON. A placeholder stands in for the real hex key
    // (the test only needs a non-JSON value to drive the parse-failure path).
    const legacyRawKey = 'legacy-raw-private-key-string-not-json';
    getGenericPassword.mockResolvedValue({
      username: 'secret',
      password: legacyRawKey,
      service: 'secret',
    });

    const privateKey = await unsafe_getPrivateKey();

    // CURRENT BEHAVIOR (the bug): the unparseable entry falls through to the
    // create block, which writes a NEW random mnemonic over service 'secret'.
    expect(setGenericPassword).toHaveBeenCalledTimes(1);
    const [, writtenData] = setGenericPassword.mock.calls[0];
    // The overwrite stores a JSON mnemonic, not the legacy raw key.
    expect(writtenData).not.toEqual(legacyRawKey);
    expect(() => JSON.parse(writtenData)).not.toThrow();
    expect(JSON.parse(writtenData)).toHaveProperty('phrase');

    // The returned key is derived from the freshly created mnemonic — the
    // original key is gone (unrecoverable).
    expect(privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/);

    // REMEDIATION FLIP: when F-02 is fixed, the code must NOT overwrite a
    // present secret on parse failure. Update this assertion to
    // expect(setGenericPassword).not.toHaveBeenCalled() and expect a thrown
    // error instead.
  });

  it('does NOT overwrite when the stored secret is a valid JSON mnemonic', async () => {
    // Contrast case: a well-formed stored mnemonic is returned as-is.
    const validMnemonic = {
      phrase:
        'test test test test test test test test test test test junk',
      password: '',
      wordlist: { locale: 'en' },
      entropy: '0x00000000000000000000000000000000',
    };
    getGenericPassword.mockResolvedValue({
      username: 'secret',
      password: JSON.stringify(validMnemonic),
      service: 'secret',
    });

    await unsafe_getPrivateKey();

    expect(setGenericPassword).not.toHaveBeenCalled();
  });
});
