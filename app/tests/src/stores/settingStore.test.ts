// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
import { useSettingStore } from '../../../src/stores/settingStore';

describe('settingStore', () => {
  beforeEach(() => {
    useSettingStore.setState({
      loginCount: 0,
      cloudBackupEnabled: false,
      hasViewedRecoveryPhrase: false,
    });
  });

  it('increments login count', () => {
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(1);
  });

  it('resets login count when recovery phrase viewed', () => {
    useSettingStore.setState({ loginCount: 2 });
    useSettingStore.getState().setHasViewedRecoveryPhrase(true);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });

  it('resets login count when enabling cloud backup', () => {
    useSettingStore.setState({ loginCount: 3, cloudBackupEnabled: false });
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });
});
