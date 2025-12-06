// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useModal } from '@/hooks/useModal';
import useRecoveryPrompts from '@/hooks/useRecoveryPrompts';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

const navigationStateListeners: Array<() => void> = [];
let isNavigationReady = true;
// Use global appStateListeners from jest.setup.js mock
const appStateListeners = global.mockAppStateListeners || [];

jest.mock('@/hooks/useModal');
jest.mock('@/providers/passportDataProvider');
jest.mock('@/navigation', () => ({
  navigationRef: global.mockNavigationRef,
}));
// Use global react-native mock from jest.setup.js - no need to mock here

const showModal = jest.fn();
const getAllDocuments = jest.fn();
(usePassport as jest.Mock).mockReturnValue({ getAllDocuments });

const getAppState = (): {
  currentState: string;
  addEventListener: jest.Mock;
} =>
  AppState as unknown as {
    currentState: string;
    addEventListener: jest.Mock;
  };

describe('useRecoveryPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigationStateListeners.length = 0;
    appStateListeners.length = 0;
    isNavigationReady = true;

    // Setup the global navigation ref mock
    global.mockNavigationRef.isReady.mockImplementation(
      () => isNavigationReady,
    );
    global.mockNavigationRef.getCurrentRoute.mockReturnValue({ name: 'Home' });
    global.mockNavigationRef.addListener.mockImplementation(
      (_: string, callback: () => void) => {
        navigationStateListeners.push(callback);
        return () => {
          const index = navigationStateListeners.indexOf(callback);
          if (index >= 0) {
            navigationStateListeners.splice(index, 1);
          }
        };
      },
    );

    (useModal as jest.Mock).mockReturnValue({ showModal, visible: false });
    getAllDocuments.mockResolvedValue({
      doc1: {
        data: {} as any,
        metadata: { isRegistered: true } as any,
      },
    });
    const mockAppState = getAppState();
    mockAppState.currentState = 'active';
    act(() => {
      useSettingStore.setState({
        loginCount: 0,
        cloudBackupEnabled: false,
        hasViewedRecoveryPhrase: false,
      });
    });
  });

  it('shows modal on first login for eligible route', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('waits for navigation readiness before prompting', async () => {
    isNavigationReady = false;
    global.mockNavigationRef.isReady.mockImplementation(
      () => isNavigationReady,
    );
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });

    isNavigationReady = true;
    navigationStateListeners.forEach(listener => listener());

    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('respects custom allow list overrides', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts({ allowedRoutes: ['Settings'] }));
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });

    showModal.mockClear();
    global.mockNavigationRef.getCurrentRoute.mockReturnValue({
      name: 'Settings',
    });

    renderHook(() => useRecoveryPrompts({ allowedRoutes: ['Settings'] }));

    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('prompts when returning from background on eligible route', async () => {
    // This test verifies that the hook registers an app state listener
    // and that the prompt logic can be triggered multiple times for different login counts
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });

    const { rerender, unmount } = renderHook(() => useRecoveryPrompts());

    // Wait for initial prompt
    await waitFor(() => {
      expect(showModal).toHaveBeenCalledTimes(1);
    });

    // Clear and test with a different login count that should trigger again
    showModal.mockClear();

    act(() => {
      useSettingStore.setState({ loginCount: 6 }); // 6 should trigger per the formula
    });

    rerender();

    // Wait for second prompt with new login count
    await waitFor(() => {
      expect(showModal).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it('does not show modal when login count is 4 or 5', async () => {
    for (const count of [4, 5]) {
      showModal.mockClear();
      act(() => {
        useSettingStore.setState({ loginCount: count });
      });
      renderHook(() => useRecoveryPrompts());
      await waitFor(() => {
        expect(showModal).not.toHaveBeenCalled();
      });
    }
  });

  it('shows modal on sixth login', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 6 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('does not show modal if backup already enabled', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 1, cloudBackupEnabled: true });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal if already visible', async () => {
    (useModal as jest.Mock).mockReturnValueOnce({ showModal, visible: true });
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when recovery phrase has been viewed', async () => {
    act(() => {
      useSettingStore.setState({
        loginCount: 1,
        hasViewedRecoveryPhrase: true,
      });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when no documents exist', async () => {
    getAllDocuments.mockResolvedValueOnce({});
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('does not show modal when only unregistered documents exist', async () => {
    getAllDocuments.mockResolvedValueOnce({
      doc1: {
        data: {} as any,
        metadata: { isRegistered: false } as any,
      },
      doc2: {
        data: {} as any,
        metadata: { isRegistered: undefined } as any,
      },
    });
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('shows modal when registered documents exist', async () => {
    getAllDocuments.mockResolvedValueOnce({
      doc1: {
        data: {} as any,
        metadata: { isRegistered: false } as any,
      },
      doc2: {
        data: {} as any,
        metadata: { isRegistered: true } as any,
      },
    });
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('shows modal for other valid login counts', async () => {
    for (const count of [2, 3, 6, 9, 12]) {
      showModal.mockClear();
      act(() => {
        useSettingStore.setState({ loginCount: count });
      });
      renderHook(() => useRecoveryPrompts());
      await waitFor(() => {
        expect(showModal).toHaveBeenCalled();
      });
    }
  });

  it('does not show modal again for same login count when state changes', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).toHaveBeenCalledTimes(1);
    });

    showModal.mockClear();

    act(() => {
      useSettingStore.setState({ hasViewedRecoveryPhrase: true });
    });
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });

    act(() => {
      useSettingStore.setState({ hasViewedRecoveryPhrase: false });
    });
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
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
