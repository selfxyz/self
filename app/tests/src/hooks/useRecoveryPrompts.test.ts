// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { renderHook, waitFor } from '@testing-library/react-native';

import { useModal } from '../../../src/hooks/useModal';
import useRecoveryPrompts from '../../../src/hooks/useRecoveryPrompts';
import { usePassport } from '../../../src/providers/passportDataProvider';
import { useSettingStore } from '../../../src/stores/settingStore';

jest.mock('../../../src/hooks/useModal');
jest.mock('../../../src/providers/passportDataProvider');
jest.mock('../../../src/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

const showModal = jest.fn();
(useModal as jest.Mock).mockReturnValue({ showModal, visible: false });
const getAllDocuments = jest.fn();
(usePassport as jest.Mock).mockReturnValue({ getAllDocuments });

describe('useRecoveryPrompts', () => {
  beforeEach(() => {
    showModal.mockClear();
    getAllDocuments.mockResolvedValue({ doc1: {} as any });
    useSettingStore.setState({
      loginCount: 0,
      cloudBackupEnabled: false,
      hasViewedRecoveryPhrase: false,
    });
  });

  it('shows modal on first login', async () => {
    useSettingStore.setState({ loginCount: 1 });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('does not show modal when login count is 4', async () => {
    useSettingStore.setState({ loginCount: 4 });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('shows modal on eighth login', async () => {
    useSettingStore.setState({ loginCount: 8 });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('does not show modal if backup already enabled', async () => {
    useSettingStore.setState({ loginCount: 1, cloudBackupEnabled: true });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when navigation is not ready', async () => {
    const navigationRef = require('../../../src/navigation').navigationRef;
    navigationRef.isReady.mockReturnValueOnce(false);
    useSettingStore.setState({ loginCount: 1 });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when recovery phrase has been viewed', async () => {
    useSettingStore.setState({ loginCount: 1, hasViewedRecoveryPhrase: true });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when no documents exist', async () => {
    getAllDocuments.mockResolvedValueOnce({});
    useSettingStore.setState({ loginCount: 1 });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('shows modal for other valid login counts', async () => {
    for (const count of [2, 3, 13, 18]) {
      showModal.mockClear();
      useSettingStore.setState({ loginCount: count });
      renderHook(() => useRecoveryPrompts());
      await waitFor(() => {
        expect(showModal).toHaveBeenCalled();
      });
    }
  });

  it('returns correct visible state', () => {
    const { result } = renderHook(() => useRecoveryPrompts());
    expect(result.current.visible).toBe(false);
  });

  it('calls useModal with correct parameters', () => {
    renderHook(() => useRecoveryPrompts());
    expect(useModal).toHaveBeenCalledWith({
      titleText: 'Protect your account',
      bodyText:
        'Enable cloud backup or save your recovery phrase so you can recover your account.',
      buttonText: 'Back up now',
      onButtonPress: expect.any(Function),
      onModalDismiss: expect.any(Function),
    });
  });
});
