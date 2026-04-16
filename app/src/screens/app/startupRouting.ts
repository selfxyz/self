// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { RootStackParamList } from '@/navigation';

export type StartupNavigationTarget = {
  allowQueuedDeepLink: boolean;
  route: keyof RootStackParamList;
};

type StartupRoutingParams = {
  hasPrivacyNoteBeenDismissed: boolean;
  hasRecoverySignal: boolean;
  hasSecretStored: boolean;
  hasValidRegisteredDocument: boolean;
};

export function getStartupNavigationTarget(
  params: StartupRoutingParams,
): StartupNavigationTarget {
  const {
    hasPrivacyNoteBeenDismissed,
    hasRecoverySignal,
    hasSecretStored,
    hasValidRegisteredDocument,
  } = params;

  if (!hasSecretStored) {
    if (hasValidRegisteredDocument || hasRecoverySignal) {
      return {
        allowQueuedDeepLink: false,
        route: 'AccountRecoveryChoice',
      };
    }

    if (!hasPrivacyNoteBeenDismissed) {
      return {
        allowQueuedDeepLink: false,
        route: 'Disclaimer',
      };
    }
  }

  return {
    allowQueuedDeepLink: true,
    route: 'Home',
  };
}

export function hasStartupRecoverySignal(params: {
  cloudBackupEnabled: boolean;
  hasViewedRecoveryPhrase: boolean;
  pointsAddress: string | null;
}): boolean {
  return (
    params.cloudBackupEnabled ||
    params.hasViewedRecoveryPhrase ||
    params.pointsAddress !== null
  );
}
