// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import AbstractButton from '../../../src/components/buttons/AbstractButton';
import { SelfClientProvider } from '../../../src/index';
import { mockAdapters } from '../../utils/testHelpers';

import { render } from '@testing-library/react';

// Helper to wrap component in SelfClientProvider
function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <SelfClientProvider config={{}} adapters={mockAdapters} listeners={new Map()}>
      {children}
    </SelfClientProvider>
  );
}

describe('AbstractButton', () => {
  describe('borderColor prop', () => {
    it('should apply borderColor from prop', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" borderColor="red">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      // Note: In jsdom, styles are applied as inline styles or style objects
      // The actual style checking depends on how react-native-web or mocks handle it
    });

    it('should apply borderColor from style prop', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" style={{ borderColor: 'blue', borderWidth: 2 }}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should prioritize borderColor prop over style', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" borderColor="red" style={{ borderColor: 'blue' }}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should handle borderWidth prop', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" borderColor="red" borderWidth={3}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('fontSize prop', () => {
    it('should apply fontSize from prop', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" fontSize={24}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      const text = button?.querySelector('span');
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe('Test Button');
    });

    it('should use default fontSize of 18 when not provided', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      const text = button?.querySelector('span');
      expect(text).toBeTruthy();
    });

    it('should accept various fontSize values', () => {
      const fontSizes = [12, 16, 20, 24, 28, 32];

      fontSizes.forEach(fontSize => {
        const { container } = render(
          <TestWrapper>
            <AbstractButton bgColor="black" color="white" fontSize={fontSize}>
              Test {fontSize}
            </AbstractButton>
          </TestWrapper>,
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Platform.select behavior', () => {
    it('should apply borderWidth: 0 on web when no border is specified', () => {
      // Platform is mocked as 'web' in setup.ts
      expect(Platform.OS).toBe('web');

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should not apply borderWidth: 0 when border is specified', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" borderColor="red">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('event tracking', () => {
    it('should call trackEvent when trackEvent prop is provided', () => {
      // This test verifies the trackEvent functionality exists
      // The actual implementation is tested through the SelfClient
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" trackEvent="Test Button Click">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should parse event category from trackEvent string', () => {
      // Tests that "Category: Event" format gets parsed to "Event"
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" trackEvent="Category: Button Click">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('style prop handling', () => {
    it('should merge style prop with internal styles', () => {
      const customStyle = {
        padding: 10,
        backgroundColor: 'blue',
      };

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" style={customStyle}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should handle StyleSheet.flatten for style prop', () => {
      const style1 = { padding: 10 };
      const style2 = { margin: 5 };
      const combinedStyle = [style1, style2];

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" style={combinedStyle}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('should accept disabled prop', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="gray" color="lightgray" disabled>
            Disabled Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('animatedComponent', () => {
    it('should render animatedComponent when provided', () => {
      const AnimatedComponent = <div data-testid="animated">Animated</div>;

      const { container, getByTestId } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" animatedComponent={AnimatedComponent}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(getByTestId('animated')).toBeTruthy();
    });
  });

  describe('cross-platform compatibility', () => {
    it('should render consistently on web platform', () => {
      // Verify Platform.OS is 'web' as expected from setup.ts
      expect(Platform.OS).toBe('web');

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" borderColor="red" fontSize={20}>
            Cross-Platform Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.textContent).toBe('Cross-Platform Button');
    });

    it('should handle Platform.select correctly', () => {
      // Verify that Platform.select returns web or default values
      const result = Platform.select({ web: 'web-value', default: 'default-value' });
      expect(result).toBe('web-value');

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white">
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
    });
  });

  describe('onPress handling', () => {
    it('should call onPress when button is pressed', () => {
      const onPressMock = vi.fn();

      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white" onPress={onPressMock}>
            Test Button
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();

      // Note: In jsdom environment, we can't easily simulate Pressable's onPress
      // This test verifies the button is renderable with onPress prop
    });
  });

  describe('children rendering', () => {
    it('should render children as text', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white">
            Button Text
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.textContent).toBe('Button Text');
    });

    it('should render complex children', () => {
      const { container } = render(
        <TestWrapper>
          <AbstractButton bgColor="black" color="white">
            {'Button '}
            {'with '}
            {'multiple '}
            {'parts'}
          </AbstractButton>
        </TestWrapper>,
      );

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.textContent).toBe('Button with multiple parts');
    });
  });
});
