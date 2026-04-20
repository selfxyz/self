// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

import {
  copySupportUuid,
  getSupportUuid,
  regenerateSupportUuid,
} from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

export interface UseSupportUuidResult {
  supportUuid: string | null;
  isReady: boolean;
  copy: () => string;
  regenerate: () => string;
}

export function useSupportUuid(): UseSupportUuidResult {
  const supportUuid = useSettingStore(state => state.supportUuid);

  useEffect(() => {
    if (!supportUuid) getSupportUuid();
  }, [supportUuid]);

  return {
    supportUuid,
    isReady: supportUuid != null,
    copy: copySupportUuid,
    regenerate: regenerateSupportUuid,
  };
}
