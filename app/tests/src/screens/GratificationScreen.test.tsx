// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation, useRoute } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';

import GratificationScreen from '@/screens/app/GratificationScreen';

jest.mock('react-native', () => {
  const MockView = ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  );
  const MockText = ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  );
  const mockDimensions = {
    get: jest.fn(() => ({ width: 320, height: 640 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  return {
    __esModule: true,
    Dimensions: mockDimensions,
    Pressable: ({ onPress, children }: any) => (
      <button onClick={onPress} type="button">
        {children}
      </button>
    ),
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Text: MockText,
    View: MockView,
  };
});

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock Tamagui components to avoid theme provider requirement
jest.mock('tamagui', () => {
  const View: any = 'View';
  const Text: any = 'Text';
  const createViewComponent = (displayName: string) => {
    const MockComponent = ({ children, ...props }: any) => (
      <View {...props} testID={displayName}>
        {children}
      </View>
    );
    MockComponent.displayName = displayName;
    return MockComponent;
  };

  const MockYStack = createViewComponent('YStack');
  const MockView = createViewComponent('View');

  const MockText = ({ children, ...props }: any) => (
    <Text {...props}>{children}</Text>
  );
  MockText.displayName = 'Text';

  return {
    __esModule: true,
    YStack: MockYStack,
    View: MockView,
    Text: MockText,
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: ({ onAnimationFinish }: any) => {
    // Simulate animation finishing immediately
    setTimeout(() => {
      onAnimationFinish?.();
    }, 0);
    return null;
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  PrimaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

jest.mock('@/assets/icons/arrow_left.svg', () => 'ArrowLeft');
jest.mock('@/assets/logos/self.svg', () => 'SelfLogo');

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

describe('GratificationScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as any);

    mockUseRoute.mockReturnValue({
      params: {},
    } as any);
  });

  it('should use default points value when not provided', async () => {
    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });
  });

  it('should use custom points value when provided', async () => {
    mockUseRoute.mockReturnValue({
      params: { points: 50 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('50')).toBeTruthy();
    });
  });

  it('should display referral points value (24) when passed', async () => {
    mockUseRoute.mockReturnValue({
      params: { points: 24 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('24')).toBeTruthy();
    });
  });
});
