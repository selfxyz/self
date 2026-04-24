// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import DevSettingsScreen from '@/screens/dev/DevSettingsScreen';

const mockDevTogglesSection = jest.fn(() => <div>DevToggles</div>);

jest.mock('@/utils/devUtils', () => ({
  IS_DEV_MODE: false,
}));

jest.mock('react-native', () => ({
  __esModule: true,
  Alert: {
    alert: jest.fn(),
  },
  ScrollView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Platform: { OS: 'ios', select: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('tamagui', () => ({
  YStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(selector => {
    const state = {
      enableRecoveryCircuitTestFlow: false,
      setEnableRecoveryCircuitTestFlow: jest.fn(),
      loggingSeverity: 'info',
      setLoggingSeverity: jest.fn(),
      useStrongBox: false,
      setUseStrongBox: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  loadDocumentCatalogDirectlyFromKeychain: jest.fn(),
  saveDocumentCatalogDirectlyToKeychain: jest.fn(),
}));

jest.mock('@/screens/dev/hooks/useDangerZoneActions', () => ({
  useDangerZoneActions: jest.fn(() => ({
    handleClearSecretsPress: jest.fn(),
    handleClearDocumentCatalogPress: jest.fn(),
    handleClearPointEventsPress: jest.fn(),
    handleResetBackupStatePress: jest.fn(),
    handleClearBackupEventsPress: jest.fn(),
    handleClearPendingVerificationsPress: jest.fn(),
  })),
}));

jest.mock('@/screens/dev/hooks/useNotificationHandlers', () => ({
  useNotificationHandlers: jest.fn(() => ({
    hasNotificationPermission: false,
    subscribedTopics: [],
    handleTopicToggle: jest.fn(),
  })),
}));

jest.mock('@/screens/dev/sections', () => ({
  DangerZoneSection: () => <div>DangerZone</div>,
  DebugShortcutsSection: () => <div>DebugShortcuts</div>,
  DevTogglesSection: (props: any) => mockDevTogglesSection(props),
  PushNotificationsSection: () => <div>PushNotifications</div>,
}));

jest.mock('@/screens/dev/components/ParameterSection', () => ({
  ParameterSection: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/screens/dev/components/LogLevelSelector', () => ({
  LogLevelSelector: () => <div>LogLevelSelector</div>,
}));

jest.mock('@/screens/dev/components/ErrorInjectionSelector', () => ({
  ErrorInjectionSelector: () => <div>ErrorInjectionSelector</div>,
}));

jest.mock('@/components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/assets/icons/bug_icon.svg', () => 'BugIcon');

describe('DevSettingsScreen in non-dev mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render DevTogglesSection', () => {
    render(<DevSettingsScreen />);

    expect(mockDevTogglesSection).not.toHaveBeenCalled();
  });
});
