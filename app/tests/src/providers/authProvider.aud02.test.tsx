// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * AUD-02 F-02 regression tests — assert the FIXED behavior: a present-but-
 * unparseable secret is never overwritten; the failure is surfaced instead.
 * (The audit PR pinned the original buggy behavior; this remediation flips it.)
 * See docs/reviews/2026-06-17-key-material-keychain-audit.md.
 */

import Keychain from 'react-native-keychain';

import {
  hasSecretStored,
  setKeychainCryptoFailureCallback,
  unsafe_getPrivateKey,
} from '@/providers/authProvider';
import { getStartupNavigationTarget } from '@/screens/app/startupRouting';

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

describe('AUD-02 F-02: present-but-unparseable secret is never overwritten', () => {
  const failureCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setGenericPassword.mockResolvedValue(true);
    setKeychainCryptoFailureCallback(failureCallback);
  });

  afterEach(() => {
    setKeychainCryptoFailureCallback(null);
  });

  it('does NOT overwrite a present-but-unparseable secret; fails closed', async () => {
    // A present secret that is not valid JSON (corrupted, or the pre-#201
    // raw-key legacy format). A placeholder stands in for the value; the test
    // only needs a non-JSON string to drive the parse-failure path.
    const unparseableSecret = 'corrupted-or-legacy-raw-secret-not-json';
    getGenericPassword.mockResolvedValue({
      username: 'secret',
      password: unparseableSecret,
      service: 'secret',
    });

    const privateKey = await unsafe_getPrivateKey();

    // FIXED: the existing entry is left intact (no write at all), the call
    // fails closed (null), and the failure is surfaced for recovery routing.
    expect(setGenericPassword).not.toHaveBeenCalled();
    expect(privateKey).toBeNull();
    expect(failureCallback).toHaveBeenCalledWith('crypto_failed');
  });

  it('returns the stored key without rewriting when the secret is valid JSON', async () => {
    const validMnemonic = {
      phrase: 'test test test test test test test test test test test junk',
      password: '',
      wordlist: { locale: 'en' },
      entropy: '0x00000000000000000000000000000000',
    };
    getGenericPassword.mockResolvedValue({
      username: 'secret',
      password: JSON.stringify(validMnemonic),
      service: 'secret',
    });

    const privateKey = await unsafe_getPrivateKey();

    expect(setGenericPassword).not.toHaveBeenCalled();
    expect(privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(failureCallback).not.toHaveBeenCalled();
  });
});

describe('AUD-02 F-07: hasSecretStored distinguishes unreadable from absent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 'unknown' (not 'absent') when the keychain read throws", async () => {
    getGenericPassword.mockRejectedValue(new Error('keystore locked'));
    await expect(hasSecretStored()).resolves.toBe('unknown');
  });

  it("returns 'absent' only when the keychain confirms no entry", async () => {
    getGenericPassword.mockResolvedValue(false);
    await expect(hasSecretStored()).resolves.toBe('absent');
  });

  it("returns 'present' when an entry exists", async () => {
    getGenericPassword.mockResolvedValue({
      username: 'secret',
      password: '{}',
      service: 'secret',
    });
    await expect(hasSecretStored()).resolves.toBe('present');
  });

  it('a transient read error does not route an existing user as a fresh install', async () => {
    getGenericPassword.mockRejectedValue(new Error('keystore locked'));

    const presence = await hasSecretStored();
    // Mirrors SplashScreen's mapping: only an explicit 'absent' is fresh-install.
    const target = getStartupNavigationTarget({
      hasPrivacyNoteBeenDismissed: false,
      hasRecoverySignal: false,
      hasSecretStored: presence !== 'absent',
      hasValidRegisteredDocument: false,
    });

    expect(presence).toBe('unknown');
    expect(target.route).toBe('Home');
  });
});
