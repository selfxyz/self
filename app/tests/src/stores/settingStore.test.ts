// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useSettingStore } from '../../../src/stores/settingStore';

import { act } from '@testing-library/react-native';

describe('settingStore', () => {
  beforeEach(() => {
    act(() => {
      useSettingStore.setState({
        loginCount: 0,
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
      });
    });
  });

  it('increments login count', () => {
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(1);
  });

  it('increments login count multiple times', () => {
    useSettingStore.getState().incrementLoginCount();
    useSettingStore.getState().incrementLoginCount();
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(3);
  });

  it('increments login count from non-zero initial value', () => {
    act(() => {
      useSettingStore.setState({ loginCount: 5 });
    });
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(6);
  });

  it('resets login count when recovery phrase viewed', () => {
    act(() => {
      useSettingStore.setState({ loginCount: 2 });
    });
    useSettingStore.getState().setHasViewedRecoveryPhrase(true);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });

  it('does not reset login count when setting recovery phrase viewed to false', () => {
    act(() => {
      useSettingStore.setState({
        loginCount: 3,
        hasViewedRecoveryPhrase: true,
      });
    });
    useSettingStore.getState().setHasViewedRecoveryPhrase(false);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(false);
    expect(useSettingStore.getState().loginCount).toBe(3);
  });

  it('resets login count when enabling cloud backup', () => {
    act(() => {
      useSettingStore.setState({ loginCount: 3, cloudBackupEnabled: false });
    });
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });

  it('does not reset login count when disabling cloud backup', () => {
    act(() => {
      useSettingStore.setState({ loginCount: 4, cloudBackupEnabled: true });
    });
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(false);
    expect(useSettingStore.getState().loginCount).toBe(4);
  });

  it('handles sequential actions that reset login count', () => {
    // Increment login count
    useSettingStore.getState().incrementLoginCount();
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(2);

    // Toggle cloud backup (should reset to 0)
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);

    // Increment again
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(1);

    // Set recovery phrase viewed (should reset to 0)
    useSettingStore.getState().setHasViewedRecoveryPhrase(true);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });

  it('does not reset login count when setting recovery phrase viewed to true when already true', () => {
    act(() => {
      useSettingStore.setState({
        loginCount: 5,
        hasViewedRecoveryPhrase: true,
      });
    });
    useSettingStore.getState().setHasViewedRecoveryPhrase(true);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(5);
  });

  it('handles complex sequence of mixed operations', () => {
    // Start with some increments
    useSettingStore.getState().incrementLoginCount();
    useSettingStore.getState().incrementLoginCount();
    useSettingStore.getState().incrementLoginCount();
    expect(useSettingStore.getState().loginCount).toBe(3);

    // Disable cloud backup (should not reset)
    act(() => {
      useSettingStore.setState({ cloudBackupEnabled: true });
    });
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(false);
    expect(useSettingStore.getState().loginCount).toBe(3);

    // Set recovery phrase viewed to false (should not reset)
    act(() => {
      useSettingStore.setState({ hasViewedRecoveryPhrase: true });
    });
    useSettingStore.getState().setHasViewedRecoveryPhrase(false);
    expect(useSettingStore.getState().hasViewedRecoveryPhrase).toBe(false);
    expect(useSettingStore.getState().loginCount).toBe(3);

    // Enable cloud backup (should reset)
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });

  it('maintains login count when toggling cloud backup from true to false then back to true', () => {
    // Start with cloud backup enabled and some login count
    act(() => {
      useSettingStore.setState({ loginCount: 2, cloudBackupEnabled: true });
    });

    // Toggle to disable (should not reset)
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(false);
    expect(useSettingStore.getState().loginCount).toBe(2);

    // Toggle to enable (should reset)
    useSettingStore.getState().toggleCloudBackupEnabled();
    expect(useSettingStore.getState().cloudBackupEnabled).toBe(true);
    expect(useSettingStore.getState().loginCount).toBe(0);
  });
});
