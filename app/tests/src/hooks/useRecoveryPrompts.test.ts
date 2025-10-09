// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

const navigationStateListeners: Array<() => void> = [];
let isNavigationReady = true;
const navigationRef = {
  isReady: jest.fn(() => isNavigationReady),
  navigate: jest.fn(),
  addListener: jest.fn((_: string, callback: () => void) => {
    navigationStateListeners.push(callback);
    return () => {
      const index = navigationStateListeners.indexOf(callback);
      if (index >= 0) {
        navigationStateListeners.splice(index, 1);
      }
    };
  }),
  getCurrentRoute: jest.fn(() => ({ name: 'Home' })),
} as any;

const appStateListeners: Array<(state: string) => void> = [];

jest.mock('@/hooks/useModal');
jest.mock('@/providers/passportDataProvider');
jest.mock('@/navigation', () => ({
  navigationRef,
}));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn((_: string, handler: (state: string) => void) => {
        appStateListeners.push(handler);
        return {
          remove: () => {
            const index = appStateListeners.indexOf(handler);
            if (index >= 0) {
              appStateListeners.splice(index, 1);
            }
          },
        };
      }),
    },
  };
});

import {
  CRITICAL_RECOVERY_PROMPT_ROUTES,
  RECOVERY_PROMPT_ALLOWED_ROUTES,
} from '@/consts/recoveryPrompts';
import { useModal } from '@/hooks/useModal';
import useRecoveryPrompts from '@/hooks/useRecoveryPrompts';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

const showModal = jest.fn();
const getAllDocuments = jest.fn();
(usePassport as jest.Mock).mockReturnValue({ getAllDocuments });

const getAppState = () =>
  require('react-native').AppState as unknown as {
    currentState: string;
    addEventListener: jest.Mock;
  };

describe('useRecoveryPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigationStateListeners.length = 0;
    appStateListeners.length = 0;
    isNavigationReady = true;
    navigationRef.isReady.mockImplementation(() => isNavigationReady);
    navigationRef.getCurrentRoute.mockReturnValue({ name: 'Home' });
    (useModal as jest.Mock).mockReturnValue({ showModal, visible: false });
    getAllDocuments.mockResolvedValue({ doc1: {} as any });
    const AppState = getAppState();
    AppState.currentState = 'active';
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
    navigationRef.isReady.mockImplementation(() => isNavigationReady);
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });

    isNavigationReady = true;
    navigationStateListeners.forEach((listener) => listener());

    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it.each([...CRITICAL_RECOVERY_PROMPT_ROUTES])(
    'does not show modal when route %s is disallowed',
    async (routeName) => {
      navigationRef.getCurrentRoute.mockReturnValue({ name: routeName });
      act(() => {
        useSettingStore.setState({ loginCount: 1 });
      });
      const { unmount } = renderHook(() => useRecoveryPrompts());
      await waitFor(() => {
        expect(showModal).not.toHaveBeenCalled();
      });
      unmount();
    },
  );

  it('respects custom allow list overrides', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() =>
      useRecoveryPrompts({ allowedRoutes: ['Settings'], disallowedRoutes: [] }),
    );
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });

    showModal.mockClear();
    navigationRef.getCurrentRoute.mockReturnValue({ name: 'Settings' });

    renderHook(() =>
      useRecoveryPrompts({
        allowedRoutes: RECOVERY_PROMPT_ALLOWED_ROUTES,
        disallowedRoutes: [],
      }),
    );

    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('prompts when returning from background on eligible route', async () => {
    const AppState = getAppState();
    AppState.currentState = 'background';
    act(() => {
      useSettingStore.setState({ loginCount: 1 });
    });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).not.toHaveBeenCalled();

    appStateListeners.forEach((listener) => listener('active'));

    await waitFor(() => {
      expect(showModal).toHaveBeenCalled();
    });
  });

  it('does not show modal when login count is 4', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 4 });
    });
    renderHook(() => useRecoveryPrompts());
    await waitFor(() => {
      expect(showModal).not.toHaveBeenCalled();
    });
  });

  it('shows modal on eighth login', async () => {
    act(() => {
      useSettingStore.setState({ loginCount: 8 });
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

  it('shows modal for other valid login counts', async () => {
    for (const count of [2, 3, 13, 18]) {
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
