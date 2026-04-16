// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import UnregisteredIdCard from '@/components/homescreen/UnregisteredIdCard';

jest.mock('react-native', () => ({
  __esModule: true,
  Image: ({ ...props }: any) => <mock-image {...props} />,
  Platform: { OS: 'ios', select: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
}));

// Mock Tamagui components
jest.mock('tamagui', () => {
  const MockYStack = ({ children, onPress, ...props }: any) => (
    <div {...props} onClick={onPress}>
      {children}
    </div>
  );
  const MockXStack = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  const MockText = ({ children, ...props }: any) => (
    <span {...props}>{children}</span>
  );

  return {
    __esModule: true,
    Text: MockText,
    XStack: MockXStack,
    YStack: MockYStack,
  };
});

// Mock SVG
jest.mock('@/assets/images/self_logo_inactive.svg', () => 'SelfLogoInactive');
jest.mock('@/assets/images/wave_pattern_body.png', () => 'WavePatternBody');

// Mock hooks
jest.mock('@/hooks/useCardDimensions', () => ({
  useCardDimensions: jest.fn(() => ({
    cardWidth: 300,
    borderRadius: 10,
    scale: 1,
    headerHeight: 80,
    figmaPadding: 16,
    logoSize: 40,
    headerGap: 10,
    expandedAspectRatio: 1.5,
    fontSize: {
      header: 18,
      subtitle: 12,
      button: 16,
    },
  })),
}));

describe('UnregisteredIdCard', () => {
  const mockOnRegisterPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    expect(() => {
      render(<UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />);
    }).not.toThrow();
  });

  it('should display "UNREGISTERED ID" text', () => {
    const { root } = render(
      <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
    );

    const unregisteredText = root.findAll(
      node => node.type === 'span' && node.props.children === 'UNREGISTERED ID',
    );
    expect(unregisteredText.length).toBeGreaterThan(0);
  });

  it('should display "Complete Registration" button text', () => {
    const { root } = render(
      <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
    );

    const buttonText = root.findAll(
      node =>
        node.type === 'span' && node.props.children === 'Complete Registration',
    );
    expect(buttonText.length).toBeGreaterThan(0);
  });

  it('should call onRegisterPress when button is pressed', () => {
    const { root } = render(
      <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
    );

    // Find the clickable YStack (button container)
    const buttonContainers = root.findAll(
      node => node.type === 'div' && node.props.onClick,
    );

    // Find the button with "Complete Registration" text
    const registerButton = buttonContainers.find(container => {
      const textNodes = container.findAll(
        node =>
          node.type === 'span' &&
          node.props.children === 'Complete Registration',
      );
      return textNodes.length > 0;
    });

    expect(registerButton).toBeTruthy();

    // Simulate press by calling onClick directly
    registerButton!.props.onClick();

    expect(mockOnRegisterPress).toHaveBeenCalledTimes(1);
  });

  describe('Accessibility', () => {
    it('should have button accessibility role', () => {
      const { root } = render(
        <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
      );

      // Find the YStack with accessibilityRole="button"
      const buttonWithRole = root.findAll(
        node =>
          node.type === 'div' && node.props.accessibilityRole === 'button',
      );

      expect(buttonWithRole.length).toBeGreaterThan(0);
    });

    it('should have accessible label for screen readers', () => {
      const { root } = render(
        <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
      );

      // Find the YStack with accessibilityLabel
      const buttonWithLabel = root.findAll(
        node =>
          node.type === 'div' &&
          node.props.accessibilityLabel === 'Complete Registration',
      );

      expect(buttonWithLabel.length).toBeGreaterThan(0);
    });

    it('should have both accessibility role and label on the same element', () => {
      const { root } = render(
        <UnregisteredIdCard onRegisterPress={mockOnRegisterPress} />,
      );

      // Find the YStack with both properties
      const accessibleButton = root.findAll(
        node =>
          node.type === 'div' &&
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityLabel === 'Complete Registration',
      );

      expect(accessibleButton.length).toBe(1);
    });
  });
});
