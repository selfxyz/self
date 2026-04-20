// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

import {
  copySupportUuid,
  getSupportUuid,
  regenerateSupportUuid,
  setSupportUuidCollectionEnabled,
} from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

export interface UseSupportUuidResult {
  isEnabled: boolean;
  supportUuid: string | null;
  isReady: boolean;
  copy: () => string | null;
  regenerate: () => string | null;
  setEnabled: (enabled: boolean) => string | null;
}

export function useSupportUuid(): UseSupportUuidResult {
  const supportUuidEnabled = useSettingStore(state => state.supportUuidEnabled);
  const supportUuid = useSettingStore(state => state.supportUuid);

  useEffect(() => {
    if (supportUuidEnabled && !supportUuid) getSupportUuid();
  }, [supportUuidEnabled, supportUuid]);

  return {
    isEnabled: supportUuidEnabled,
    supportUuid,
    isReady: !supportUuidEnabled || supportUuid != null,
    copy: copySupportUuid,
    regenerate: regenerateSupportUuid,
    setEnabled: setSupportUuidCollectionEnabled,
  };
}
