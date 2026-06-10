// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import MockReact from 'react';
import { Text as MockText, View as MockView } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import type { LoadErrorInfo } from '@selfxyz/rn-sdk';

import { WebViewErrorOverlay } from '@/screens/dev/WebViewHostOverlays';

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  __esModule: true,
  Title: ({ children }: { children: React.ReactNode }) =>
    MockReact.createElement(MockText, null, children),
  BodyText: ({ children }: { children: React.ReactNode }) =>
    MockReact.createElement(MockText, null, children),
  YStack: ({ children }: { children: React.ReactNode }) =>
    MockReact.createElement(MockView, null, children),
  PrimaryButton: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress: () => void;
  }) => MockReact.createElement(MockText, { onPress }, children),
}));

const info = (overrides: Partial<LoadErrorInfo>): LoadErrorInfo => ({
  kind: 'load_error',
  canRetry: true,
  onRetry: jest.fn(),
  ...overrides,
});

describe('WebViewErrorOverlay', () => {
  it('shows the terminal "Update required" copy with no retry for a non-recoverable mismatch', () => {
    const { queryByText } = render(
      <WebViewErrorOverlay
        info={info({ kind: 'version_mismatch', canRetry: false })}
      />,
    );

    expect(queryByText('Update required')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
  });

  it('shows recoverable copy with retry for a recoverable version mismatch', () => {
    const onRetry = jest.fn();
    const { queryByText, getByText } = render(
      <WebViewErrorOverlay
        info={info({ kind: 'version_mismatch', canRetry: true, onRetry })}
      />,
    );

    expect(queryByText('Update required')).toBeNull();
    expect(queryByText('Something went wrong')).toBeTruthy();

    fireEvent.press(getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows recoverable copy with retry for a generic load error', () => {
    const { queryByText } = render(
      <WebViewErrorOverlay
        info={info({ kind: 'load_error', canRetry: true })}
      />,
    );

    expect(queryByText('Something went wrong')).toBeTruthy();
    expect(queryByText('Try again')).toBeTruthy();
  });
});
