// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useSettingStore } from '@/stores/settingStore';

describe('settingStore', () => {
  beforeEach(() => {
    useSettingStore.setState({
      enableRecoveryCircuitTestFlow: false,
    });
  });

  it('updates enableRecoveryCircuitTestFlow through the setter', () => {
    useSettingStore.getState().setEnableRecoveryCircuitTestFlow(true);

    expect(useSettingStore.getState().enableRecoveryCircuitTestFlow).toBe(true);
  });
});
