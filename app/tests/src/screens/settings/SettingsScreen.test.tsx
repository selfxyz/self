// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useNavigation } from '@react-navigation/native';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { usePassport } from '../../../../src/providers/passportDataProvider';
import SettingsScreen from '../../../../src/screens/settings/SettingsScreen';

jest.mock('../../../../src/providers/passportDataProvider');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('tamagui', () => ({
  Button: ({ children }: any) => <>{children}</>,
  ScrollView: ({ children }: any) => <>{children}</>,
  View: ({ children }: any) => <>{children}</>,
  XStack: ({ children }: any) => <>{children}</>,
  YStack: ({ children }: any) => <>{children}</>,
  styled: jest.fn(() => ({ children }: any) => <>{children}</>),
}));

jest.mock(
  '@tamagui/lucide-icons',
  () =>
    new Proxy(
      {},
      {
        get: () => () => null,
      },
    ),
);

jest.mock('../../../../src/images/icons/github.svg', () => 'Github');
jest.mock(
  '../../../../src/images/icons/settings_cloud_backup.svg',
  () => 'Cloud',
);
jest.mock('../../../../src/images/icons/settings_data.svg', () => 'Data');
jest.mock(
  '../../../../src/images/icons/settings_feedback.svg',
  () => 'Feedback',
);
jest.mock('../../../../src/images/icons/settings_lock.svg', () => 'Lock');
jest.mock('../../../../src/images/icons/share.svg', () => 'ShareIcon');
jest.mock('../../../../src/images/icons/star.svg', () => 'Star');
jest.mock('../../../../src/images/icons/telegram.svg', () => 'Telegram');
jest.mock('../../../../src/images/icons/webpage.svg', () => 'Web');

const mockReset = jest.fn();
const mockAddListener = jest.fn();

(useNavigation as jest.Mock).mockReturnValue({
  reset: mockReset,
  addListener: mockAddListener,
});

const mockGetAllDocuments = jest.fn();
(usePassport as jest.Mock).mockReturnValue({
  getAllDocuments: mockGetAllDocuments,
});

it('redirects to Launch when leaving settings with no documents', async () => {
  mockAddListener.mockImplementation((_evt, cb) => cb);
  mockGetAllDocuments.mockResolvedValue({});
  render(<SettingsScreen />);
  const handler = mockAddListener.mock.calls[0][1];
  await act(async () => {
    await handler();
  });
  await waitFor(() => {
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Launch' }],
    });
  });
});
