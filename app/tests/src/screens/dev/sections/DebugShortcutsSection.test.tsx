// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DebugShortcutsSection } from '@/screens/dev/sections/DebugShortcutsSection';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-text': any;
      'mock-stack': any;
      'mock-button': any;
      'mock-icon': any;
    }
  }
}

jest.mock('tamagui', () => ({
  __esModule: true,
  Button: ({ children, onPress, ...props }: any) => (
    <mock-button onPress={onPress} {...props}>
      {children}
    </mock-button>
  ),
  Text: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  XStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  YStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
}));

jest.mock('@tamagui/lucide-icons', () => ({
  ChevronRight: (props: any) => <mock-icon {...props} />,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  slate200: '#ccc',
  slate500: '#555',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  dinot: 'dinot',
}));

jest.mock('@/assets/icons/bug_icon.svg', () => ({
  __esModule: true,
  default: (props: any) => <mock-icon {...props} />,
}));

jest.mock('@/screens/dev/components/ParameterSection', () => ({
  ParameterSection: ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  ),
}));

jest.mock('@/screens/dev/components/ScreenSelector', () => ({
  ScreenSelector: () => <mock-view />,
}));

jest.mock('@/utils/devUtils', () => ({
  __esModule: true,
  IS_DEV_MODE: true,
}));

function findButtonByLabel(buttons: any[], label: string) {
  return buttons.find(button => {
    const stack = button.props.children;
    const children = Array.isArray(stack?.props?.children)
      ? stack.props.children
      : [stack?.props?.children];
    return children.some(
      (child: any) => child?.props?.children === label,
    );
  });
}

describe('DebugShortcutsSection', () => {
  it('navigates to CountryPicker when the Register Circuit Test button is pressed', () => {
    const navigate = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <DebugShortcutsSection navigation={{ navigate } as any} />,
    );

    const buttons = UNSAFE_getAllByType('mock-button' as any);
    const registerCircuitButton = findButtonByLabel(
      buttons,
      'Register Circuit Test (scan)',
    );
    if (!registerCircuitButton) {
      throw new Error('register-circuit button not found');
    }

    fireEvent.press(registerCircuitButton);

    expect(navigate).toHaveBeenCalledWith('CountryPicker');
    expect(navigate).not.toHaveBeenCalledWith('AccountRecoveryChoice');
  });
});
