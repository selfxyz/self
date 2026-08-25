// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { authorize } from 'react-native-app-auth';

import { isCloudBackupError } from '@/services/cloud-backup/errors';
import { googleSignIn } from '@/services/cloud-backup/google';

// Rejections shaped like react-native-app-auth's native promise.reject(code, message).
function nativeAuthError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

describe('googleSignIn', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns the authorization result on success', async () => {
    (authorize as jest.Mock).mockResolvedValue({ accessToken: 'token' });

    await expect(googleSignIn()).resolves.toEqual({ accessToken: 'token' });
  });

  it('returns null when the user dismisses the sign-in flow', async () => {
    (authorize as jest.Mock).mockRejectedValue(
      nativeAuthError('User cancelled flow', 'authentication_error'),
    );

    await expect(googleSignIn()).resolves.toBeNull();
  });

  it('returns null when the user denies consent', async () => {
    (authorize as jest.Mock).mockRejectedValue(
      nativeAuthError('access_denied', 'access_denied'),
    );

    await expect(googleSignIn()).resolves.toBeNull();
  });

  it.each([
    ['browser_not_found', 'No suitable browser found'],
    ['service_configuration_fetch_error', 'Failed to fetch configuration'],
    // Network failures share the cancel code but not the cancel message, so
    // they must surface as failures rather than hide behind "cancelled".
    ['authentication_error', 'Network error'],
  ])('rethrows %s as a typed sign-in failure', async (code, message) => {
    const cause = nativeAuthError(message, code);
    (authorize as jest.Mock).mockRejectedValue(cause);

    const rejection = await googleSignIn().then(
      () => {
        throw new Error('expected googleSignIn to reject');
      },
      (error: unknown) => error,
    );

    expect(isCloudBackupError(rejection)).toBe(true);
    expect((rejection as { reason: string }).reason).toBe('sign_in_failed');
    expect((rejection as Error).message).toContain(code);
    expect((rejection as { cause?: unknown }).cause).toBe(cause);
  });
});
