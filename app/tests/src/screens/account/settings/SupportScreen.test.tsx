// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import { useSupportUuid } from '@/hooks/useSupportUuid';
import SupportScreen from '@/screens/account/settings/SupportScreen';

jest.mock('react-native', () => {
  const MockView = ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  );
  const MockSwitch = ({ value, testID, ...props }: any) => (
    <mock-switch {...props} value={String(value)} testID={testID} />
  );
  return {
    __esModule: true,
    Alert: { alert: jest.fn() },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Switch: MockSwitch,
    View: MockView,
  };
});

jest.mock('tamagui', () => {
  const passthrough = (name: string) => {
    const Component = ({ children, ...props }: any) => (
      <mock-view {...props} testID={props.testID ?? name}>
        {children}
      </mock-view>
    );
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    Button: passthrough('Button'),
    ScrollView: passthrough('ScrollView'),
    YStack: passthrough('YStack'),
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  BodyText: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  blue600: '#00f',
  slate100: '#eee',
  slate200: '#ddd',
  slate500: '#555',
  white: '#fff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  dinot: 'dinot',
}));

jest.mock('@/hooks/useOpenSupportForm', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

jest.mock('@/hooks/useSupportUuid', () => ({
  useSupportUuid: jest.fn(),
}));

const mockUseSupportUuid = useSupportUuid as jest.Mock;

const baseHookValue = {
  supportUuid: null,
  copy: jest.fn(),
  regenerate: jest.fn(),
  setEnabled: jest.fn(),
  isReady: true,
};

describe('SupportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the renamed "Support ID" copy and off-state guidance when disabled', () => {
    mockUseSupportUuid.mockReturnValue({ ...baseHookValue, isEnabled: false });

    const { toJSON } = render(<SupportScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Share support ID');
    expect(tree).toContain('Only turn it on if a Self support agent asks');
    // The UUID panel and copy/regenerate buttons should be hidden when off.
    expect(tree).not.toContain('Copy support ID');
    // No lingering legacy wording.
    expect(tree.toLowerCase()).not.toContain('diagnostic');
  });

  it('shows the support ID value and actions when enabled', () => {
    mockUseSupportUuid.mockReturnValue({
      ...baseHookValue,
      isEnabled: true,
      supportUuid: '11111111-1111-1111-1111-111111111111',
    });

    const { toJSON } = render(<SupportScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Share support ID');
    expect(tree).toContain('Copy support ID');
    expect(tree).toContain('11111111-1111-1111-1111-111111111111');
    expect(tree.toLowerCase()).not.toContain('diagnostic');
  });
});
