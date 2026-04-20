// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getStartupNavigationTarget,
  hasStartupRecoverySignal,
} from '@/screens/app/startupRouting';

describe('startupRouting', () => {
  it('routes to recovery when the secret is missing but a registered document still exists', () => {
    expect(
      getStartupNavigationTarget({
        hasPrivacyNoteBeenDismissed: true,
        hasRecoverySignal: false,
        hasSecretStored: false,
        hasValidRegisteredDocument: true,
      }),
    ).toEqual({
      allowQueuedDeepLink: false,
      route: 'AccountRecoveryChoice',
    });
  });

  it('routes to recovery when the secret is missing and recovery signals exist', () => {
    expect(
      getStartupNavigationTarget({
        hasPrivacyNoteBeenDismissed: true,
        hasRecoverySignal: true,
        hasSecretStored: false,
        hasValidRegisteredDocument: false,
      }),
    ).toEqual({
      allowQueuedDeepLink: false,
      route: 'AccountRecoveryChoice',
    });
  });

  it('routes new users without recovery signals to Disclaimer', () => {
    expect(
      getStartupNavigationTarget({
        hasPrivacyNoteBeenDismissed: false,
        hasRecoverySignal: false,
        hasSecretStored: false,
        hasValidRegisteredDocument: false,
      }),
    ).toEqual({
      allowQueuedDeepLink: false,
      route: 'Disclaimer',
    });
  });

  it('routes dismissed-disclaimer users without recovery signals to Home', () => {
    expect(
      getStartupNavigationTarget({
        hasPrivacyNoteBeenDismissed: true,
        hasRecoverySignal: false,
        hasSecretStored: false,
        hasValidRegisteredDocument: false,
      }),
    ).toEqual({
      allowQueuedDeepLink: true,
      route: 'Home',
    });
  });

  it('treats cloud backup, viewed phrase, or stored points address as recovery signals', () => {
    expect(
      hasStartupRecoverySignal({
        cloudBackupEnabled: true,
        hasViewedRecoveryPhrase: false,
        pointsAddress: null,
      }),
    ).toBe(true);
    expect(
      hasStartupRecoverySignal({
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: true,
        pointsAddress: null,
      }),
    ).toBe(true);
    expect(
      hasStartupRecoverySignal({
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
        pointsAddress: '0x123',
      }),
    ).toBe(true);
    expect(
      hasStartupRecoverySignal({
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
        pointsAddress: null,
      }),
    ).toBe(false);
  });
});
