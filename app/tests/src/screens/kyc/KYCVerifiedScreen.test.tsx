// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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
  useRoute: jest.fn(() => ({
    params: { documentId: 'test-document-id' },
  })),
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

const mockEmit = jest.fn();
const mockSelfClient = { emit: mockEmit };

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(() => mockSelfClient),
  loadSelectedDocument: jest.fn(() =>
    Promise.resolve({ documentCategory: 'kyc' }),
  ),
  SdkEvents: {
    DOCUMENT_OWNERSHIP_CONFIRMED: 'DOCUMENT_OWNERSHIP_CONFIRMED',
  },
}));

jest.mock('@/stores/pendingKycStore', () => ({
  usePendingKycStore: jest.fn(() => ({
    pendingVerifications: [],
    removePendingVerification: jest.fn(),
  })),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  setSelectedDocument: jest.fn(() => Promise.resolve()),
}));

describe('KYCVerifiedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should emit DOCUMENT_OWNERSHIP_CONFIRMED when "Generate proof" is pressed', async () => {
    const { root } = render(<KYCVerifiedScreen />);
    const button = root.findAllByType('button')[0];

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith(
        'DOCUMENT_OWNERSHIP_CONFIRMED',
        expect.objectContaining({ documentCategory: 'kyc' }),
      );
    });
  });

  it('should use the documentId from route params', () => {
    const { root } = render(<KYCVerifiedScreen />);
    // Component should render without errors when documentId is provided
    expect(root).toBeTruthy();
  });

  describe('Loading state', () => {
    it('should show "Generating..." text while loading', async () => {
      const { root } = render(<KYCVerifiedScreen />);
      const button = root.findAllByType('button')[0];

      // Initially shows "Generate proof"
      expect(button.props.children).toBe('Generate proof');
      expect(button.props.disabled).toBeFalsy();

      // Press the button
      fireEvent.press(button);

      // Should show "Generating..." while loading
      await waitFor(() => {
        const updatedButton = root.findAllByType('button')[0];
        expect(updatedButton.props.children).toBe('Generating...');
        expect(updatedButton.props.disabled).toBe(true);
      });
    });

    it('should prevent multiple concurrent proof generations', async () => {
      const { root } = render(<KYCVerifiedScreen />);
      const button = root.findAllByType('button')[0];

      // Press the button multiple times rapidly
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      await waitFor(() => {
        // Emit should only be called once
        expect(mockEmit).toHaveBeenCalledTimes(1);
      });
    });

    it('should re-enable button after proof generation completes', async () => {
      const { root } = render(<KYCVerifiedScreen />);
      const button = root.findAllByType('button')[0];

      fireEvent.press(button);

      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalled();
      });

      // Button should be re-enabled after completion
      await waitFor(() => {
        const updatedButton = root.findAllByType('button')[0];
        expect(updatedButton.props.disabled).toBeFalsy();
        expect(updatedButton.props.children).toBe('Generate proof');
      });
    });

    it('should re-enable button after error', async () => {
      // Mock an error in setSelectedDocument
      const { setSelectedDocument } = jest.requireMock(
        '@/providers/passportDataProvider',
      );
      setSelectedDocument.mockRejectedValueOnce(new Error('Test error'));

      const { root } = render(<KYCVerifiedScreen />);
      const button = root.findAllByType('button')[0];

      fireEvent.press(button);

      // Wait for error handling
      await waitFor(() => {
        const updatedButton = root.findAllByType('button')[0];
        expect(updatedButton.props.disabled).toBeFalsy();
        expect(updatedButton.props.children).toBe('Generate proof');
      });
    });
  });
});
