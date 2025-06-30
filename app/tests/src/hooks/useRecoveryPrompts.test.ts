// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
import { renderHook } from '@testing-library/react-native';

import { useModal } from '../../../src/hooks/useModal';
import useRecoveryPrompts from '../../../src/hooks/useRecoveryPrompts';
import { navigationRef } from '../../../src/navigation';
import { useSettingStore } from '../../../src/stores/settingStore';

jest.mock('../../../src/hooks/useModal');
jest.mock('../../../src/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

const showModal = jest.fn();
(useModal as jest.Mock).mockReturnValue({ showModal, visible: false });

describe('useRecoveryPrompts', () => {
  beforeEach(() => {
    showModal.mockClear();
    useSettingStore.setState({
      loginCount: 0,
      cloudBackupEnabled: false,
      hasViewedRecoveryPhrase: false,
    });
  });

  it('shows modal on first login', () => {
    useSettingStore.getState().incrementLoginCount();
    renderHook(() => useRecoveryPrompts());
    expect(showModal).toHaveBeenCalled();
  });

  it('does not show modal when login count is 4', () => {
    useSettingStore.setState({ loginCount: 4 });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).not.toHaveBeenCalled();
  });

  it('shows modal on eighth login', () => {
    useSettingStore.setState({ loginCount: 8 });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).toHaveBeenCalled();
  });

  it('does not show modal if backup already enabled', () => {
    useSettingStore.setState({ loginCount: 1, cloudBackupEnabled: true });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).not.toHaveBeenCalled();
  });
});
