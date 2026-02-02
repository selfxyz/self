// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';

import * as haptics from '@/integrations/haptics';
import KYCVerifiedScreen from '@/screens/kyc/KYCVerifiedScreen';

// Note: While jest.setup.js provides comprehensive React Native mocking,
// react-test-renderer requires component-based mocks (functions) rather than
// string-based mocks for proper rendering. This minimal mock provides the
// specific components needed for this test without using requireActual to
// avoid memory issues (see .cursor/rules/test-memory-optimization.mdc).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'ios', select: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock Tamagui components
jest.mock('tamagui', () => ({
  __esModule: true,
  YStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000000',
  white: '#FFFFFF',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  AbstractButton: ({ children, onPress, testID, ...props }: any) => (
    <button
      onClick={onPress}
      type="button"
      data-testid={testID || 'generate-proof-button'}
      {...props}
    >
      {children}
    </button>
  ),
  Title: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID || 'title'} style={style} {...props}>
      {children}
    </div>
  ),
  Description: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID || 'description'} style={style} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
}));

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('KYCVerifiedScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);
  });

  it('should render the screen without errors', () => {
    const { root } = render(<KYCVerifiedScreen />);
    expect(root).toBeTruthy();
  });

  it('should display the correct title', () => {
    const { root } = render(<KYCVerifiedScreen />);
    // Title is the first div child
    const titleElement = root.findAll(
      node =>
        node.type === 'div' &&
        node.props.children === 'Your ID has been verified',
    )[0];
    expect(titleElement).toBeTruthy();
  });

  it('should display the correct description text', () => {
    const { root } = render(<KYCVerifiedScreen />);
    // Description is a div with the description text
    const descriptionElement = root.findAll(
      node =>
        node.type === 'div' &&
        node.props.children ===
          'Next Self will generate a zk proof specifically for this device that you can use to proof your identity.',
    )[0];
    expect(descriptionElement).toBeTruthy();
  });

  it('should have a "Generate proof" button that is visible', () => {
    const { root } = render(<KYCVerifiedScreen />);
    const buttons = root.findAllByType('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0].props.children).toBe('Generate proof');
  });

  it('should trigger haptic feedback when "Generate proof" is pressed', () => {
    const { root } = render(<KYCVerifiedScreen />);
    const button = root.findAllByType('button')[0];

    fireEvent.press(button);

    expect(haptics.buttonTap).toHaveBeenCalledTimes(1);
  });

  it('should navigate to ProvingScreenRouter when "Generate proof" is pressed', () => {
    const { root } = render(<KYCVerifiedScreen />);
    const button = root.findAllByType('button')[0];

    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith('ProvingScreenRouter');
  });

  it('should have navigation available', () => {
    render(<KYCVerifiedScreen />);
    expect(mockUseNavigation).toHaveBeenCalled();
  });
});
