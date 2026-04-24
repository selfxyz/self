// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

export function useRecoveryCircuitTestFlowEnabled(): boolean {
  const enableRecoveryCircuitTestFlow = useSettingStore(
    state => state.enableRecoveryCircuitTestFlow,
  );

  return IS_DEV_MODE && enableRecoveryCircuitTestFlow;
}
